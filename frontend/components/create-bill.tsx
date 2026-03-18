"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  X,
  Users,
  Wallet,
  Phone,
  AlertCircle,
  CheckCircle,
  Loader2,
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
  cKES: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
  cREAL: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
  cEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
};

const CONTRACT_ADDRESS: Address = "0xE47aa208f9B59b5857E6c54a5198a9a40F4c90C7";

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
    // FIX: if voice gave custom shares use manual, otherwise equal
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

  const addParticipant = () => {
    setParticipants([
      ...participants,
      {
        id: Date.now().toString(),
        name: "",
        phoneNumber: "",
        wallet: "",
        share: 0,
      },
    ]);
  };

  const handleBack = () => {
    const hasData =
      title || totalAmount || participants.some((p) => p.name || p.wallet);
    if (hasData && !isProcessing) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to go back?",
        )
      ) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const removeParticipant = (id: string) => {
    if (participants.length > 1)
      setParticipants(participants.filter((p) => p.id !== id));
  };

  const updateParticipant = (
    id: string,
    field: keyof ParticipantInput,
    value: string | number,
  ) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  // FIX: only recalculate equal shares when user hasn't manually set them
  useEffect(() => {
    if (splitMethod === "equal" && totalAmount) {
      const amount = parseFloat(totalAmount) || 0;
      const share = amount / participants.length;
      setParticipants((prev) => prev.map((p) => ({ ...p, share })));
    }
  }, [totalAmount, participants.length, splitMethod]);

  const validateForm = () => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return false;
    }
    if (!title.trim()) {
      setError("Please enter a bill title");
      return false;
    }
    if (!totalAmount) {
      setError("Please enter the total amount");
      return false;
    }
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return false;
    }

    // FIX: name validation — warn user to fill in name if empty
    if (participants.some((p) => !p.name.trim())) {
      setError(
        "Please enter a name for all participants (tip: you can use their address as the name)",
      );
      return false;
    }

    for (const p of participants) {
      if (!p.wallet.trim()) {
        setError(`Please enter wallet address for ${p.name || "participant"}`);
        return false;
      }
      if (!p.wallet.startsWith("0x") || p.wallet.length !== 42) {
        setError(`Invalid wallet address for ${p.name}`);
        return false;
      }
    }

    if (splitMethod === "manual") {
      const totalShares = participants.reduce(
        (sum, p) => sum + (p.share || 0),
        0,
      );
      if (Math.abs(totalShares - amount) > 0.01) {
        setError(
          `Shares total (${totalShares.toFixed(
            2,
          )}) must equal bill total (${amount.toFixed(2)})`,
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
    let finalParticipants = participants;
    if (splitMethod === "equal") {
      const share = amount / participants.length;
      finalParticipants = participants.map((p) => ({ ...p, share }));
    }

    try {
      const stablecoinAddress = STABLECOIN_ADDRESSES[currency];
      const totalAmountWei = parseUnits(amount.toString(), 18);
      const participantsData = finalParticipants.map((p) => ({
        wallet: p.wallet as Address,
        share: parseUnits(p.share.toString(), 18),
        name: p.name,
        phoneNumber: p.phoneNumber || "0", // FIX: contract requires non-empty string
      }));

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI.abi,
        functionName: "createBill",
        args: [title, totalAmountWei, stablecoinAddress, participantsData],
      });
    } catch (err: any) {
      setError(err.message || "Failed to create bill. Please try again.");
    }
  };

  useEffect(() => {
    if (isSuccess && hash) {
      setShowSuccess(true);
      setTimeout(() => onBack(), 2000);
    }
  }, [isSuccess, hash]);

  useEffect(() => {
    if (writeError) setError(writeError.message || "Transaction failed");
  }, [writeError]);

  const canSubmit =
    title &&
    totalAmount &&
    participants.every((p) => p.name && p.wallet) &&
    !isProcessing;

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              disabled={isProcessing}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2 disabled:opacity-50"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1">
              <h1 className="text-gray-900 text-lg font-semibold">
                Create New Bill
              </h1>
              <p className="text-gray-500 text-sm">
                Split expenses with friends
              </p>
            </div>
            {!isConnected && (
              <div className="bg-orange-100 text-orange-800 text-xs px-3 py-1 rounded-full">
                Not connected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bill Created!
            </h2>
            <p className="text-gray-600 mb-4">
              Your bill has been created successfully
            </p>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Transaction Hash:</p>
              <p className="text-xs font-mono text-gray-900 break-all">
                {hash?.substring(0, 10)}...{hash?.substring(hash.length - 8)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isPending ? "Confirm in wallet..." : "Processing transaction..."}
            </h3>
            <p className="text-sm text-gray-600">
              {isPending
                ? "Please confirm the transaction in your wallet"
                : "Waiting for blockchain confirmation..."}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 text-sm font-medium">Error</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bill Details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
            <span className="text-emerald-600">📝</span> Bill Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Bill Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Dinner at KFC"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                disabled={isProcessing}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Total Amount *
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Currency *
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
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
        </div>

        {/* Split Method */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
            <span className="text-emerald-600">⚖️</span> Split Method
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSplitMethod("equal")}
              disabled={isProcessing}
              className={`p-4 rounded-xl border-2 transition-all ${
                splitMethod === "equal"
                  ? "border-emerald-500 bg-emerald-50 shadow-md"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              } disabled:opacity-50`}
            >
              <Users
                className={`w-6 h-6 mx-auto mb-2 ${
                  splitMethod === "equal" ? "text-emerald-600" : "text-gray-400"
                }`}
              />
              <div
                className={`text-sm font-medium ${
                  splitMethod === "equal" ? "text-emerald-900" : "text-gray-700"
                }`}
              >
                Equal Split
              </div>
              <div className="text-xs text-gray-500 mt-1">Divide equally</div>
            </button>
            <button
              onClick={() => setSplitMethod("manual")}
              disabled={isProcessing}
              className={`p-4 rounded-xl border-2 transition-all ${
                splitMethod === "manual"
                  ? "border-emerald-500 bg-emerald-50 shadow-md"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              } disabled:opacity-50`}
            >
              <div
                className={`text-2xl mx-auto mb-2 ${
                  splitMethod === "manual"
                    ? "text-emerald-600"
                    : "text-gray-400"
                }`}
              >
                ✏️
              </div>
              <div
                className={`text-sm font-medium ${
                  splitMethod === "manual"
                    ? "text-emerald-900"
                    : "text-gray-700"
                }`}
              >
                Custom
              </div>
              <div className="text-xs text-gray-500 mt-1">Set amounts</div>
            </button>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 font-semibold flex items-center gap-2">
              <span className="text-emerald-600">👥</span> Participants (
              {participants.length})
            </h2>
            <button
              onClick={addParticipant}
              disabled={isProcessing}
              className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Person</span>
            </button>
          </div>

          <div className="space-y-4">
            {participants.map((participant, index) => (
              <div
                key={participant.id}
                className="border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-emerald-100 to-teal-100 w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-emerald-700">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-gray-700 text-sm font-medium">
                      Person {index + 1}
                    </span>
                  </div>
                  {participants.length > 1 && (
                    <button
                      onClick={() => removeParticipant(participant.id)}
                      disabled={isProcessing}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group disabled:opacity-50"
                    >
                      <X className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-600 text-xs font-medium mb-2">
                      NAME *
                    </label>
                    <input
                      type="text"
                      value={participant.name}
                      onChange={(e) =>
                        updateParticipant(
                          participant.id,
                          "name",
                          e.target.value,
                        )
                      }
                      placeholder="e.g. Alice or 0x1234..."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-gray-600 text-xs font-medium">
                        WALLET ADDRESS *
                      </span>
                    </div>
                    <input
                      type="text"
                      value={participant.wallet}
                      onChange={(e) =>
                        updateParticipant(
                          participant.id,
                          "wallet",
                          e.target.value,
                        )
                      }
                      placeholder="0x..."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-mono transition-all"
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-gray-600 text-xs font-medium">
                        PHONE (OPTIONAL)
                      </span>
                    </div>
                    <input
                      type="tel"
                      value={participant.phoneNumber}
                      onChange={(e) =>
                        updateParticipant(
                          participant.id,
                          "phoneNumber",
                          e.target.value,
                        )
                      }
                      placeholder="+1234567890"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                      disabled={isProcessing}
                    />
                  </div>

                  {splitMethod === "manual" && (
                    <div>
                      <label className="block text-gray-600 text-xs font-medium mb-2">
                        AMOUNT TO PAY *
                      </label>
                      <input
                        type="number"
                        value={participant.share || ""}
                        onChange={(e) =>
                          updateParticipant(
                            participant.id,
                            "share",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                        disabled={isProcessing}
                      />
                    </div>
                  )}

                  {splitMethod === "equal" && totalAmount && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-emerald-700 text-sm font-medium">
                        Share amount:
                      </span>
                      <span className="text-emerald-900 text-lg font-bold">
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
        {totalAmount && (
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Bill Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="opacity-90">Total Amount:</span>
                <span className="font-bold text-xl">
                  {parseFloat(totalAmount).toFixed(2)} {currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-90">Participants:</span>
                <span className="font-semibold">
                  {participants.length} people
                </span>
              </div>
              {splitMethod === "equal" && (
                <div className="flex justify-between pt-2 border-t border-white/20">
                  <span className="opacity-90">Per Person:</span>
                  <span className="font-bold">
                    {(parseFloat(totalAmount) / participants.length).toFixed(2)}{" "}
                    {currency}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4 sm:-mx-6">
          <button
            onClick={handleCreate}
            disabled={!canSubmit}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Creating Bill...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" /> Create Bill
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
