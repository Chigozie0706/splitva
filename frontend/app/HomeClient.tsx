"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useReadContract } from "wagmi";
import { useRouter } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";
import { HomeScreen } from "@/components/home-screen";
import type { Bill } from "@/components/homepage";
import contractABI from "../contract/abi.json";

const CONTRACT_ADDRESS =
  "0x9C00E479dBD8d0dFf5b87Fc097D6039aBB661217" as `0x${string}`;

const STABLECOIN: Record<string, Bill["currency"]> = {
  "0x765DE816845861e75A25fCA122bb6898B8B1282a": "cUSDm", // Mento Dollar (was cUSD)
  "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0": "cKES", // Mento Kenyan Shilling ✓
  "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787": "cREAL", // Mento Brazilian Real (NOT cREAL)
  "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73": "cEUR", // Mento Euro ✓
};

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

// Hook to load a single bill by ID
function useBill(billId: bigint | undefined): Bill | null {
  const enabled = !!billId && billId > BigInt(0);

  const { data: rawBill } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI.abi,
    functionName: "getBill",
    args: billId ? [billId] : undefined,
    query: { enabled },
  });

  const { data: rawStatus } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI.abi,
    functionName: "getBillStatus",
    args: billId ? [billId] : undefined,
    query: { enabled },
  });

  if (!rawBill || !rawStatus) return null;

  const billData = rawBill as unknown as ContractBill;
  const statusData = rawStatus as unknown as ContractBillStatus;
  const [addrs, amountsOwed, amountsPaid, , names] = statusData;

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

  return {
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
}

function BillLoader({
  billId,
  onBill,
}: {
  billId: bigint;
  onBill: (b: Bill | null, id: string) => void;
}) {
  const bill = useBill(billId);
  const billStr = JSON.stringify(bill); // stable comparison

  useEffect(() => {
    onBill(bill, billId.toString());
  }, [billStr, billId.toString()]); // only re-run when bill data actually changes

  return null;
}

export default function HomeClient() {
  const router = useRouter();
  const { address, isConnected } = useConnection();
  const [mounted, setMounted] = useState(false);
  const [billMap, setBillMap] = useState<Record<string, Bill>>({});

  useEffect(() => {
    setMounted(true);
    sdk.actions.ready();
  }, []);

  const { data: rawBillIds, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI.abi,
    functionName: "getUserBills",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const billIds = (rawBillIds as unknown as bigint[] | undefined) ?? [];
  const uniqueIds = Array.from(
    new Map(billIds.map((id) => [id.toString(), id])).values(),
  ).slice(-20);
  const visibleIds = uniqueIds.slice(-20);

  const handleBill = useCallback((bill: Bill | null, id: string) => {
    if (!bill) return;
    setBillMap((prev) => {
      // Only update if bill data actually changed
      if (prev[id] && JSON.stringify(prev[id]) === JSON.stringify(bill))
        return prev;
      return { ...prev, [id]: bill };
    });
  }, []);

  const bills = visibleIds
    .map((id) => billMap[id.toString()])
    .filter((b): b is Bill => !!b)
    .reverse(); // most recent first

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3" />
          <p className="text-sm opacity-80">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your bills...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Render invisible loaders for each bill ID — hooks must be at component level */}
      {visibleIds.map((id) => (
        <BillLoader key={id.toString()} billId={id} onBill={handleBill} />
      ))}

      <HomeScreen
        bills={bills}
        onCreateBill={() => router.push("/create_bill")}
        onSelectBill={(billId) => router.push(`/bill/${billId}`)}
      />
    </>
  );
}
