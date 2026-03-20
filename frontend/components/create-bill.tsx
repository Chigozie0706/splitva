"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  X,
  Users,
  Wallet,
  Phone,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Bill, Currency } from "./homepage";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, Address } from "viem";
import contractABI from "../contract/abi.json";

interface ParticipantInput {
  id: string;
  name: string;
  phoneNumber: string;
  wallet: string;
  share: number;
}
interface CreateBillProps {
  onBack: () => void;
  onCreate: (bill: Omit<Bill, "id" | "createdAt">) => void;
  defaultTitle?: string;
  defaultAmount?: string;
  defaultParticipants?: ParticipantInput[];
}

const STABLECOIN_ADDRESSES: Record<Currency, Address> = {
  cUSDm: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b",
};
const CONTRACT_ADDRESS: Address = "0xE47aa208f9B59b5857E6c54a5198a9a40F4c90C7";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  color: "#f0eee8",
  fontSize: "14px",
  outline: "none",
  fontFamily: "var(--font-syne), 'Syne', sans-serif",
  transition: "border 0.2s",
};
const labelStyle = {
  display: "block",
  color: "#8b8a96",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.8px",
  marginBottom: "6px",
};
const sectionStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "14px",
  padding: "16px",
  marginBottom: "12px",
};

export function CreateBill({
  onBack,
  onCreate,
  defaultTitle,
  defaultAmount,
  defaultParticipants,
}: CreateBillProps) {
  const [title, setTitle] = useState(defaultTitle || "");
  const [totalAmount, setTotalAmount] = useState(defaultAmount || "");
  const [participants, setParticipants] = useState<ParticipantInput[]>(
    defaultParticipants || [
      { id: "1", name: "", phoneNumber: "", wallet: "", share: 0 },
    ],
  );
  const [currency, setCurrency] = useState<Currency>("cUSDm");
  const [splitMethod, setSplitMethod] = useState<"equal" | "manual">(
    defaultParticipants ? "manual" : "equal",
  );
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const { isConnected } = useAccount();
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const isProcessing = isPending || isConfirming;

  useEffect(() => {
    if (splitMethod === "equal" && totalAmount) {
      const amount = parseFloat(totalAmount) || 0;
      const share = amount / participants.length;
      setParticipants((prev) => prev.map((p) => ({ ...p, share })));
    }
  }, [totalAmount, participants.length, splitMethod]);

  useEffect(() => {
    if (isSuccess && hash) {
      setShowSuccess(true);
      setTimeout(() => onBack(), 2500);
    }
  }, [isSuccess, hash]);
  useEffect(() => {
    if (writeError) setError(writeError.message || "Transaction failed");
  }, [writeError]);

  const validateForm = () => {
    if (!isConnected) {
      setError("Wallet not connected");
      return false;
    }
    if (!title.trim()) {
      setError("Enter a bill title");
      return false;
    }
    const amount = parseFloat(totalAmount);
    if (!totalAmount || isNaN(amount) || amount <= 0) {
      setError("Enter a valid amount");
      return false;
    }
    if (participants.some((p) => !p.name.trim())) {
      setError("Enter a name for all participants");
      return false;
    }
    for (const p of participants) {
      if (!p.wallet.trim()) {
        setError(`Enter wallet for ${p.name}`);
        return false;
      }
      if (!p.wallet.startsWith("0x") || p.wallet.length !== 42) {
        setError(`Invalid address for ${p.name}`);
        return false;
      }
    }
    if (splitMethod === "manual") {
      const sum = participants.reduce((s, p) => s + (p.share || 0), 0);
      if (Math.abs(sum - amount) > 0.01) {
        setError(
          `Shares (${sum.toFixed(2)}) must equal total (${amount.toFixed(2)})`,
        );
        return false;
      }
    }
    return true;
  };

  const handleCreate = async () => {
    setError("");
    if (!validateForm()) return;
    const amount = parseFloat(totalAmount);
    const finalParticipants =
      splitMethod === "equal"
        ? participants.map((p) => ({
            ...p,
            share: amount / participants.length,
          }))
        : participants;
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI.abi,
        functionName: "createBill",
        args: [
          title,
          parseUnits(amount.toString(), 18),
          STABLECOIN_ADDRESSES[currency],
          finalParticipants.map((p) => ({
            wallet: p.wallet as Address,
            share: parseUnits(p.share.toString(), 18),
            name: p.name,
            phoneNumber: p.phoneNumber || "0",
          })),
        ],
      });
    } catch (err: any) {
      setError(err.message || "Failed to create bill");
    }
  };

  const canSubmit =
    title &&
    totalAmount &&
    participants.every((p) => p.name && p.wallet) &&
    !isProcessing;

  return (
    <div
      style={{
        background: "#0e0e12",
        minHeight: "100vh",
        fontFamily: "var(--font-syne), 'Syne', sans-serif",
        paddingBottom: "100px",
      }}
    >
      {/* Success overlay */}
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
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
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "20px",
              padding: "32px 24px",
              maxWidth: "320px",
              width: "100%",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CheckCircle size={28} color="#10b981" />
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#f0eee8",
                marginBottom: "8px",
              }}
            >
              Bill Created!
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#8b8a96",
                marginBottom: "16px",
              }}
            >
              Your bill is live on Celo
            </div>
            {hash && (
              <a
                href={`https://celoscan.io/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  color: "#10b981",
                  fontSize: "12px",
                  fontFamily: "'DM Mono', monospace",
                  textDecoration: "none",
                }}
              >
                {hash.slice(0, 12)}...{hash.slice(-8)}{" "}
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
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
              }}
            >
              {isPending ? "Confirm in wallet…" : "Confirming on Celo…"}
            </div>
            <div style={{ fontSize: "12px", color: "#8b8a96" }}>
              {isPending
                ? "Check your wallet app"
                : "Usually takes a few seconds"}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "16px 20px" }}>
        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "12px",
              padding: "12px 14px",
              marginBottom: "12px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <AlertCircle
              size={16}
              color="#ef4444"
              style={{ flexShrink: 0, marginTop: "1px" }}
            />
            <span style={{ color: "#ef4444", fontSize: "13px", flex: 1 }}>
              {error}
            </span>
            <button
              onClick={() => setError("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X size={14} color="#ef4444" />
            </button>
          </div>
        )}

        {/* Bill Details */}
        <div style={sectionStyle}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#f0eee8",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            📝 Bill Details
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>BILL TITLE *</label>
            <input
              style={inputStyle}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner at KFC"
              disabled={isProcessing}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label style={labelStyle}>AMOUNT *</label>
              <input
                style={inputStyle}
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={isProcessing}
              />
            </div>
            <div>
              <label style={labelStyle}>CURRENCY *</label>
              <select
                style={{ ...inputStyle, appearance: "none" as const }}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                disabled={isProcessing}
              >
                <option value="cUSDm">cUSDm 💵</option>
                <option value="cKES">cKES 🇰🇪</option>
                <option value="cREAL">cREAL 🇧🇷</option>
                <option value="cEUR">cEUR 🇪🇺</option>
              </select>
            </div>
          </div>
        </div>

        {/* Split Method */}
        <div style={sectionStyle}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#f0eee8",
              marginBottom: "12px",
            }}
          >
            ⚖️ Split Method
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
            }}
          >
            {(["equal", "manual"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setSplitMethod(method)}
                disabled={isProcessing}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border:
                    splitMethod === method
                      ? "1px solid rgba(245,158,11,0.4)"
                      : "1px solid rgba(255,255,255,0.07)",
                  background:
                    splitMethod === method
                      ? "rgba(245,158,11,0.08)"
                      : "rgba(255,255,255,0.03)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: "18px", marginBottom: "4px" }}>
                  {method === "equal" ? "⚖️" : "✏️"}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: splitMethod === method ? "#f59e0b" : "#f0eee8",
                  }}
                >
                  {method === "equal" ? "Equal" : "Custom"}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#4a4a5a",
                    marginTop: "2px",
                  }}
                >
                  {method === "equal" ? "Split evenly" : "Set amounts"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div style={sectionStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <div
              style={{ fontSize: "13px", fontWeight: 700, color: "#f0eee8" }}
            >
              👥 Participants ({participants.length})
            </div>
            <button
              onClick={() =>
                setParticipants([
                  ...participants,
                  {
                    id: Date.now().toString(),
                    name: "",
                    phoneNumber: "",
                    wallet: "",
                    share: 0,
                  },
                ])
              }
              disabled={isProcessing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "8px",
                padding: "5px 10px",
                color: "#f59e0b",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Plus size={12} /> Add
            </button>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {participants.map((p, index) => (
              <div
                key={p.id}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "12px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: "rgba(245,158,11,0.15)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#f59e0b",
                      }}
                    >
                      {index + 1}
                    </div>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#8b8a96",
                      }}
                    >
                      Person {index + 1}
                    </span>
                  </div>
                  {participants.length > 1 && (
                    <button
                      onClick={() =>
                        setParticipants(
                          participants.filter((pp) => pp.id !== p.id),
                        )
                      }
                      disabled={isProcessing}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      <X size={14} color="#4a4a5a" />
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div>
                    <label style={labelStyle}>NAME *</label>
                    <input
                      style={inputStyle}
                      type="text"
                      value={p.name}
                      onChange={(e) =>
                        setParticipants(
                          participants.map((pp) =>
                            pp.id === p.id
                              ? { ...pp, name: e.target.value }
                              : pp,
                          ),
                        )
                      }
                      placeholder="Alice or @farcaster"
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        ...labelStyle,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Wallet size={10} /> WALLET *
                    </label>
                    <input
                      style={{
                        ...inputStyle,
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "12px",
                      }}
                      type="text"
                      value={p.wallet}
                      onChange={(e) =>
                        setParticipants(
                          participants.map((pp) =>
                            pp.id === p.id
                              ? { ...pp, wallet: e.target.value }
                              : pp,
                          ),
                        )
                      }
                      placeholder="0x..."
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        ...labelStyle,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Phone size={10} /> PHONE (optional)
                    </label>
                    <input
                      style={inputStyle}
                      type="tel"
                      value={p.phoneNumber}
                      onChange={(e) =>
                        setParticipants(
                          participants.map((pp) =>
                            pp.id === p.id
                              ? { ...pp, phoneNumber: e.target.value }
                              : pp,
                          ),
                        )
                      }
                      placeholder="+1234567890"
                      disabled={isProcessing}
                    />
                  </div>
                  {splitMethod === "manual" && (
                    <div>
                      <label style={labelStyle}>AMOUNT TO PAY *</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={p.share || ""}
                        onChange={(e) =>
                          setParticipants(
                            participants.map((pp) =>
                              pp.id === p.id
                                ? {
                                    ...pp,
                                    share: parseFloat(e.target.value) || 0,
                                  }
                                : pp,
                            ),
                          )
                        }
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        disabled={isProcessing}
                      />
                    </div>
                  )}
                  {splitMethod === "equal" && totalAmount && (
                    <div
                      style={{
                        background: "rgba(245,158,11,0.06)",
                        border: "1px solid rgba(245,158,11,0.15)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#8b8a96", fontSize: "12px" }}>
                        Share
                      </span>
                      <span
                        style={{
                          color: "#f59e0b",
                          fontWeight: 700,
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        {(
                          parseFloat(totalAmount) / participants.length
                        ).toFixed(2)}{" "}
                        {currency}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {totalAmount && parseFloat(totalAmount) > 0 && (
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#f59e0b",
                marginBottom: "12px",
                letterSpacing: "0.5px",
              }}
            >
              BILL SUMMARY
            </div>
            {[
              {
                label: "Total",
                value: `${parseFloat(totalAmount).toFixed(2)} ${currency}`,
              },
              { label: "Participants", value: `${participants.length} people` },
              ...(splitMethod === "equal"
                ? [
                    {
                      label: "Per person",
                      value: `${(parseFloat(totalAmount) / participants.length).toFixed(2)} ${currency}`,
                    },
                  ]
                : []),
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ color: "#8b8a96", fontSize: "13px" }}>
                  {row.label}
                </span>
                <span
                  style={{
                    color: "#f0eee8",
                    fontWeight: 700,
                    fontSize: "13px",
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky submit */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 20px 24px",
          background: "linear-gradient(0deg, #0e0e12 60%, transparent)",
          zIndex: 10,
        }}
      >
        <button
          onClick={handleCreate}
          disabled={!canSubmit}
          style={{
            width: "100%",
            padding: "14px",
            background: canSubmit
              ? "linear-gradient(135deg, #f59e0b, #d97706)"
              : "rgba(255,255,255,0.06)",
            border: "none",
            borderRadius: "14px",
            color: canSubmit ? "#0e0e12" : "#4a4a5a",
            fontWeight: 700,
            fontSize: "15px",
            fontFamily: "var(--font-syne), 'Syne', sans-serif",
            cursor: canSubmit ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s",
            boxShadow: canSubmit ? "0 4px 24px rgba(245,158,11,0.3)" : "none",
          }}
        >
          {isProcessing ? (
            <>
              <Loader2
                size={18}
                style={{ animation: "spin 1s linear infinite" }}
              />{" "}
              Creating…
            </>
          ) : (
            <>
              <CheckCircle size={18} /> Create Bill
            </>
          )}
        </button>
      </div>
    </div>
  );
}
