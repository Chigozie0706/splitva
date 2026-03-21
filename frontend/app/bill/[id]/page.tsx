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
import { Loader2 } from "lucide-react";
import { VoiceSettleButton } from "@/components/VoiceSettleButton";

const CONTRACT_ADDRESS =
  "0x95c7208144D097fdD83f4cF78CF780FF5674D5F3" as `0x${string}`;

// FIX: all lowercase so stablecoin.toLowerCase() always matches
const STABLECOIN: Record<string, Bill["currency"]> = {
  "0xde9e4c3ce781b4ba68120d6261cbad65ce0ab00b": "cUSDm",
  "0x456a3d042c0dbd3db53d5489e98dfb038553b0d0": "cKES",
  "0xe8537a3d056da446677b9e9d6c5db704eaab4787": "cREAL",
  "0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73": "cEUR",
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const billId = BigInt((params.id as string) ?? "0");

  const { data: rawBill, refetch: refetchBill } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI.abi,
    functionName: "getBill",
    args: [billId],
    query: { enabled: mounted && billId > BigInt(0) },
  });
  const { data: rawStatus, refetch: refetchStatus } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI.abi,
    functionName: "getBillStatus",
    args: [billId],
    query: { enabled: mounted && billId > BigInt(0) },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isSuccess) {
      refetchBill();
      refetchStatus();
      setStep("idle");
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isSuccess && step === "approving") {
      if (!rawStatus) return;
      const [addrs, amountsOwed, amountsPaid] =
        rawStatus as unknown as ContractBillStatus;
      const idx = addrs.findIndex(
        (a) => a.toLowerCase() === address?.toLowerCase(),
      );
      if (idx === -1) return;
      const remaining = fromWei(amountsOwed[idx]) - fromWei(amountsPaid[idx]);
      if (remaining <= 0) return;
      setStep("paying");
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI.abi,
        functionName: "payShare",
        args: [billId, parseUnits(remaining.toFixed(18), 18)],
      });
    }
  }, [isSuccess, step]);

  if (!mounted || !rawBill || !rawStatus) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "#0e0e12",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <Loader2
          size={32}
          color="#f59e0b"
          style={{ animation: "spin 1s linear infinite" }}
        />
        <p
          style={{
            color: "#8b8a96",
            fontSize: "13px",
            fontFamily: "var(--font-syne), sans-serif",
          }}
        >
          Loading bill...
        </p>
      </div>
    );
  }

  const billData = rawBill as unknown as ContractBill;
  const [addrs, amountsOwed, amountsPaid, , names] =
    rawStatus as unknown as ContractBillStatus;

  const participants = addrs.map((addr, i) => {
    const share = fromWei(amountsOwed[i]);
    const paid = fromWei(amountsPaid[i]);
    return {
      id: addr,
      name: names[i] || `${addr.slice(0, 6)}...`,
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
    currency: STABLECOIN[billData.stablecoin.toLowerCase()] ?? "cUSDm",
    organizerId: billData.organizer,
    organizerName: `${billData.organizer.slice(0, 6)}...`,
    participants,
    status: billData.isCompleted ? "completed" : "active",
    createdAt: new Date(Number(billData.createdAt) * 1000),
  };

  const handlePayShare = (_billId: string, participantId: string) => {
    setError("");
    const p = participants.find((p) => p.id === participantId);
    if (!p) return;
    const remaining = p.share - p.amountPaid;
    if (remaining <= 0) return;
    setStep("approving");
    writeContract({
      address: billData.stablecoin,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESS, parseUnits(remaining.toFixed(18), 18)],
    });
  };

  const handleWithdraw = (billId: string) => {
    setError("");
    setStep("withdrawing");
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: contractABI.abi,
      functionName: "withdrawFunds",
      args: [BigInt(billId)],
    });
  };

  const isProcessing = isPending || isConfirming;
  const stepLabel: Record<string, string> = {
    approving: "Approving tokens…",
    paying: "Sending payment…",
    withdrawing: "Withdrawing funds…",
  };

  return (
    <>
      {isProcessing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#16161d",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "20px",
              padding: "32px 24px",
              maxWidth: "300px",
              width: "100%",
              textAlign: "center",
            }}
          >
            <Loader2
              size={40}
              color="#f59e0b"
              style={{
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#f0eee8",
                marginBottom: "6px",
                fontFamily: "var(--font-syne), sans-serif",
              }}
            >
              {stepLabel[step]}
            </div>
            <div style={{ fontSize: "12px", color: "#8b8a96" }}>
              {isPending
                ? "Confirm in your wallet"
                : "Waiting for confirmation…"}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            position: "fixed",
            top: "16px",
            left: "16px",
            right: "16px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px",
            padding: "12px 14px",
            zIndex: 50,
          }}
        >
          <p style={{ color: "#ef4444", fontSize: "13px", margin: 0 }}>
            {error}
          </p>
          <button
            onClick={() => setError("")}
            style={{
              color: "#ef4444",
              fontSize: "11px",
              background: "none",
              border: "none",
              cursor: "pointer",
              marginTop: "4px",
              padding: 0,
            }}
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

      {/* Voice settle — only show if current user is a participant who hasn't paid */}
      {(() => {
        const myParticipant = participants.find(
          (p) => p.id.toLowerCase() === address?.toLowerCase(),
        );
        const remaining = myParticipant
          ? myParticipant.share - myParticipant.amountPaid
          : 0;
        if (!myParticipant || remaining <= 0 || bill.status === "completed")
          return null;
        return (
          <VoiceSettleButton
            billId={billId}
            amountOwed={remaining}
            stablecoinAddress={billData.stablecoin}
            currency={bill.currency}
            onSuccess={() => {
              refetchBill();
              refetchStatus();
            }}
          />
        );
      })()}
    </>
  );
}
