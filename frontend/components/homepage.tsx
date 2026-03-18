"use client";

import { useState } from "react";
import { HomeScreen } from "./home-screen";
import { CreateBill } from "./create-bill";
import { BillDetails } from "./bill-details";
import { PayShare } from "./pay-share";

export type Currency = "cUSDm" | "cKES" | "cREAL" | "cEUR";

export type ParticipantStatus = "pending" | "paid" | "overpaid" | "underpaid";

export interface Participant {
  id: string;
  name: string;
  phoneNumber?: string;
  share: number;
  amountPaid: number;
  status: ParticipantStatus;
}

export interface Bill {
  id: string;
  title: string;
  totalAmount: number;
  currency: Currency;
  organizerId: string;
  organizerName: string;
  participants: Participant[];
  status: "active" | "completed";
  createdAt: Date;
}

type Screen = "home" | "create" | "details" | "pay";

export default function Homepage() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [bills, setBills] = useState<Bill[]>([
    {
      id: "1",
      title: "Dinner at KFC",
      totalAmount: 4500,
      currency: "cKES",
      organizerId: "user1",
      organizerName: "You",
      status: "active",
      createdAt: new Date("2024-01-20"),
      participants: [
        {
          id: "p1",
          name: "Alice",
          phoneNumber: "+254712345678",
          share: 1500,
          amountPaid: 1500,
          status: "paid",
        },
        {
          id: "p2",
          name: "Bob",
          phoneNumber: "+254723456789",
          share: 1500,
          amountPaid: 0,
          status: "pending",
        },
        {
          id: "p3",
          name: "Charlie",
          phoneNumber: "+254734567890",
          share: 1500,
          amountPaid: 1400,
          status: "underpaid",
        },
      ],
    },
    {
      id: "2",
      title: "Uber Ride Home",
      totalAmount: 15.5,
      currency: "cUSDm",
      organizerId: "user2",
      organizerName: "Sarah",
      status: "active",
      createdAt: new Date("2024-01-21"),
      participants: [
        {
          id: "p4",
          name: "You",
          share: 5.17,
          amountPaid: 0,
          status: "pending",
        },
        {
          id: "p5",
          name: "Mike",
          share: 5.17,
          amountPaid: 5.17,
          status: "paid",
        },
        {
          id: "p6",
          name: "Emma",
          share: 5.16,
          amountPaid: 5.16,
          status: "paid",
        },
      ],
    },
  ]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    string | null
  >(null);

  const selectedBill = bills.find((b) => b.id === selectedBillId);

  const handleCreateBill = (newBill: Omit<Bill, "id" | "createdAt">) => {
    const bill: Bill = {
      ...newBill,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setBills([bill, ...bills]);
    setCurrentScreen("home");
  };

  const handleSelectBill = (billId: string) => {
    setSelectedBillId(billId);
    setCurrentScreen("details");
  };

  const handlePayShare = (billId: string, participantId: string) => {
    setSelectedBillId(billId);
    setSelectedParticipantId(participantId);
    setCurrentScreen("pay");
  };

  const handlePaymentComplete = (
    billId: string,
    participantId: string,
    amount: number,
  ) => {
    setBills((prevBills) =>
      prevBills.map((bill) => {
        if (bill.id !== billId) return bill;

        const updatedParticipants = bill.participants.map((p) => {
          if (p.id !== participantId) return p;

          const newAmountPaid = p.amountPaid + amount;
          let status: ParticipantStatus = "pending";

          if (newAmountPaid >= p.share) {
            status = newAmountPaid > p.share ? "overpaid" : "paid";
          } else if (newAmountPaid > 0) {
            status = "underpaid";
          }

          return { ...p, amountPaid: newAmountPaid, status };
        });

        return { ...bill, participants: updatedParticipants };
      }),
    );
    setCurrentScreen("details");
  };

  const handleWithdrawFunds = (billId: string) => {
    setBills((prevBills) =>
      prevBills.map((bill) =>
        bill.id === billId ? { ...bill, status: "completed" as const } : bill,
      ),
    );
  };

  const handleBack = () => {
    if (currentScreen === "details" || currentScreen === "create") {
      setCurrentScreen("home");
      setSelectedBillId(null);
    } else if (currentScreen === "pay") {
      setCurrentScreen("details");
      setSelectedParticipantId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {currentScreen === "home" && (
        <HomeScreen
          bills={bills}
          onCreateBill={() => setCurrentScreen("create")}
          onSelectBill={handleSelectBill}
        />
      )}

      {currentScreen === "create" && (
        <CreateBill onBack={handleBack} onCreate={handleCreateBill} />
      )}

      {currentScreen === "details" && selectedBill && (
        <BillDetails
          bill={selectedBill}
          onBack={handleBack}
          onPayShare={handlePayShare}
          onWithdraw={handleWithdrawFunds}
        />
      )}

      {currentScreen === "pay" && selectedBill && selectedParticipantId && (
        <PayShare
          bill={selectedBill}
          participantId={selectedParticipantId}
          onBack={handleBack}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
