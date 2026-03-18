"use client";

import { Plus, ArrowRight, Mic } from "lucide-react";
import { Bill } from "./homepage";
import { BillCard } from "./bill-card";
import { useRouter } from "next/navigation";

interface HomeScreenProps {
  bills: Bill[];
  onCreateBill: () => void;
  onSelectBill: (billId: string) => void;
}

export function HomeScreen({
  bills,
  onCreateBill,
  onSelectBill,
}: HomeScreenProps) {
  const router = useRouter();
  const activeBills = bills.filter((b) => b.status === "active");
  const completedBills = bills.filter((b) => b.status === "completed");

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 sm:px-6 pt-8 pb-24 sm:pb-28">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-white text-2xl sm:text-3xl mb-1">SplitPay</h1>
              <p className="text-emerald-50 text-sm sm:text-base">
                Split bills with Mento stablecoins
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="text-white text-sm">MiniPay</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20">
        {/* Create Bill Button — fixed: no button-inside-button, proper layout */}
        <button
          onClick={() => router.push("/create_bill")}
          className="w-full bg-white rounded-2xl shadow-lg p-6 mb-4 flex items-center justify-between hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-full">
              <Plus className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-left">
              <div className="text-gray-900 font-medium mb-0.5">
                Create New Bill
              </div>
              <div className="text-gray-500 text-sm">
                Split expenses with friends
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Voice Agent shortcut */}
        <button
          onClick={() => router.push("/create_bill")}
          className="w-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 mb-6 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="bg-purple-100 p-3 rounded-full">
            <Mic className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left flex-1">
            <div className="text-purple-900 font-medium text-sm mb-0.5">
              🤖 Voice Agent
            </div>
            <div className="text-purple-500 text-xs">
              "Dinner $90 split with @alice and @bob"
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-purple-400" />
        </button>

        {/* Active Bills */}
        {activeBills.length > 0 && (
          <div className="mb-8">
            <h2 className="text-gray-900 font-semibold mb-4">
              Active Bills ({activeBills.length})
            </h2>
            <div className="space-y-3">
              {activeBills.map((bill) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onClick={() => onSelectBill(bill.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Bills */}
        {completedBills.length > 0 && (
          <div className="mb-8">
            <h2 className="text-gray-900 font-semibold mb-4">Completed</h2>
            <div className="space-y-3">
              {completedBills.map((bill) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onClick={() => onSelectBill(bill.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {bills.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">No bills yet</h3>
            <p className="text-gray-500 text-sm mb-6">
              Create your first bill to get started
            </p>
            <button
              onClick={() => router.push("/create-bill")}
              className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
            >
              Create Bill
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
