"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "viem";
import { BillDetails } from "@/components/bill-details";
import type { Bill } from "@/components/homepage";
import contractABI from "../../../contract/abi.json";

const SPLITPAY_ADDRESS =
  "0xE47aa208f9B59b5857E6c54a5198a9a40F4c90C7" as `0x${string}`;

const STABLECOIN: Record<string, Bill["currency"]> = {
  "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b": "cUSDm",
  "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0": "cKES",
  "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787": "cREAL",
};

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const fromWei = (raw: bigint) => Number(raw) / 1e18;

type ContractBill = {
  id: bigint;
  organizer: `0x${string}`;
  title: string;
  totalAmount: bigint;
  totalCollected: bigint;
  stablecoin: `0x${string}`;
  participantCount: bigint;
  isCompleted: boolean;
  isWithdrawn: boolean;
  createdAt: bigint;
};

type ContractBillStatus = [
  participants: readonly `0x${string}`[],
  amountsOwed: readonly bigint[],
  amountsPaid: readonly bigint[],
  paymentStatus: readonly boolean[],
  names: readonly string[],
  phoneNumbers: readonly string[],
];

export default function BillPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<
    "idle" | "approving" | "paying" | "withdrawing"
  >("idle");
  const [error, setError] = useState("");

  // ── ALL hooks must be before any early return ──────────────────

  useEffect(() => {
    setMounted(true);
  }, []);

  const billId = BigInt((params.id as string) ?? "0");

  const { data: rawBill, refetch: refetchBill } = useReadContract({
    address: SPLITPAY_ADDRESS,
    abi: contractABI.abi,
    functionName: "getBill",
    args: [billId],
    query: { enabled: mounted && billId > BigInt(0) },
  });

  const { data: rawStatus, refetch: refetchStatus } = useReadContract({
    address: SPLITPAY_ADDRESS,
    abi: contractABI.abi,
    functionName: "getBillStatus",
    args: [billId],
    query: { enabled: mounted && billId > BigInt(0) },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Refetch after any successful tx
  useEffect(() => {
    if (isSuccess) {
      refetchBill();
      refetchStatus();
      setStep("idle");
    }
  }, [isSuccess]);

  // After approve succeeds, call payShare
  useEffect(() => {
    if (isSuccess && step === "approving") {
      const myParticipant = rawStatus
        ? (() => {
            const statusData = rawStatus as unknown as ContractBillStatus;
            const [addrs, amountsOwed, amountsPaid] = statusData;
            const idx = addrs.findIndex(
              (a) => a.toLowerCase() === address?.toLowerCase(),
            );
            if (idx === -1) return null;
            return {
              share: fromWei(amountsOwed[idx]),
              amountPaid: fromWei(amountsPaid[idx]),
            };
          })()
        : null;

      if (!myParticipant) return;
      const remaining = myParticipant.share - myParticipant.amountPaid;
      if (remaining <= 0) return;

      const amountWei = parseUnits(remaining.toFixed(18), 18);
      setStep("paying");
      writeContract({
        address: SPLITPAY_ADDRESS,
        abi: contractABI.abi,
        functionName: "payShare",
        args: [billId, amountWei],
      });
    }
  }, [isSuccess, step]);

  // ── Early returns AFTER all hooks ─────────────────────────────
  if (!mounted || !rawBill || !rawStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading bill...</p>
        </div>
      </div>
    );
  }

  // ── Build Bill object ──────────────────────────────────────────
  const billData = rawBill as unknown as ContractBill;
  const statusData = rawStatus as unknown as ContractBillStatus;
  const [addrs, amountsOwed, amountsPaid, , names, phoneNumbers] = statusData;

  const participants = addrs.map((addr, i) => {
    const share = fromWei(amountsOwed[i]);
    const paid = fromWei(amountsPaid[i]);
    return {
      id: addr,
      name: names[i] || addr.slice(0, 6) + "...",
      phoneNumber: phoneNumbers[i],
      share,
      amountPaid: paid,
      status:
        paid === 0
          ? ("pending" as const)
          : paid >= share
          ? ("paid" as const)
          : ("underpaid" as const),
    };
  });

  const bill: Bill = {
    id: billData.id.toString(),
    title: billData.title,
    totalAmount: fromWei(billData.totalAmount),
    currency: STABLECOIN[billData.stablecoin] ?? "cUSD",
    organizerId: billData.organizer,
    organizerName: billData.organizer.slice(0, 6) + "...",
    participants,
    status: billData.isCompleted ? "completed" : "active",
    createdAt: new Date(Number(billData.createdAt) * 1000),
  };

  // ── Handlers ───────────────────────────────────────────────────
  const handlePayShare = (billId: string, participantId: string) => {
    setError("");
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;

    const remaining = participant.share - participant.amountPaid;
    if (remaining <= 0) return;

    const amountWei = parseUnits(remaining.toFixed(18), 18);
    setStep("approving");
    writeContract({
      address: billData.stablecoin,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [SPLITPAY_ADDRESS, amountWei],
    });
  };

  const handleWithdraw = (billId: string) => {
    setError("");
    setStep("withdrawing");
    writeContract({
      address: SPLITPAY_ADDRESS,
      abi: contractABI.abi,
      functionName: "withdrawFunds",
      args: [BigInt(billId)],
    });
  };

  const isProcessing = isPending || isConfirming;

  return (
    <>
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold mb-1">
              {step === "approving" && "Approving tokens..."}
              {step === "paying" && "Sending payment..."}
              {step === "withdrawing" && "Withdrawing funds..."}
            </p>
            <p className="text-gray-500 text-sm">
              {isPending
                ? "Confirm in your wallet"
                : "Waiting for confirmation..."}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-xl p-4 z-50">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={() => setError("")}
            className="text-red-500 text-xs mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <BillDetails
        bill={bill}
        onBack={() => router.push("/")}
        onPayShare={handlePayShare}
        onWithdraw={handleWithdraw}
      />
    </>
  );
}
