"use client";

import { useState } from "react";
import { ArrowLeft, Wallet, ArrowRight, CheckCircle } from "lucide-react";
import { Bill } from "./homepage";

interface PayShareProps {
  bill: Bill;
  participantId: string;
  onBack: () => void;
  onPaymentComplete: (
    billId: string,
    participantId: string,
    amount: number,
  ) => void;
}

export function PayShare({
  bill,
  participantId,
  onBack,
  onPaymentComplete,
}: PayShareProps) {
  const participant = bill.participants.find((p) => p.id === participantId);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  if (!participant) {
    return null;
  }

  const remaining = participant.share - participant.amountPaid;
  const suggestedAmount = remaining > 0 ? remaining : participant.share;

  const handlePayment = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsProcessing(false);
    setIsComplete(true);

    // Wait a moment to show success state
    await new Promise((resolve) => setTimeout(resolve, 1500));

    onPaymentComplete(bill.id, participantId, paymentAmount);
  };

  const handleQuickPay = (quickAmount: number) => {
    setAmount(quickAmount.toFixed(2));
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-gray-900 text-2xl mb-2">Payment Successful!</h2>
          <p className="text-gray-600">
            Your payment of {parseFloat(amount).toFixed(2)} {bill.currency} has
            been processed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
              disabled={isProcessing}
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-gray-900 text-lg">Pay Your Share</h1>
              <p className="text-gray-500 text-sm">{bill.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Bill Summary */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white p-2.5 rounded-full">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-gray-500 text-sm">Your share</div>
              <div className="text-gray-900 text-xl">
                {participant.share.toFixed(2)} {bill.currency}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-100">
            <div>
              <div className="text-gray-500 text-sm mb-0.5">Already paid</div>
              <div className="text-gray-900">
                {participant.amountPaid.toFixed(2)} {bill.currency}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-0.5">Remaining</div>
              <div className="text-gray-900">
                {remaining.toFixed(2)} {bill.currency}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Amount */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <label className="block text-gray-700 mb-3">
            Enter Amount to Pay
          </label>

          <div className="relative mb-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              disabled={isProcessing}
              className="w-full px-4 py-4 pr-16 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-xl disabled:bg-gray-50 disabled:text-gray-500"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
              {bill.currency}
            </div>
          </div>

          {/* Quick Pay Options */}
          <div className="mb-2">
            <div className="text-gray-600 text-sm mb-2">Quick amounts</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickPay(suggestedAmount)}
                disabled={isProcessing}
                className="px-4 py-2.5 border border-emerald-500 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suggestedAmount.toFixed(2)}
              </button>
              <button
                onClick={() => handleQuickPay(participant.share / 2)}
                disabled={isProcessing}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(participant.share / 2).toFixed(2)}
              </button>
              <button
                onClick={() => handleQuickPay(participant.share)}
                disabled={isProcessing}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {participant.share.toFixed(2)}
              </button>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-gray-900">MiniPay Wallet</div>
                <div className="text-gray-500 text-sm">
                  Pay with Mento stablecoins
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={!amount || isProcessing || parseFloat(amount) <= 0}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              <span>Pay with MiniPay</span>
            </>
          )}
        </button>

        <p className="text-center text-gray-500 text-sm mt-4">
          Powered by Mento Protocol • Low fees • Fast confirmation
        </p>
      </div>
    </div>
  );
}
