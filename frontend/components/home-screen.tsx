"use client";

import { Plus, Mic, ArrowRight, CheckCircle, Clock, Zap } from "lucide-react";
import { Bill } from "./homepage";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

interface HomeScreenProps {
  bills: Bill[];
  onCreateBill: () => void;
  onSelectBill: (billId: string) => void;
}

function BillCard({
  bill,
  onClick,
  currentAddress,
}: {
  bill: Bill;
  onClick: () => void;
  currentAddress?: string;
}) {
  const paidCount = bill.participants.filter((p) => p.status === "paid").length;
  const totalCount = bill.participants.length;
  const totalCollected = bill.participants.reduce(
    (sum, p) => sum + p.amountPaid,
    0,
  );
  const progress = Math.min((totalCollected / bill.totalAmount) * 100, 100);
  const isOrganizer =
    bill.organizerId.toLowerCase() === currentAddress?.toLowerCase();
  const myParticipant = bill.participants.find(
    (p) => p.id.toLowerCase() === currentAddress?.toLowerCase(),
  );
  const iOwe = myParticipant && myParticipant.status !== "paid";

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
      style={{ animation: "fadeUp 0.3s ease both" }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: iOwe
            ? "1px solid rgba(245,158,11,0.25)"
            : "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "16px",
          transition: "all 0.2s",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {iOwe && (
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
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <div
              style={{
                color: "#f0eee8",
                fontWeight: 600,
                fontSize: "15px",
                marginBottom: "2px",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {bill.title}
            </div>
            <div style={{ color: "#8b8a96", fontSize: "12px" }}>
              {isOrganizer ? "You organized" : `By ${bill.organizerName}`}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {bill.status === "completed" ? (
              <span
                style={{
                  background: "rgba(16,185,129,0.1)",
                  color: "#10b981",
                  border: "1px solid rgba(16,185,129,0.2)",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CheckCircle size={10} /> Done
              </span>
            ) : (
              <span
                style={{
                  background: "rgba(245,158,11,0.08)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.2)",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Clock size={10} /> {paidCount}/{totalCount}
              </span>
            )}
            <ArrowRight
              size={14}
              style={{ color: "#4a4a5a", transition: "color 0.2s" }}
            />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div
              style={{
                color: "#4a4a5a",
                fontSize: "11px",
                marginBottom: "2px",
                letterSpacing: "0.5px",
              }}
            >
              TOTAL
            </div>
            <div
              style={{
                color: "#f0eee8",
                fontSize: "18px",
                fontWeight: 700,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {bill.totalAmount.toFixed(2)}
              <span
                style={{
                  color: "#f59e0b",
                  fontSize: "12px",
                  marginLeft: "4px",
                }}
              >
                {bill.currency}
              </span>
            </div>
          </div>
          {iOwe && myParticipant && (
            <div
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "8px",
                padding: "6px 10px",
                textAlign: "right",
              }}
            >
              <div
                style={{
                  color: "#f59e0b",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                YOU OWE
              </div>
              <div
                style={{
                  color: "#f59e0b",
                  fontSize: "14px",
                  fontWeight: 700,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {(myParticipant.share - myParticipant.amountPaid).toFixed(2)}
              </div>
            </div>
          )}
        </div>
        {bill.status === "active" && (
          <div style={{ marginTop: "12px" }}>
            <div
              style={{
                height: "3px",
                background: "rgba(255,255,255,0.06)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #10b981, #059669)",
                  borderRadius: "2px",
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <div
              style={{ color: "#4a4a5a", fontSize: "11px", marginTop: "4px" }}
            >
              {totalCollected.toFixed(2)} {bill.currency} collected
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

export function HomeScreen({
  bills,
  onCreateBill,
  onSelectBill,
}: HomeScreenProps) {
  const router = useRouter();
  const { address } = useAccount();
  const activeBills = bills.filter((b) => b.status === "active");
  const completedBills = bills.filter((b) => b.status === "completed");

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0e0e12",
        paddingBottom: "40px",
        fontFamily: "'Syne', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(180deg, #16161d 0%, #0e0e12 100%)",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: bills.length > 0 ? "20px" : "0" }}
        >
          <div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#f0eee8",
                letterSpacing: "-0.5px",
              }}
            >
              Split<span style={{ color: "#f59e0b" }}>va</span>
            </div>
            <div
              style={{ fontSize: "12px", color: "#8b8a96", marginTop: "1px" }}
            >
              Voice-powered bills on Celo
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              padding: "5px 12px",
              fontSize: "11px",
              color: "#8b8a96",
              fontWeight: 600,
            }}
          >
            ⬡ Celo
          </div>
        </div>
        {bills.length > 0 && (
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { label: "Active", value: activeBills.length, color: "#f59e0b" },
              {
                label: "Completed",
                value: completedBills.length,
                color: "#10b981",
              },
              { label: "Total", value: bills.length, color: "#8b8a96" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: s.color,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#4a4a5a",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                  }}
                >
                  {s.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "16px 20px" }}>
        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
          <button
            onClick={() => router.push("/create_bill")}
            style={{
              flex: 1,
              padding: "14px 16px",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "none",
              borderRadius: "14px",
              color: "#0e0e12",
              fontWeight: 700,
              fontSize: "14px",
              fontFamily: "'Syne', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 24px rgba(245,158,11,0.3)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <Mic size={16} /> Voice Split
          </button>
          <button
            onClick={() => router.push("/create_bill")}
            style={{
              padding: "14px 18px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              color: "#f0eee8",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "'Syne', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <Plus size={16} /> Manual
          </button>
        </div>

        {activeBills.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: "12px" }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#4a4a5a",
                  letterSpacing: "1.5px",
                }}
              >
                ACTIVE BILLS
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#f59e0b",
                  fontWeight: 600,
                  background: "rgba(245,158,11,0.08)",
                  padding: "2px 8px",
                  borderRadius: "10px",
                }}
              >
                {activeBills.length} open
              </div>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {activeBills.map((bill, i) => (
                <div key={bill.id} style={{ animationDelay: `${i * 0.05}s` }}>
                  <BillCard
                    bill={bill}
                    onClick={() => onSelectBill(bill.id)}
                    currentAddress={address}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {completedBills.length > 0 && (
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
              COMPLETED
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {completedBills.map((bill, i) => (
                <div key={bill.id} style={{ animationDelay: `${i * 0.05}s` }}>
                  <BillCard
                    bill={bill}
                    onClick={() => onSelectBill(bill.id)}
                    currentAddress={address}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {bills.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "60px",
              gap: "16px",
              animation: "fadeUp 0.4s ease",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "-8px",
                  borderRadius: "50%",
                  border: "1px solid rgba(245,158,11,0.1)",
                  animation: "pulse-ring 2s ease-out infinite",
                }}
              />
              <Zap size={30} color="#f59e0b" />
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: "#f0eee8",
                  marginBottom: "8px",
                }}
              >
                No bills yet
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#8b8a96",
                  lineHeight: 1.7,
                  maxWidth: "240px",
                }}
              >
                Say "Dinner $90 split with @alice" and your agent handles the
                rest
              </div>
            </div>
            <button
              onClick={() => router.push("/create_bill")}
              style={{
                padding: "13px 28px",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                border: "none",
                borderRadius: "14px",
                color: "#0e0e12",
                fontWeight: 700,
                fontSize: "14px",
                fontFamily: "'Syne', sans-serif",
                boxShadow: "0 4px 24px rgba(245,158,11,0.3)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Mic size={16} /> Start with Voice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
