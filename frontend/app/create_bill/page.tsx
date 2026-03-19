"use client";

import { useState } from "react";
import { Bill } from "@/components/homepage";
import { CreateBill } from "@/components/create-bill";
import { VoiceSplitAgent } from "@/components/VoiceSplitAgent";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ArrowLeft } from "lucide-react";

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

export default function CreateBillPage() {
  const router = useRouter();
  const { address: userAddress } = useAccount();
  const [formKey, setFormKey] = useState(0);
  const [voiceDefaults, setVoiceDefaults] = useState<ParsedBill | null>(null);
  const [showForm, setShowForm] = useState(false);

  function handleBillCreated(_bill: ParsedBill, txHash: string) {
    setTimeout(() => router.push("/"), 2000);
  }

  function handleBillParsed(parsed: ParsedBill) {
    setVoiceDefaults(parsed);
    setFormKey((k) => k + 1);
    setShowForm(true);
  }

  const defaultParticipants = voiceDefaults?.participants.map((p, i) => {
    let name = "";
    if (p.address === userAddress) name = "You";
    else if (p.resolvedFrom) name = p.resolvedFrom;
    else if (p.address !== "0xPENDING" && p.address.startsWith("0x"))
      name = `${p.address.slice(0, 6)}...${p.address.slice(-4)}`;
    return {
      id: `voice-${formKey}-${i}`,
      name,
      phoneNumber: "",
      wallet: p.address === "0xPENDING" ? "" : p.address,
      share: p.share,
    };
  });

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0e0e12",
        fontFamily: "'Syne', sans-serif",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "#16161d",
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
          }}
        >
          <ArrowLeft size={18} color="#f0eee8" />
        </button>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#f0eee8" }}>
            New Bill
          </div>
          <div style={{ fontSize: "11px", color: "#8b8a96" }}>
            Voice or manual entry
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0",
          margin: "16px 20px 0",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "12px",
          padding: "4px",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {[
          { label: "🎙️ Voice Agent", key: false },
          { label: "✏️ Manual", key: true },
        ].map((tab) => (
          <button
            key={String(tab.key)}
            onClick={() => setShowForm(tab.key)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "9px",
              border: "none",
              cursor: "pointer",
              background:
                showForm === tab.key ? "rgba(245,158,11,0.15)" : "transparent",
              color: showForm === tab.key ? "#f59e0b" : "#8b8a96",
              fontWeight: showForm === tab.key ? 700 : 500,
              fontSize: "13px",
              fontFamily: "'Syne', sans-serif",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!showForm && (
        <div style={{ padding: "16px 0 0" }}>
          <VoiceSplitAgent
            onBillCreated={handleBillCreated}
            onBillParsed={handleBillParsed}
          />
        </div>
      )}

      {showForm && (
        <CreateBill
          key={formKey}
          onBack={() => setShowForm(false)}
          onCreate={() => router.push("/")}
          defaultTitle={voiceDefaults?.title}
          defaultAmount={voiceDefaults?.totalAmount?.toString()}
          defaultParticipants={defaultParticipants}
        />
      )}
    </div>
  );
}
