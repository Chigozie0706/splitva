"use client";

import { CheckCircle, Clock, AlertCircle, ArrowUp } from "lucide-react";
import { Participant, Currency } from "./homepage";

interface ParticipantCardProps {
  participant: Participant;
  currency: Currency;
  billStatus: "active" | "completed";
  currentAddress?: string;
  onPay: () => void;
}

export function ParticipantCard({
  participant,
  currency,
  billStatus,
  currentAddress,
  onPay,
}: ParticipantCardProps) {
  const getStatusInfo = () => {
    switch (participant.status) {
      case "paid":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-600",
          label: "Paid",
        };
      case "pending":
        return {
          icon: <Clock className="w-5 h-5" />,
          bgColor: "bg-amber-50",
          textColor: "text-amber-600",
          label: "Pending",
        };
      case "underpaid":
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          bgColor: "bg-orange-50",
          textColor: "text-orange-600",
          label: "Underpaid",
        };
      case "overpaid":
        return {
          icon: <ArrowUp className="w-5 h-5" />,
          bgColor: "bg-blue-50",
          textColor: "text-blue-600",
          label: "Overpaid",
        };
    }
  };

  const statusInfo = getStatusInfo();
  const remaining = participant.share - participant.amountPaid;

  // Check if this card belongs to the connected wallet
  const isCurrentUser =
    !!currentAddress &&
    participant.id.toLowerCase() === currentAddress.toLowerCase();

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-4 ${
        isCurrentUser ? "ring-2 ring-emerald-400" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-gray-900 mb-0.5">{participant.name}</div>
            {isCurrentUser && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                You
              </span>
            )}
          </div>
          {participant.phoneNumber && (
            <div className="text-gray-400 text-sm">
              {participant.phoneNumber}
            </div>
          )}
          <div className="text-gray-400 text-xs font-mono mt-0.5">
            {participant.id.slice(0, 6)}...{participant.id.slice(-4)}
          </div>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusInfo.bgColor}`}
        >
          <div className={statusInfo.textColor}>{statusInfo.icon}</div>
          <span className={`text-sm ${statusInfo.textColor}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-gray-500 text-sm mb-0.5">Share</div>
          <div className="text-gray-900">
            {participant.share.toFixed(2)} {currency}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-sm mb-0.5">Paid</div>
          <div className="text-gray-900">
            {participant.amountPaid.toFixed(2)} {currency}
          </div>
        </div>
      </div>

      {participant.status !== "paid" && remaining > 0 && (
        <div className="bg-gray-50 px-3 py-2 rounded-lg mb-3">
          <div className="text-gray-500 text-sm">Remaining</div>
          <div className="text-gray-900 font-medium">
            {remaining.toFixed(2)} {currency}
          </div>
        </div>
      )}

      {participant.status === "overpaid" && (
        <div className="bg-blue-50 px-3 py-2 rounded-lg mb-3">
          <div className="text-blue-600 text-sm">
            Overpaid by{" "}
            {(participant.amountPaid - participant.share).toFixed(2)} {currency}
          </div>
        </div>
      )}

      {/* Only show Pay button for the current user's card */}
      {isCurrentUser &&
        billStatus === "active" &&
        participant.status !== "paid" && (
          <button
            onClick={onPay}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg transition-colors font-medium"
          >
            Pay {remaining.toFixed(2)} {currency}
          </button>
        )}
    </div>
  );
}
