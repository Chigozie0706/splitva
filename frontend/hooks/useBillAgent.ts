"use client";
// hooks/useBillAgent.ts
// The agentic core — listens to voice confirmation and executes on-chain automatically

import { useCallback, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, Address } from "viem";
import contractABI from "@/contract/abi.json";

const CONTRACT_ADDRESS = "0x95c7208144D097fdD83f4cF78CF780FF5674D5F3" as Address;

// Supported stablecoins on Celo
const STABLECOIN_ADDRESSES: Record<string, Address> = {
  cUSDm: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b",
  cKES:  "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
  cREAL: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
  cEUR:  "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
};

export type AgentParticipant = {
  address: string;
  share: number;
  name?: string;
  resolvedFrom?: string;
};

export type AgentBillInput = {
  title: string;
  totalAmount: number;
  participants: AgentParticipant[];
  currency?: string;
};

export type AgentStatus =
  | "idle"
  | "preparing"
  | "awaiting_wallet"
  | "confirming"
  | "success"
  | "error";

export function useBillAgent() {
  const { address: userAddress } = useAccount();
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [agentMessage, setAgentMessage] = useState("");
  const [billId, setBillId] = useState<bigint | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Called automatically after user confirms voice bill
  const executeBillCreation = useCallback(
    async (bill: AgentBillInput) => {
      if (!userAddress) {
        setErrorMsg("Wallet not connected");
        setStatus("error");
        return;
      }

      try {
        setStatus("preparing");
        setAgentMessage("Preparing your bill for the blockchain...");

        const currency = bill.currency || "cUSDm";
        const stablecoinAddress = STABLECOIN_ADDRESSES[currency];

        if (!stablecoinAddress) {
          throw new Error(`Unsupported currency: ${currency}`);
        }

        // Convert dollar amounts → wei (18 decimals for Celo stablecoins)
        const totalAmountWei = parseUnits(bill.totalAmount.toFixed(6), 18);

        // Build participants array for the contract
        // Contract requires: wallet, share (wei), name
        const participants = bill.participants.map((p) => ({
          wallet: p.address as Address,
          share: parseUnits(p.share.toFixed(6), 18),
          // Use resolvedFrom (@username) as name if available, else shorten address
          name:
            p.name ||
            p.resolvedFrom ||
            (p.address.startsWith("0x")
              ? `${p.address.slice(0, 6)}...${p.address.slice(-4)}`
              : p.address),
        }));

        // Validate all addresses are real before submitting
        const pendingParticipant = participants.find(
          (p) => !p.wallet.startsWith("0x") || p.wallet === "0xPENDING"
        );
        if (pendingParticipant) {
          throw new Error(
            `Missing wallet address for ${pendingParticipant.name}. Please resolve all participants first.`
          );
        }

        setStatus("awaiting_wallet");
        setAgentMessage("Please confirm the transaction in your wallet...");

        // Execute createBill — agent calls this directly, no button needed
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: contractABI.abi,
          functionName: "createBill",
          args: [bill.title, totalAmountWei, stablecoinAddress, participants],
        });

        setTxHash(hash);
        setStatus("confirming");
        setAgentMessage("Transaction submitted! Waiting for confirmation on Celo...");

        return hash;
      } catch (err: any) {
        const msg =
          err?.shortMessage || err?.message || "Transaction failed";
        setErrorMsg(msg);
        setStatus("error");
        setAgentMessage(`Failed: ${msg}`);
        throw err;
      }
    },
    [userAddress, writeContractAsync]
  );

  // Reset agent state
  const reset = useCallback(() => {
    setStatus("idle");
    setAgentMessage("");
    setErrorMsg("");
    setBillId(null);
    setTxHash(undefined);
  }, []);

  return {
    executeBillCreation,
    status,
    agentMessage,
    txHash,
    billId,
    errorMsg,
    isSuccess,
    reset,
  };
}