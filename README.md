# Splitva 🎙️

> Voice-powered group expense splitting on Celo — say it, split it, settle it.

[![Farcaster](https://img.shields.io/badge/Farcaster-Miniapp-8A63D2?style=for-the-badge)](https://farcaster.xyz/miniapps/62-dELE6j2Bt/splitva)

---

## What is Splitva?

Splitva is a **voice-powered group expense splitting agent** built as a Farcaster miniapp on the Celo blockchain. Instead of typing wallet addresses and amounts, users speak naturally:

> _"Dinner was $90, split with @alice and @bob"_

The AI agent transcribes, parses, resolves Farcaster usernames to wallet addresses, and creates the bill on-chain — all with one tap to confirm. Participants settle their share by voice or manually through the app.

---

## Features

### 🎙️ Voice-First Interface

- Speak naturally to describe any expense
- AI parses equal, custom, percentage, and itemized splits
- Agent speaks confirmations back via text-to-speech
- Retry or switch to manual entry at any point

### 🤖 Agentic Bill Creation

- AI resolves `@farcaster` usernames → wallet addresses automatically
- One tap creates the bill on Celo — no form filling
- Manual review fallback for full control before submitting

### 💸 Flexible Settlement

- Voice settle: say "pay my share" → agent executes approve + transfer
- Manual settle: tap Pay button for the traditional flow
- Organizer withdraws collected funds once all participants have paid

### ⛓️ On-Chain & Stablecoin-Native

- Bills stored permanently on Celo Mainnet
- Supports cUSDm 💵, cKES 🇰🇪, cREAL 🇧🇷, cEUR 🇪🇺
- Sub-second finality, ~$0.001 gas fees

### 📱 Farcaster Miniapp

- Launches directly inside Warpcast — no separate app install
- Automatic wallet connection via Farcaster SDK
- Any cast with the Splitva URL becomes a launchable miniapp card

---

## How It Works

```
1. 🎙️  User speaks   →  "Dinner $90 split with @alice and @bob"
2. 📝  Transcribe    →  ElevenLabs Scribe v2 converts speech to text
3. 🧠  AI Parse      →  Gemini 2.5 Flash Lite extracts bill structure
4. 🔍  Resolve       →  @alice, @bob → wallet addresses via Farcaster Hub
5. 🔊  Confirm       →  ElevenLabs TTS speaks the split back to user
6. ⚡  Create        →  Agent calls createBill() on Celo smart contract
7. 💳  Settle        →  Participants pay by voice or manual tap
8. 💰  Withdraw      →  Organizer collects funds once all paid
```

---

## Tech Stack

| Layer               | Technology                                              |
| ------------------- | ------------------------------------------------------- |
| Framework           | Next.js 14 (App Router)                                 |
| Blockchain          | Celo Mainnet (EVM L2)                                   |
| Smart Contract      | Solidity 0.8.19 — SplitPay.sol                          |
| Wallet              | wagmi v2 + Farcaster miniapp SDK                        |
| Voice Input (STT)   | ElevenLabs Scribe v2                                    |
| Voice Output (TTS)  | ElevenLabs eleven_turbo_v2_5                            |
| AI Parsing          | Google Gemini 2.5 Flash Lite                            |
| Identity Resolution | Farcaster Hub via Pinata (free, no API key)             |
| Stablecoins         | Mento Protocol (cUSDm, cKES, cREAL, cEUR)               |
| Deployment          | Vercel                                                  |
| Styling             | Tailwind CSS + custom dark glass-morphism design system |

---

## Smart Contract

**SplitPay.sol** — deployed on Celo Mainnet

```
Address: 0x9C00E479dBD8d0dFf5b87Fc097D6039aBB661217
```

| Function          | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `createBill()`    | Create a bill with participants and shares on-chain    |
| `payShare()`      | Participant pays their portion via ERC20 transfer      |
| `withdrawFunds()` | Organizer withdraws collected funds after all pay      |
| `getBillStatus()` | Read payment status of all participants                |
| `getUserBills()`  | Fetch all bills for a wallet address                   |
| `updateShare()`   | Organizer updates a participant's share before payment |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- A Celo-compatible wallet (MiniPay, MetaMask, etc.)

### Installation

```bash
git clone https://github.com/yourusername/splitva
cd splitva/apps/frontend
pnpm install
```

### Environment Variables

Create `.env.local` in `apps/frontend/`:

```env
# App
NEXT_PUBLIC_URL=https://splitva.vercel.app

# ElevenLabs — voice input (STT) + voice output (TTS)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM   # optional, defaults to Rachel

# Google Gemini — AI bill parsing
GEMINI_API_KEY=your_gemini_api_key

# Neynar — optional, for enhanced Farcaster user lookup
NEYNAR_API_KEY=your_neynar_api_key
```

### Run Locally

```bash
pnpm dev
# App runs at http://localhost:3000
```

> **Note:** ElevenLabs STT blocks requests from ngrok/VPN tunnels on the free tier.
> For full voice testing, deploy to Vercel and test at your live URL.

### Deploy to Vercel

```bash
# Set root directory to apps/frontend in Vercel dashboard
# Add all environment variables in Vercel dashboard
git push origin main  # Vercel auto-deploys on push
```

---

## Project Structure

```
apps/
└── frontend/
    ├── app/
    │   ├── api/
    │   │   ├── transcribe/     # ElevenLabs STT route
    │   │   ├── speak/          # ElevenLabs TTS route
    │   │   └── parse-bill/     # Gemini AI parsing + username resolution
    │   ├── bill/[id]/          # Bill details + settlement page
    │   ├── create-bill/        # Voice agent + manual bill creation
    │   └── page.tsx            # Home screen with bill list
    ├── components/
    │   ├── VoiceSplitAgent.tsx # Core voice agent UI
    │   ├── VoiceSettleButton.tsx # Floating voice settle orb
    │   ├── home-screen.tsx     # Bills list + stats
    │   ├── bill-details.tsx    # Bill view + pay/withdraw
    │   └── create-bill.tsx     # Manual bill creation form
    ├── hooks/
    │   ├── useBillAgent.ts     # Agentic createBill execution
    │   ├── usePayShare.ts      # ERC20 approve + payShare
    │   └── useVoiceSettle.ts   # Voice-triggered settlement
    └── contract/
        └── abi.json            # SplitPay contract ABI
```

---

## API Routes

### `POST /api/transcribe`

Receives audio blob → returns transcript via ElevenLabs Scribe v2.

### `POST /api/speak`

Receives text → returns audio stream via ElevenLabs TTS.

### `POST /api/parse-bill`

Receives transcript + user address → parses expense via Gemini → resolves @usernames to wallet addresses via Farcaster Hub → returns structured bill JSON.

---

## Farcaster Miniapp Setup

The app is configured as a Farcaster miniapp via `public/.well-known/farcaster.json`:

```json
{
  "accountAssociation": { ... },
  "frame": {
    "version": "1",
    "name": "Splitva",
    "iconUrl": "https://splitva.vercel.app/images/splash.png",
    "splashImageUrl": "https://splitva.vercel.app/images/splash.png",
    "splashBackgroundColor": "#0e0e12",
    "homeUrl": "https://splitva.vercel.app",
    "webhookUrl": "https://splitva.vercel.app/api/webhook"
  }
}
```

To set up your own domain:

1. Go to [farcaster.xyz/~/developers](https://farcaster.xyz/~/developers)
2. Sign your domain manifest
3. Replace the `accountAssociation` values in `farcaster.json`

---

## Why Celo?

- **Sub-second finality** — bill creation confirms in ~1 second
- **~$0.001 gas fees** — micropayments are economically viable
- **Stablecoin-native** — Mento stablecoins eliminate price volatility
- **Mobile-first** — built for everyday payments in emerging markets
- **700K+ daily active users** — real distribution through MiniPay

---

## Roadmap

- [ ] Multi-event balance tracking ("Bob owes $25 across 3 dinners")
- [ ] Telegram + WhatsApp bot integration for group chats
- [ ] Automatic currency conversion based on user location
- [ ] Push notifications when participants pay
- [ ] Protocol fee for sustainable revenue
- [ ] Support for recurring group expenses (rent, subscriptions)

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

```bash
git checkout -b feature/your-feature
git commit -m "add your feature"
git push origin feature/your-feature
```

---

## License

MIT

---

## Acknowledgements

- [ElevenLabs](https://elevenlabs.io) — voice AI
- [Google Gemini](https://ai.google.dev) — natural language parsing
- [Celo](https://celo.org) — the blockchain
- [Mento Protocol](https://mento.org) — stablecoins
- [Farcaster](https://farcaster.xyz) — social distribution
- [Pinata](https://pinata.cloud) — Farcaster Hub API

---

<div align="center">
  Built for the <strong>Celo Agentic Hackathon 2025</strong> 🏆
  <br />
  <a href="https://splitva.vercel.app">splitva.vercel.app</a>
</div>
