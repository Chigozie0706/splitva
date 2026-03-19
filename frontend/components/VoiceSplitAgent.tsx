"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  Mic,
  Square,
  Loader2,
  CheckCircle,
  X,
  Volume2,
  Zap,
  ExternalLink,
} from "lucide-react";
import { useBillAgent } from "@/hooks/useBillAgent";

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
interface VoiceSplitAgentProps {
  onBillCreated?: (bill: ParsedBill, txHash: string) => void;
  onBillParsed?: (bill: ParsedBill) => void;
}
type AgentState =
  | "idle"
  | "listening"
  | "processing"
  | "confirming"
  | "executing"
  | "done"
  | "error";

const S = {
  idle: { color: "#8b8a96", label: "Ready", bg: "rgba(139,138,150,0.1)" },
  listening: {
    color: "#10b981",
    label: "Listening",
    bg: "rgba(16,185,129,0.1)",
  },
  processing: {
    color: "#3b82f6",
    label: "Thinking",
    bg: "rgba(59,130,246,0.1)",
  },
  confirming: {
    color: "#f59e0b",
    label: "Confirm?",
    bg: "rgba(245,158,11,0.1)",
  },
  executing: {
    color: "#8b5cf6",
    label: "Executing",
    bg: "rgba(139,92,246,0.1)",
  },
  done: { color: "#10b981", label: "Done", bg: "rgba(16,185,129,0.1)" },
  error: { color: "#ef4444", label: "Error", bg: "rgba(239,68,68,0.1)" },
};

