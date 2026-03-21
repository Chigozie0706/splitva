// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Splitva
 * @notice A smart contract for splitting bills using Mento stablecoins on Celo
 * @dev Optimized for low gas costs and simple UX. Designed for Farcaster miniapp on Celo.
 */
contract Splitva is ReentrancyGuard {
    // Structs
    struct ParticipantData {
        address wallet;
        uint256 share;
        string name;
    }

    struct Participant {
        address payable wallet;
        uint256 amountOwed;
        uint256 amountPaid;
        bool hasPaid;
        string name;
    }

    struct Bill {
        uint256 id;
        address payable organizer;
        string title;
        uint256 totalAmount;
        uint256 totalCollected;
        address stablecoin; // Mento stablecoin address (cUSD, cKES, cREAL, etc.)
        uint256 participantCount;
        bool isCompleted;
        bool isWithdrawn;
        uint256 createdAt;
    }

    // State variables
    uint256 private billCounter;
    mapping(uint256 => Bill) public bills;
    mapping(uint256 => mapping(address => Participant)) public billParticipants;
    mapping(uint256 => address[]) public billParticipantAddresses;
    mapping(address => uint256[]) public userBills;

    // Events
    event BillCreated(
        uint256 indexed billId,
        address indexed organizer,
        string title,
        uint256 totalAmount,
        address stablecoin,
        uint256 participantCount
    );

    event PaymentMade(
        uint256 indexed billId,
        address indexed payer,
        uint256 amount,
        uint256 totalCollected
    );

    event BillWithdrawn(
        uint256 indexed billId,
        address indexed organizer,
        uint256 amount
    );

    event BillCompleted(uint256 indexed billId);

    event ShareUpdated(
        uint256 indexed billId,
        address indexed participant,
        uint256 newAmount
    );

    // Modifiers
    modifier onlyOrganizer(uint256 _billId) {
        require(
            bills[_billId].organizer == msg.sender,
            "Only organizer can perform this action"
        );
        _;
    }

    modifier billExists(uint256 _billId) {
        require(_billId > 0 && _billId <= billCounter, "Bill does not exist");
        _;
    }

    modifier billNotCompleted(uint256 _billId) {
        require(!bills[_billId].isCompleted, "Bill is already completed");
        _;
    }

    /**
     * @notice Create a new bill with participants
     * @param _title Title of the bill (e.g., "Dinner at KFC")
     * @param _totalAmount Total amount to be split
     * @param _stablecoin Address of Mento stablecoin (cUSD, cKES, etc.)
     * @param _participants Array of participant data
     */
    function createBill(
        string memory _title,
        uint256 _totalAmount,
        address _stablecoin,
        ParticipantData[] memory _participants
    ) external returns (uint256) {
        require(_totalAmount > 0, "Total amount must be greater than 0");
        require(_participants.length > 0, "Must have at least one participant");
        require(_stablecoin != address(0), "Invalid stablecoin address");

        // Verify shares sum to total amount and validate participant data
        uint256 sharesSum = 0;
        for (uint256 i = 0; i < _participants.length; i++) {
            ParticipantData memory participant = _participants[i];

            require(participant.share > 0, "Share must be greater than 0");
            require(
                participant.wallet != address(0),
                "Invalid participant address"
            );
            require(bytes(participant.name).length > 0, "Name cannot be empty");
            sharesSum += participant.share;
        }
        require(sharesSum == _totalAmount, "Shares must sum to total amount");

        billCounter++;
        uint256 newBillId = billCounter;

        // Create bill
        bills[newBillId] = Bill({
            id: newBillId,
            organizer: payable(msg.sender),
            title: _title,
            totalAmount: _totalAmount,
            totalCollected: 0,
            stablecoin: _stablecoin,
            participantCount: _participants.length,
            isCompleted: false,
            isWithdrawn: false,
            createdAt: block.timestamp
        });

        // Add participants
        for (uint256 i = 0; i < _participants.length; i++) {
            ParticipantData memory participantData = _participants[i];

            billParticipants[newBillId][participantData.wallet] = Participant({
                wallet: payable(participantData.wallet),
                amountOwed: participantData.share,
                amountPaid: 0,
                hasPaid: false,
                name: participantData.name
            });

            billParticipantAddresses[newBillId].push(participantData.wallet);
            userBills[participantData.wallet].push(newBillId);
        }

        userBills[msg.sender].push(newBillId);

        emit BillCreated(
            newBillId,
            msg.sender,
            _title,
            _totalAmount,
            _stablecoin,
            _participants.length
        );

        return newBillId;
    }

    /**
     * @notice Pay your share of a bill
     * @param _billId The ID of the bill to pay
     * @param _amount The amount to pay. Can be partial — hasPaid only set to true when amountPaid >= amountOwed.
     */
    function payShare(
        uint256 _billId,
        uint256 _amount
    ) external billExists(_billId) billNotCompleted(_billId) nonReentrant {
        Bill storage bill = bills[_billId];
        Participant storage participant = billParticipants[_billId][msg.sender];

        require(
            participant.wallet != address(0),
            "Not a participant in this bill"
        );
        require(_amount > 0, "Amount must be greater than 0");

        // Transfer stablecoin from payer to contract
        IERC20 stablecoin = IERC20(bill.stablecoin);
        require(
            stablecoin.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );

        // Update participant payment status
        participant.amountPaid += _amount;

        if (participant.amountPaid >= participant.amountOwed) {
            participant.hasPaid = true;
        }

        // Update total collected
        bill.totalCollected += _amount;

        emit PaymentMade(_billId, msg.sender, _amount, bill.totalCollected);

        // Check if bill is fully paid
        if (bill.totalCollected >= bill.totalAmount) {
            _checkAndCompleteBill(_billId);
        }
    }

    /**
     * @notice Organizer withdraws collected funds
     * @param _billId The ID of the bill to withdraw from
     */
    function withdrawFunds(
        uint256 _billId
    ) external billExists(_billId) onlyOrganizer(_billId) nonReentrant {
        Bill storage bill = bills[_billId];
        require(bill.totalCollected > 0, "No funds to withdraw");
        require(!bill.isWithdrawn, "Funds already withdrawn");
        require(bill.isCompleted, "Bill must be completed before withdrawal");

        uint256 amountToWithdraw = bill.totalCollected;
        bill.isWithdrawn = true;

        // Transfer collected funds to organizer
        IERC20 stablecoin = IERC20(bill.stablecoin);
        require(
            stablecoin.transfer(bill.organizer, amountToWithdraw),
            "Transfer failed"
        );

        emit BillWithdrawn(_billId, bill.organizer, amountToWithdraw);
    }

    /**
     * @notice Update a participant's share (only organizer, before completion)
     * @param _billId The ID of the bill
     * @param _participant Address of the participant
     * @param _newAmount New amount the participant owes
     */
    function updateShare(
        uint256 _billId,
        address _participant,
        uint256 _newAmount
    )
        external
        billExists(_billId)
        onlyOrganizer(_billId)
        billNotCompleted(_billId)
    {
        Participant storage participant = billParticipants[_billId][
            _participant
        ];
        require(
            participant.wallet != address(0),
            "Not a participant in this bill"
        );
        require(!participant.hasPaid, "Cannot update share after payment");
        require(_newAmount > 0, "Amount must be greater than 0");

        // Update the participant's owed amount
        uint256 oldAmount = participant.amountOwed;
        participant.amountOwed = _newAmount;

        // Update total amount
        Bill storage bill = bills[_billId];
        bill.totalAmount = bill.totalAmount - oldAmount + _newAmount;

        emit ShareUpdated(_billId, _participant, _newAmount);
    }

    /**
     * @notice Internal function to check and mark bill as completed
     */
    function _checkAndCompleteBill(uint256 _billId) private {
        Bill storage bill = bills[_billId];

        // Check if all participants have paid their full share
        bool allPaid = true;
        address[] memory participants = billParticipantAddresses[_billId];

        for (uint256 i = 0; i < participants.length; i++) {
            if (!billParticipants[_billId][participants[i]].hasPaid) {
                allPaid = false;
                break;
            }
        }

        if (allPaid && bill.totalCollected >= bill.totalAmount) {
            bill.isCompleted = true;
            emit BillCompleted(_billId);
        }
    }

    // View Functions

    /**
     * @notice Get bill details
     */
    function getBill(
        uint256 _billId
    ) external view billExists(_billId) returns (Bill memory) {
        return bills[_billId];
    }

    /**
     * @notice Get participant details for a bill
     */
    function getParticipant(
        uint256 _billId,
        address _participant
    ) external view billExists(_billId) returns (Participant memory) {
        return billParticipants[_billId][_participant];
    }

    /**
     * @notice Get all participants for a bill
     */
    function getBillParticipants(
        uint256 _billId
    ) external view billExists(_billId) returns (address[] memory) {
        return billParticipantAddresses[_billId];
    }

    /**
     * @notice Get all bills for a user (as organizer or participant)
     */
    function getUserBills(
        address _user
    ) external view returns (uint256[] memory) {
        return userBills[_user];
    }

    /**
     * @notice Get payment status for all participants in a bill
     */
    function getBillStatus(
        uint256 _billId
    )
        external
        view
        billExists(_billId)
        returns (
            address[] memory participants,
            uint256[] memory amountsOwed,
            uint256[] memory amountsPaid,
            bool[] memory paymentStatus,
            string[] memory names
        )
    {
        address[] memory addrs = billParticipantAddresses[_billId];
        uint256 length = addrs.length;

        participants = new address[](length);
        amountsOwed = new uint256[](length);
        amountsPaid = new uint256[](length);
        paymentStatus = new bool[](length);
        names = new string[](length);

        for (uint256 i = 0; i < length; i++) {
            address participant = addrs[i];
            Participant memory p = billParticipants[_billId][participant];

            participants[i] = participant;
            amountsOwed[i] = p.amountOwed;
            amountsPaid[i] = p.amountPaid;
            paymentStatus[i] = p.hasPaid;
            names[i] = p.name;
        }

        return (participants, amountsOwed, amountsPaid, paymentStatus, names);
    }

    /**
     * @notice Get total number of bills created
     */
    function getTotalBills() external view returns (uint256) {
        return billCounter;
    }
}
