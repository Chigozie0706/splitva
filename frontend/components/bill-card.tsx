"use client";

import { ArrowRight, CheckCircle, Clock } from "lucide-react";
import { Bill } from "./homepage";

interface BillCardProps {
  bill: Bill;
  onClick: () => void;
}

export function BillCard({ bill, onClick }: BillCardProps) {
  const paidCount = bill.participants.filter((p) => p.status === "paid").length;
  const totalCount = bill.participants.length;
  const progress = (paidCount / totalCount) * 100;

  const totalCollected = bill.participants.reduce(
    (sum, p) => sum + p.amountPaid,
    0,
  );
  const isOrganizer = bill.organizerId === "user1"; // Mock current user

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="text-gray-900 mb-1">{bill.title}</div>
          <div className="text-gray-500 text-sm">
            {isOrganizer ? "Organized by you" : `By ${bill.organizerName}`}
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-gray-500 text-sm mb-0.5">Total Amount</div>
          <div className="text-gray-900">
            {bill.totalAmount.toLocaleString()} {bill.currency}
          </div>
        </div>
        {bill.status === "completed" ? (
          <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Completed</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              {paidCount}/{totalCount} paid
            </span>
          </div>
        )}
      </div>

      {bill.status === "active" && (
        <>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-gray-500 text-sm">
            {totalCollected.toLocaleString()} {bill.currency} collected
          </div>
        </>
      )}
    </button>
  );
}