export function VoiceSplitAgent({
  onBillCreated,
  onBillParsed,
}: VoiceSplitAgentProps) {
  const { address: userAddress } = useAccount();
  const billAgent = useBillAgent();
  const [state, setState] = useState<AgentState>("idle");
  const [parsedBill, setParsedBill] = useState<ParsedBill | null>(null);
  const [message, setMessage] = useState("Tap the orb and describe your bill");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const userAddressRef = useRef(userAddress);
  const isRecordingRef = useRef(false);
  userAddressRef.current = userAddress;

  useEffect(() => {
    if (billAgent.status === "awaiting_wallet")
      setMessage("Confirm in your wallet...");
    else if (billAgent.status === "confirming")
      setMessage("Confirming on Celo...");
    else if (billAgent.isSuccess && billAgent.txHash && parsedBill) {
      setState("done");
      setMessage("Bill created on Celo!");
      speakText(
        "Bill created successfully on Celo! Participants can now pay their share.",
      );
      onBillCreated?.(parsedBill, billAgent.txHash);
    } else if (billAgent.status === "error") {
      setError(billAgent.errorMsg || "Transaction failed");
      setState("error");
    }
  }, [billAgent.status, billAgent.isSuccess, billAgent.txHash]);

  const startVisualizer = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    src.connect(analyser);
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d")!;
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      const barW = canvas.width / data.length;
      data.forEach((v, i) => {
        const h = (v / 255) * canvas.height * 0.9;
        const grad = ctx2d.createLinearGradient(
          0,
          canvas.height,
          0,
          canvas.height - h,
        );
        grad.addColorStop(0, "#10b981");
        grad.addColorStop(1, "#f59e0b");
        ctx2d.fillStyle = grad;
        ctx2d.fillRect(i * barW + 1, canvas.height - h, barW - 2, h);
      });
    };
    draw();
  }, []);

  const stopVisualizer = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    audioContextRef.current?.close().catch(() => {});
    const canvas = waveCanvasRef.current;
    if (canvas)
      canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const speakText = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  const handleRecordingStop = useCallback(
    async (chunks: Blob[]) => {
      try {
        setState("processing");
        setMessage("Transcribing...");
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        const sttRes = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        const sttData = await sttRes.json();
        if (!sttRes.ok || !sttData.transcript)
          throw new Error(sttData.error || "Could not transcribe.");
        setMessage(
          `Parsing: "${sttData.transcript.slice(0, 40)}${sttData.transcript.length > 40 ? "…" : ""}"`,
        );
        const parseRes = await fetch("/api/parse-bill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: sttData.transcript,
            userAddress: userAddressRef.current,
          }),
        });
        const bill: ParsedBill = await parseRes.json();
        if (!parseRes.ok || !bill.title)
          throw new Error((bill as any).error || "Could not understand.");
        setParsedBill(bill);
        setState("confirming");
        setMessage(bill.confirmation);
        await speakText(bill.confirmation);
      } catch (err: any) {
        setError(err.message || "Something went wrong.");
        setState("error");
      }
    },
    [speakText],
  );

  const startRecording = async () => {
    try {
      setError("");
      setState("listening");
      setMessage("Listening… tap Stop when done");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => handleRecordingStop([...chunksRef.current]);
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      isRecordingRef.current = true;
      startVisualizer(stream);
    } catch (err: any) {
      setError(
        err.name === "NotAllowedError" ? "Mic access denied." : err.message,
      );
      setState("error");
    }
  };

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    const r = mediaRecorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    stopVisualizer();
  }, [stopVisualizer]);

  const handleMicClick = () => {
    if (state === "listening") stopRecording();
    else if (["idle", "done", "error"].includes(state)) startRecording();
  };

  const handleAgentExecute = async () => {
    if (!parsedBill) return;
    if (parsedBill.participants.some((p) => p.address === "0xPENDING")) {
      setError(
        "Some participants couldn't be resolved. Try with valid Farcaster usernames.",
      );
      return;
    }
    setState("executing");
    setMessage("Creating your bill on Celo...");
    try {
      await billAgent.executeBillCreation({
        title: parsedBill.title,
        totalAmount: parsedBill.totalAmount,
        participants: parsedBill.participants.map((p) => ({
          address: p.address,
          share: p.share,
          name:
            p.resolvedFrom ||
            `${p.address.slice(0, 6)}...${p.address.slice(-4)}`,
        })),
        currency: "cUSDm",
      });
    } catch {}
  };

  const handleReset = () => {
    setState("idle");
    setParsedBill(null);
    setMessage("Tap the orb and describe your bill");
    setError("");
    billAgent.reset();
  };

  const cfg = S[state];
  const isDisabled = ["processing", "confirming", "executing"].includes(state);

  return (
    <div
      style={{
        background: "#0e0e12",
        fontFamily: "'Syne', sans-serif",
        padding: "20px",
      }}
    >
      {/* Mic orb */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "96px",
            height: "96px",
            marginBottom: "16px",
          }}
        >
          {state === "listening" &&
            [1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: `${-i * 10}px`,
                  borderRadius: "50%",
                  border: `1px solid rgba(16,185,129,${0.3 - i * 0.08})`,
                  animation: `pulse-ring ${1 + i * 0.3}s ease-out infinite`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          <button
            onClick={handleMicClick}
            disabled={isDisabled}
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "50%",
              background:
                state === "listening"
                  ? "radial-gradient(circle, rgba(16,185,129,0.2), rgba(16,185,129,0.05))"
                  : state === "executing"
                    ? "radial-gradient(circle, rgba(139,92,246,0.2), rgba(139,92,246,0.05))"
                    : "radial-gradient(circle, rgba(245,158,11,0.15), rgba(245,158,11,0.03))",
              border: `2px solid ${cfg.color}40`,
              boxShadow: `0 0 32px ${cfg.color}30, inset 0 0 20px ${cfg.color}10`,
              cursor: isDisabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s",
              opacity: isDisabled && state !== "executing" ? 0.5 : 1,
            }}
          >
            {["processing", "executing"].includes(state) ? (
              <Loader2
                size={32}
                color={cfg.color}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : state === "listening" ? (
              <Square size={28} color="#ef4444" fill="#ef4444" />
            ) : (
              <Mic size={32} color={cfg.color} />
            )}
          </button>
        </div>

        {/* Status badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: cfg.bg,
            border: `1px solid ${cfg.color}30`,
            borderRadius: "20px",
            padding: "4px 12px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: cfg.color,
              animation:
                state === "listening"
                  ? "pulse-ring 1s ease-out infinite"
                  : "none",
            }}
          />
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: cfg.color,
              letterSpacing: "0.5px",
            }}
          >
            {cfg.label}
          </span>
          {isSpeaking && (
            <Volume2
              size={12}
              color={cfg.color}
              style={{ animation: "none" }}
            />
          )}
        </div>

        {/* Waveform */}
        <canvas
          ref={waveCanvasRef}
          width={200}
          height={32}
          style={{
            borderRadius: "4px",
            opacity: state === "listening" ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        />

        {/* Large stop button — dedicated tap target so orb ambiguity doesn't matter */}
        {state === "listening" && (
          <button
            onClick={stopRecording}
            style={{
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 28px",
              background: "rgba(239,68,68,0.12)",
              border: "1.5px solid rgba(239,68,68,0.4)",
              borderRadius: "30px",
              color: "#ef4444",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-syne), 'Syne', sans-serif",
            }}
          >
            <Square size={12} fill="#ef4444" color="#ef4444" /> Stop Recording
          </button>
        )}
      </div>

      {/* Message */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "12px",
          padding: "12px 14px",
          marginBottom: "12px",
          fontSize: "13px",
          color: "#8b8a96",
          lineHeight: 1.5,
          minHeight: "44px",
        }}
      >
        {state === "executing" ? billAgent.agentMessage || message : message}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "12px",
            padding: "10px 12px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
          }}
        >
          <span style={{ color: "#ef4444", fontSize: "13px", flex: 1 }}>
            {error}
          </span>
          <button
            onClick={handleReset}
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

      {/* Bill confirm card */}
      {parsedBill && state === "confirming" && (
        <div
          style={{
            background: "rgba(245,158,11,0.04)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid rgba(245,158,11,0.15)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{ color: "#f0eee8", fontWeight: 700, fontSize: "15px" }}
            >
              {parsedBill.title}
            </span>
            <span
              style={{
                color: "#f59e0b",
                fontWeight: 800,
                fontSize: "16px",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {parsedBill.totalAmountDisplay}
            </span>
          </div>
          {parsedBill.participants.map((p, i) => (
            <div
              key={i}
              style={{
                padding: "10px 14px",
                borderBottom:
                  i < parsedBill.participants.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "#8b8a96",
                  fontSize: "12px",
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {p.address === userAddress
                  ? "You"
                  : p.address === "0xPENDING"
                    ? "⚠️ Unresolved"
                    : p.resolvedFrom
                      ? p.resolvedFrom
                      : `${p.address.slice(0, 6)}...${p.address.slice(-4)}`}
              </span>
              <span
                style={{
                  color: "#f0eee8",
                  fontWeight: 700,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "14px",
                }}
              >
                {p.shareDisplay}
              </span>
            </div>
          ))}
          <div
            style={{
              padding: "10px 12px",
              display: "flex",
              gap: "8px",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            <button
              onClick={handleAgentExecute}
              style={{
                flex: 1,
                padding: "10px",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                border: "none",
                borderRadius: "10px",
                color: "#0e0e12",
                fontWeight: 700,
                fontSize: "13px",
                fontFamily: "'Syne', sans-serif",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
              }}
            >
              <Zap size={14} /> Create on Celo
            </button>
            {onBillParsed && (
              <button
                onClick={() => {
                  if (parsedBill && onBillParsed) onBillParsed(parsedBill);
                  setState("done");
                  setMessage("Review form below.");
                }}
                style={{
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#8b8a96",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Review
              </button>
            )}
            <button
              onClick={handleReset}
              style={{
                padding: "10px 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                color: "#8b8a96",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {state === "done" && billAgent.txHash && (
        <div
          style={{
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "14px",
            padding: "14px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <CheckCircle size={16} color="#10b981" />
            <span
              style={{ color: "#10b981", fontWeight: 700, fontSize: "14px" }}
            >
              Bill Created on Celo!
            </span>
          </div>
          <a
            href={`https://celoscan.io/tx/${billAgent.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#8b8a96",
              fontSize: "11px",
              fontFamily: "'DM Mono', monospace",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              textDecoration: "none",
            }}
          >
            {billAgent.txHash.slice(0, 18)}...{billAgent.txHash.slice(-8)}{" "}
            <ExternalLink size={10} />
          </a>
          <button
            onClick={handleReset}
            style={{
              marginTop: "10px",
              width: "100%",
              background: "none",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "8px",
              color: "#10b981",
              fontSize: "12px",
              padding: "6px",
              cursor: "pointer",
            }}
          >
            + Create another
          </button>
        </div>
      )}

      {/* Hints */}
      {["idle", "error"].includes(state) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            justifyContent: "center",
          }}
        >
          {[
            "Dinner $90 split with @alice",
            "Uber $24 for @dave and me",
            "Groceries $60 split 3 ways",
          ].map((h) => (
            <span
              key={h}
              style={{
                fontSize: "11px",
                background: "rgba(255,255,255,0.04)",
                color: "#4a4a5a",
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "4px 10px",
                borderRadius: "20px",
              }}
            >
              "{h}"
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
