"use client";

// homepage.tsx — type definitions only, no mock data
// The actual bill data comes from the blockchain via HomeClient.tsx

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
