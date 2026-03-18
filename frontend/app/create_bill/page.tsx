"use client";

import { useState } from "react";
import { Bill } from "@/components/homepage";
import { CreateBill } from "@/components/create-bill";
import { VoiceSplitAgent } from "@/components/VoiceSplitAgent";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

interface ParsedBill {
  title: string;
  totalAmountDisplay: string;
  totalAmount: number;
  participants: {
    address: string;
    shareDisplay: string;
    share: number;
    resolvedFrom?: string;
  }[];
  confirmation: string;
}

export default function CreateEvent() {
  const router = useRouter();
  const { address: userAddress } = useAccount();
  const [formKey, setFormKey] = useState(0);
  const [voiceDefaults, setVoiceDefaults] = useState<ParsedBill | null>(null);

  function handleBack(): void {
    router.push("/");
  }

  function handleCreateBill(_bill: Omit<Bill, "id" | "createdAt">): void {
    router.push("/");
  }

  // PRIMARY: agent created bill on-chain — redirect home after short delay
  function handleBillCreated(_bill: ParsedBill, txHash: string) {
    console.log("Bill created on-chain, tx:", txHash);
    setTimeout(() => router.push("/"), 2000);
  }

  // FALLBACK: user wants to review before submitting — fills the form below
  function handleBillParsed(parsed: ParsedBill) {
    setVoiceDefaults(parsed);
    setFormKey((k) => k + 1);
  }

  const defaultParticipants = voiceDefaults?.participants.map((p, i) => {
    let name = "";
    if (p.address === userAddress) {
      name = "You";
    } else if (p.resolvedFrom) {
      name = p.resolvedFrom;
    } else if (p.address !== "0xPENDING" && p.address.startsWith("0x")) {
      name = `${p.address.slice(0, 6)}...${p.address.slice(-4)}`;
    }
    return {
      id: `voice-${formKey}-${i}`,
      name,
      phoneNumber: "",
      wallet: p.address === "0xPENDING" ? "" : p.address,
      share: p.share,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      <VoiceSplitAgent
        onBillCreated={handleBillCreated}
        onBillParsed={handleBillParsed}
      />
      <CreateBill
        key={formKey}
        onBack={handleBack}
        onCreate={handleCreateBill}
        defaultTitle={voiceDefaults?.title}
        defaultAmount={voiceDefaults?.totalAmount?.toString()}
        defaultParticipants={defaultParticipants}
      />
    </div>
  );
}
