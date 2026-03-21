"use client";
// hooks/usePayShare.ts
// Agent executes payShare on-chain — handles ERC20 approve + payShare in sequence

import { useCallback, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, Address } from "viem";
import contractABI from "@/contract/abi.json";

const CONTRACT_ADDRESS = "0x95c7208144D097fdD83f4cF78CF780FF5674D5F3" as Address;

// Minimal ERC20 ABI for approve
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export type PayStatus =
  | "idle"
  | "approving"
  | "awaiting_approval_wallet"
  | "paying"
  | "awaiting_pay_wallet"
  | "confirming"
  | "success"
  | "error";

export function usePayShare() {
  const [status, setStatus] = useState<PayStatus>("idle");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Agent executes payment: approve ERC20 → payShare
  // billId: on-chain bill ID
  // amount: dollar amount (e.g. 30.00)
  // stablecoinAddress: e.g. cUSDm address
  const executePayment = useCallback(
    async (
      billId: bigint,
      amount: number,
      stablecoinAddress: Address
    ) => {
      try {
        const amountWei = parseUnits(amount.toFixed(6), 18);

        // Step 1: Approve the SplitPay contract to spend tokens
        setStatus("awaiting_approval_wallet");
        setMessage("Step 1/2: Approve token spend in your wallet...");

        const approveHash = await writeContractAsync({
          address: stablecoinAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESS, amountWei],
        });

        setStatus("approving");
        setMessage("Approval confirmed. Submitting payment...");

        // Step 2: Call payShare on the contract
        setStatus("awaiting_pay_wallet");
        setMessage("Step 2/2: Confirm payment in your wallet...");

        const payHash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: contractABI.abi,
          functionName: "payShare",
          args: [billId, amountWei],
        });

        setTxHash(payHash);
        setStatus("confirming");
        setMessage("Payment submitted! Confirming on Celo...");

        return payHash;
      } catch (err: any) {
        const msg = err?.shortMessage || err?.message || "Payment failed";
        setErrorMsg(msg);
        setStatus("error");
        setMessage(`Payment failed: ${msg}`);
        throw err;
      }
    },
    [writeContractAsync]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setMessage("");
    setErrorMsg("");
    setTxHash(undefined);
  }, []);

  return {
    executePayment,
    status,
    message,
    txHash,
    errorMsg,
    isSuccess,
    reset,
  };
}