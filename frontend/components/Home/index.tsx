"use client";

import { useSignIn } from "@/hooks/use-sign-in";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const { signIn, isLoading, isSignedIn, user } = useSignIn({
    autoSignIn: true,
  });
  const [testResult, setTestResult] = useState<string>("");
  const { address } = useAccount();

  // Redirect to home if already signed in
  useEffect(() => {
    if (isSignedIn) {
      router.push("/home");
    }
  }, [isSignedIn, router]);

  const testAuth = async () => {
    try {
      const res = await fetch("/api/test", {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setTestResult(`Auth test failed: ${data.error}`);
        return;
      }

      setTestResult(`Auth test succeeded! Server response: ${data.message}`);
    } catch (error) {
      setTestResult(
        "Auth test failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  // Show loading while checking auth or redirecting
  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          {/* Logo/Brand */}
          <div className="text-center space-y-2">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-4xl">💸</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">SplitPay</h1>
            <p className="text-gray-600">Split bills with Mento stablecoins</p>
          </div>

          {/* Status Messages */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className="text-sm font-medium text-orange-600">
                ○ Not signed in
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Wallet:</span>
              <span className="text-sm font-mono text-gray-900">
                {address
                  ? `${address.substring(0, 6)}...${address.substring(
                      address.length - 4,
                    )}`
                  : "Not connected"}
              </span>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            onClick={signIn}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-4 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign in with Farcaster"
            )}
          </button>

          {/* Features */}
          <div className="pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-4">
              Why SplitPay?
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl">⚡</span>
                </div>
                <p className="text-xs text-gray-700 font-medium">Fast</p>
              </div>
              <div className="text-center">
                <div className="bg-teal-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl">🔒</span>
                </div>
                <p className="text-xs text-gray-700 font-medium">Secure</p>
              </div>
              <div className="text-center">
                <div className="bg-cyan-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl">💰</span>
                </div>
                <p className="text-xs text-gray-700 font-medium">Fair</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-6 opacity-90">
          Powered by Celo · Built on Farcaster
        </p>
      </div>
    </div>
  );
}
