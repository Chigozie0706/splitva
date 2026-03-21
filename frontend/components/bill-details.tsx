"use client";

import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowUp,
} from "lucide-react";
import { useAccount } from "wagmi";
import { Bill, Participant, Currency } from "./homepage";

interface BillDetailsProps {
  bill: Bill;
  onBack: () => void;
  onPayShare: (billId: string, participantId: string) => void;
  onWithdraw: (billId: string) => void;
}

// ── Participant card inlined — no separate import needed ──────────────────────
function ParticipantRow({
  participant,
  currency,
  billStatus,
  currentAddress,
  onPay,
}: {
  participant: Participant;
  currency: Currency;
  billStatus: "active" | "completed";
  currentAddress?: string;
  onPay: () => void;
}) {
  const isMe =
    !!currentAddress &&
    participant.id.toLowerCase() === currentAddress.toLowerCase();
  const remaining = participant.share - participant.amountPaid;

  const statusCfg = {
    paid: {
      color: "#10b981",
      bg: "rgba(16,185,129,0.08)",
      border: "rgba(16,185,129,0.2)",
      icon: <CheckCircle size={11} />,
      label: "Paid",
    },
    pending: {
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.2)",
      icon: <Clock size={11} />,
      label: "Pending",
    },
    underpaid: {
      color: "#f97316",
      bg: "rgba(249,115,22,0.08)",
      border: "rgba(249,115,22,0.2)",
      icon: <AlertCircle size={11} />,
      label: "Partial",
    },
    overpaid: {
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.08)",
      border: "rgba(59,130,246,0.2)",
      icon: <ArrowUp size={11} />,
      label: "Overpaid",
    },
  }[participant.status];

  return (
    <div
      style={{
        background: isMe ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.03)",
        border: isMe
          ? "1px solid rgba(245,158,11,0.2)"
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        padding: "14px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isMe && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, #f59e0b, transparent)",
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "3px",
            }}
          >
            <span
              style={{
                color: "#f0eee8",
                fontWeight: 600,
                fontSize: "14px",
                fontFamily: "var(--font-syne), sans-serif",
              }}
            >
              {participant.name}
            </span>
            {isMe && (
              <span
                style={{
                  background: "rgba(245,158,11,0.15)",
                  color: "#f59e0b",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "6px",
                  letterSpacing: "0.5px",
                }}
              >
                YOU
              </span>
            )}
          </div>
          <div
            style={{
              color: "#4a4a5a",
              fontSize: "11px",
              fontFamily: "var(--font-dm-mono), 'DM Mono', monospace",
            }}
          >
            {participant.id.slice(0, 8)}...{participant.id.slice(-6)}
          </div>
        </div>
        <span
          style={{
            background: statusCfg.bg,
            color: statusCfg.color,
            border: `1px solid ${statusCfg.border}`,
            fontSize: "11px",
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {statusCfg.icon} {statusCfg.label}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "20px" }}>
          <div>
            <div
              style={{
                color: "#4a4a5a",
                fontSize: "10px",
                letterSpacing: "0.5px",
                marginBottom: "2px",
              }}
            >
              SHARE
            </div>
            <div
              style={{
                color: "#f0eee8",
                fontWeight: 600,
                fontSize: "14px",
                fontFamily: "var(--font-dm-mono), 'DM Mono', monospace",
              }}
            >
              {/* {participant.share.toFixed(2)}{" "} */}
              {participant.share < 0.01
                ? participant.share.toFixed(4)
                : participant.share.toFixed(2)}

              <span style={{ color: "#8b8a96", fontSize: "11px" }}>
                {currency}
              </span>
            </div>
          </div>
          {participant.amountPaid > 0 && (
            <div>
              <div
                style={{
                  color: "#4a4a5a",
                  fontSize: "10px",
                  letterSpacing: "0.5px",
                  marginBottom: "2px",
                }}
              >
                PAID
              </div>
              <div
                style={{
                  color: "#10b981",
                  fontWeight: 600,
                  fontSize: "14px",
                  fontFamily: "var(--font-dm-mono), 'DM Mono', monospace",
                }}
              >
                {/* {participant.amountPaid.toFixed(2)} */}
                {participant.amountPaid < 0.01
                  ? participant.amountPaid.toFixed(4)
                  : participant.amountPaid.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {isMe && billStatus === "active" && participant.status !== "paid" && (
          <button
            onClick={onPay}
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "none",
              borderRadius: "10px",
              color: "#0e0e12",
              fontWeight: 700,
              fontSize: "13px",
              fontFamily: "var(--font-syne), sans-serif",
              padding: "8px 16px",
              cursor: "pointer",
              boxShadow: "0 2px 12px rgba(245,158,11,0.3)",
            }}
          >
            {/* Pay {remaining.toFixed(2)} */}
            Pay {remaining < 0.01 ? remaining.toFixed(4) : remaining.toFixed(2)}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main BillDetails component ────────────────────────────────────────────────
export function BillDetails({
  bill,
  onBack,
  onPayShare,
  onWithdraw,
}: BillDetailsProps) {
  const { address } = useAccount();
  const isOrganizer = bill.organizerId.toLowerCase() === address?.toLowerCase();
  const totalCollected = bill.participants.reduce(
    (sum, p) => sum + p.amountPaid,
    0,
  );
  const paidCount = bill.participants.filter((p) => p.status === "paid").length;
  const progress = Math.min((totalCollected / bill.totalAmount) * 100, 100);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: bill.title, url });
    else {
      navigator.clipboard.writeText(url);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0e0e12",
        fontFamily: "var(--font-syne), 'Syne', sans-serif",
        paddingBottom: "40px",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(180deg, #16161d 0%, #0e0e12 100%)",
          padding: "20px 20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              padding: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={18} color="#f0eee8" />
          </button>
          <button
            onClick={handleShare}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              padding: "8px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#8b8a96",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <Share2 size={14} /> Share
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "4px",
          }}
        >
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#f0eee8",
              letterSpacing: "-0.3px",
              margin: 0,
            }}
          >
            {bill.title}
          </h1>
          {bill.status === "completed" && (
            <span
              style={{
                background: "rgba(16,185,129,0.1)",
                color: "#10b981",
                border: "1px solid rgba(16,185,129,0.2)",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "20px",
                whiteSpace: "nowrap",
              }}
            >
              Completed
            </span>
          )}
        </div>
        <div style={{ color: "#8b8a96", fontSize: "12px" }}>
          {isOrganizer ? "Organized by you" : `By ${bill.organizerName}`}
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {/* Amount card */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "16px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div
              style={{
                color: "#4a4a5a",
                fontSize: "11px",
                letterSpacing: "1px",
                marginBottom: "6px",
              }}
            >
              TOTAL AMOUNT
            </div>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 800,
                color: "#f0eee8",
                fontFamily: "var(--font-dm-mono), 'DM Mono', monospace",
                letterSpacing: "-1px",
                lineHeight: 1,
              }}
            >
              {/* {bill.totalAmount.toFixed(2)} */}
              {bill.totalAmount < 0.01
                ? bill.totalAmount.toFixed(4)
                : bill.totalAmount.toFixed(2)}

              <span
                style={{
                  color: "#f59e0b",
                  fontSize: "18px",
                  marginLeft: "6px",
                }}
              >
                {bill.currency}
              </span>
            </div>
            <div
              style={{ color: "#10b981", fontSize: "13px", marginTop: "6px" }}
            >
              {/* {totalCollected.toFixed(2)} {bill.currency} collected */}
              {totalCollected < 0.01
                ? totalCollected.toFixed(4)
                : totalCollected.toFixed(2)}{" "}
              {bill.currency} collected
            </div>
          </div>

          {bill.status === "active" && (
            <>
              <div
                style={{
                  height: "6px",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "3px",
                  overflow: "hidden",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #10b981, #059669)",
                    borderRadius: "3px",
                    transition: "width 0.8s ease",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#8b8a96", fontSize: "12px" }}>
                  {paidCount} of {bill.participants.length} paid
                </span>
                <span style={{ color: "#8b8a96", fontSize: "12px" }}>
                  {progress.toFixed(0)}%
                </span>
              </div>
            </>
          )}

          {isOrganizer && bill.status === "completed" && totalCollected > 0 && (
            <button
              onClick={() =>
                window.confirm(
                  // `Withdraw ${totalCollected.toFixed(2)} ${bill.currency}?`
                  `Withdraw ${totalCollected < 0.01 ? totalCollected.toFixed(4) : totalCollected.toFixed(2)} ${bill.currency}?`,
                ) && onWithdraw(bill.id)
              }
              style={{
                width: "100%",
                marginTop: "16px",
                padding: "12px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                fontWeight: 700,
                fontSize: "14px",
                fontFamily: "var(--font-syne), sans-serif",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Download size={16} />
              {/* Withdraw {totalCollected.toFixed(2)}{" "} */}
              Withdraw{" "}
              {totalCollected < 0.01
                ? totalCollected.toFixed(4)
                : totalCollected.toFixed(2)}{" "}
              {bill.currency}
            </button>
          )}

          {isOrganizer && bill.status === "active" && (
            <div
              style={{
                marginTop: "14px",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "10px",
                color: "#4a4a5a",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              Waiting for all participants to pay
            </div>
          )}
        </div>

        {/* Participants */}
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#4a4a5a",
              letterSpacing: "1.5px",
              marginBottom: "12px",
            }}
          >
            PARTICIPANTS ({bill.participants.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {bill.participants.map((p) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                currency={bill.currency}
                billStatus={bill.status}
                currentAddress={address}
                onPay={() => onPayShare(bill.id, p.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
