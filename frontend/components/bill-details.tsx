"use client";

import { ArrowLeft, Download, Share2, CheckCircle } from "lucide-react";
import { useAccount } from "wagmi";
import { Bill } from "./homepage";
import { ParticipantCard } from "./participant-card";

interface BillDetailsProps {
  bill: Bill;
  onBack: () => void;
  onPayShare: (billId: string, participantId: string) => void;
  onWithdraw: (billId: string) => void;
}

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
  const allPaid = paidCount === bill.participants.length;
  const progress = (totalCollected / bill.totalAmount) * 100;

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: bill.title, url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const handleWithdraw = () => {
    if (
      window.confirm(
        `Withdraw ${totalCollected.toFixed(2)} ${
          bill.currency
        } to your wallet?`,
      )
    ) {
      onWithdraw(bill.id);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 sm:px-6 pt-6 pb-32 sm:pb-36">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-full transition-colors -ml-2 mb-4"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="mb-6">
            <h1 className="text-white text-2xl mb-2">{bill.title}</h1>
            <div className="flex items-center gap-2">
              <span className="text-emerald-50 text-sm">
                {isOrganizer ? "Organized by you" : `By ${bill.organizerName}`}
              </span>
              {bill.status === "completed" && (
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3 text-white" />
                  <span className="text-white text-xs">Completed</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full hover:bg-white/30 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-sm">Share Bill</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-24 sm:-mt-28">
        {/* Amount Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="text-center mb-6">
            <div className="text-gray-500 text-sm mb-1">Total Amount</div>
            <div className="text-gray-900 text-3xl sm:text-4xl mb-1">
              {bill.totalAmount.toLocaleString()}{" "}
              <span className="text-2xl sm:text-3xl">{bill.currency}</span>
            </div>
            <div className="text-emerald-600">
              {totalCollected.toLocaleString()} {bill.currency} collected
            </div>
          </div>

          {bill.status === "active" && (
            <>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="text-center text-gray-500 text-sm">
                {paidCount} of {bill.participants.length} paid
              </div>
            </>
          )}

          {/* Withdraw Button — organizer only, bill must be completed */}
          {isOrganizer &&
            bill.status === "completed" &&
            !bill.participants.every((p) => p.amountPaid === 0) && (
              <button
                onClick={handleWithdraw}
                className="w-full mt-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>Withdraw to Wallet</span>
              </button>
            )}

          {/* Waiting message — organizer, bill still active */}
          {isOrganizer && bill.status === "active" && (
            <div className="mt-6 py-3 px-4 rounded-xl bg-gray-100 text-gray-500 text-sm text-center">
              Waiting for all participants to pay before withdrawal
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="mb-6">
          <h2 className="text-gray-900 font-semibold mb-4">
            Participants ({bill.participants.length})
          </h2>
          <div className="space-y-3">
            {bill.participants.map((participant) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                currency={bill.currency}
                billStatus={bill.status}
                currentAddress={address}
                onPay={() => onPayShare(bill.id, participant.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
