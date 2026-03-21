"use client";
// hooks/useVoiceSettle.ts
// Listens for voice commands like "pay my share" and executes approve + payShare

import { useState, useRef, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, Address } from "viem";
import contractABI from "@/contract/abi.json";

const CONTRACT_ADDRESS = "0x95c7208144D097fdD83f4cF78CF780FF5674D5F3" as Address;

const ERC20_ABI = [{
  name: "approve", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }],
}] as const;

// Keywords that trigger payment
const PAY_TRIGGERS = [
  "pay", "settle", "send", "transfer", "pay my share",
  "settle my share", "pay now", "yes pay", "confirm payment",
];

export type SettleStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "confirming"   // heard a pay command, waiting user tap
  | "approving"
  | "paying"
  | "success"
  | "error";

export function useVoiceSettle() {
  const [status, setStatus] = useState<SettleStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const { writeContractAsync } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Detect if transcript contains a pay intent
  const detectPayIntent = (text: string): boolean => {
    const lower = text.toLowerCase();
    return PAY_TRIGGERS.some((trigger) => lower.includes(trigger));
  };

  // Start listening
  const startListening = useCallback(async () => {
    try {
      setStatus("listening");
      setTranscript("");
      setErrorMsg("");

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
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        await processAudio([...chunksRef.current]);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);

      // Auto-stop after 4 seconds — short command, no need to hold
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 4000);
    } catch (err: any) {
      setErrorMsg(err.name === "NotAllowedError" ? "Mic access denied" : err.message);
      setStatus("error");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // Transcribe and detect intent
  const processAudio = useCallback(async (chunks: Blob[]) => {
    try {
      setStatus("transcribing");

      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || !data.transcript) {
        throw new Error(data.error || "Could not transcribe");
      }

      setTranscript(data.transcript);

      if (detectPayIntent(data.transcript)) {
        setStatus("confirming");
      } else {
        setErrorMsg(`Heard: "${data.transcript}". Say "pay my share" to settle.`);
        setStatus("error");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong");
      setStatus("error");
    }
  }, []);

  // Execute payment: approve → payShare
  const executePayment = useCallback(async (
    billId: bigint,
    amount: number,
    stablecoinAddress: Address,
  ) => {
    try {
      const amountWei = parseUnits(amount.toFixed(18), 18);

      // Step 1: approve
      setStatus("approving");
      await writeContractAsync({
        address: stablecoinAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, amountWei],
      });

      // Step 2: payShare
      setStatus("paying");
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: contractABI.abi,
        functionName: "payShare",
        args: [billId, amountWei],
      });

      setTxHash(hash);
      setStatus("success");
      return hash;
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Payment failed";
      setErrorMsg(msg);
      setStatus("error");
      throw err;
    }
  }, [writeContractAsync]);

  const reset = useCallback(() => {
    setStatus("idle");
    setTranscript("");
    setErrorMsg("");
    setTxHash(undefined);
  }, []);

  return {
    status, transcript, errorMsg, txHash, isSuccess,
    startListening, stopListening, executePayment, reset,
  };
}