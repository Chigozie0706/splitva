"use client";
// components/VoiceSettleButton.tsx
// Floating voice button on bill details — say "pay my share" to settle

import { useEffect } from "react";
import {
  Mic,
  Square,
  Loader2,
  CheckCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { useVoiceSettle } from "@/hooks/useVoiceSettle";
import { Address } from "viem";

interface VoiceSettleButtonProps {
  billId: bigint;
  amountOwed: number; // remaining amount user owes
  stablecoinAddress: Address;
  currency: string;
  onSuccess?: (txHash: string) => void;
}

const statusLabel: Record<string, string> = {
  idle: 'Say "pay my share"',
  listening: "Listening…",
  transcribing: "Processing…",
  confirming: "Confirming payment…",
  approving: "Approving token spend…",
  paying: "Sending payment…",
  success: "Payment sent!",
  error: "Try again",
};

export function VoiceSettleButton({
  billId,
  amountOwed,
  stablecoinAddress,
  currency,
  onSuccess,
}: VoiceSettleButtonProps) {
  const settle = useVoiceSettle();

  // When intent confirmed → auto-execute payment
  useEffect(() => {
    if (settle.status === "confirming") {
      settle.executePayment(billId, amountOwed, stablecoinAddress);
    }
  }, [settle.status]);

  // Notify parent on success
  useEffect(() => {
    if (settle.status === "success" && settle.txHash) {
      onSuccess?.(settle.txHash);
    }
  }, [settle.status, settle.txHash]);

  const isActive = [
    "listening",
    "transcribing",
    "confirming",
    "approving",
    "paying",
  ].includes(settle.status);
  const isLoading = [
    "transcribing",
    "confirming",
    "approving",
    "paying",
  ].includes(settle.status);

  const orbColor =
    {
      idle: "#f59e0b",
      listening: "#10b981",
      transcribing: "#3b82f6",
      confirming: "#8b5cf6",
      approving: "#8b5cf6",
      paying: "#8b5cf6",
      success: "#10b981",
      error: "#ef4444",
    }[settle.status] ?? "#f59e0b";

  return (
    <>
      {/* Backdrop when active */}
      {isActive && (
        <div
          onClick={settle.stopListening}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 48,
          }}
        />
      )}

      {/* Main floating orb */}
      <div
        style={{
          position: "fixed",
          bottom: "28px",
          right: "20px",
          zIndex: 49,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "10px",
        }}
      >
        {/* Status card — shows when active or error */}
        {(isActive ||
          settle.status === "error" ||
          settle.status === "success") && (
          <div
            style={{
              background: "#16161d",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "14px",
              padding: "12px 14px",
              maxWidth: "220px",
              animation: "fadeUp 0.2s ease",
            }}
          >
            {settle.status === "success" && settle.txHash ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "6px",
                  }}
                >
                  <CheckCircle size={14} color="#10b981" />
                  <span
                    style={{
                      color: "#10b981",
                      fontWeight: 700,
                      fontSize: "13px",
                      fontFamily: "var(--font-syne), sans-serif",
                    }}
                  >
                    Paid {amountOwed.toFixed(2)} {currency}!
                  </span>
                </div>
                <a
                  href={`https://celoscan.io/tx/${settle.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#8b8a96",
                    fontSize: "11px",
                    fontFamily: "var(--font-dm-mono), monospace",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    textDecoration: "none",
                  }}
                >
                  {settle.txHash.slice(0, 14)}… <ExternalLink size={9} />
                </a>
                <button
                  onClick={settle.reset}
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    background: "none",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    color: "#8b8a96",
                    fontSize: "11px",
                    padding: "5px",
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </>
            ) : settle.status === "error" ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "6px",
                }}
              >
                <span style={{ color: "#ef4444", fontSize: "12px", flex: 1 }}>
                  {settle.errorMsg}
                </span>
                <button
                  onClick={settle.reset}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <X size={12} color="#ef4444" />
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    color: "#f0eee8",
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "4px",
                    fontFamily: "var(--font-syne), sans-serif",
                  }}
                >
                  {statusLabel[settle.status]}
                </div>
                {settle.status === "listening" && (
                  <div style={{ color: "#8b8a96", fontSize: "11px" }}>
                    Auto-stops in 4 seconds
                  </div>
                )}
                {settle.status === "approving" && (
                  <div style={{ color: "#8b8a96", fontSize: "11px" }}>
                    Step 1/2: approve tokens
                  </div>
                )}
                {settle.status === "paying" && (
                  <div style={{ color: "#8b8a96", fontSize: "11px" }}>
                    Step 2/2: sending payment
                  </div>
                )}
                <div
                  style={{
                    color: "#f59e0b",
                    fontSize: "12px",
                    fontWeight: 700,
                    marginTop: "6px",
                    fontFamily: "var(--font-dm-mono), monospace",
                  }}
                >
                  {amountOwed.toFixed(2)} {currency}
                </div>
              </>
            )}
          </div>
        )}

        {/* The orb button */}
        <div style={{ position: "relative" }}>
          {/* Pulse rings when listening */}
          {settle.status === "listening" &&
            [1, 2].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: `${-i * 8}px`,
                  borderRadius: "50%",
                  border: `1px solid rgba(16,185,129,${0.3 - i * 0.1})`,
                  animation: `pulse-ring ${1 + i * 0.3}s ease-out infinite`,
                  animationDelay: `${i * 0.15}s`,
                  pointerEvents: "none",
                }}
              />
            ))}

          <button
            onClick={() => {
              if (settle.status === "idle" || settle.status === "error")
                settle.startListening();
              else if (settle.status === "listening") settle.stopListening();
              else if (settle.status === "success") settle.reset();
            }}
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${orbColor}25, ${orbColor}08)`,
              border: `2px solid ${orbColor}50`,
              boxShadow: `0 0 24px ${orbColor}30, 0 4px 16px rgba(0,0,0,0.4)`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s",
              position: "relative",
            }}
          >
            {isLoading ? (
              <Loader2
                size={22}
                color={orbColor}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : settle.status === "listening" ? (
              <Square size={18} color="#ef4444" fill="#ef4444" />
            ) : settle.status === "success" ? (
              <CheckCircle size={22} color="#10b981" />
            ) : (
              <Mic size={22} color={orbColor} />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
