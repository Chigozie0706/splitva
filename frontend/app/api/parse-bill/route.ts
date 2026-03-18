// app/api/parse-bill/route.ts
// Parses voice transcript via Gemini, resolves @usernames via free Farcaster Hub API

export async function POST(req: Request) {
  try {
    const { transcript, userAddress } = await req.json();

    if (!transcript) {
      return Response.json({ error: "No transcript provided" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const systemPrompt = `You are a smart bill-splitting agent for a crypto payments app on Celo.
Parse the user's voice input about splitting expenses and return ONLY valid JSON with no markdown.

The user's own wallet address is: ${userAddress || "unknown"}

Extract and return this exact shape:
{
  "title": "short bill name (e.g. Dinner, Uber, Groceries)",
  "totalAmountDisplay": "human readable (e.g. $120.00)",
  "totalAmount": number in dollars (e.g. 120),
  "participants": [
    {
      "address": "use one of: the user's actual address if they say 'me'/'I', OR '@username' if they mention a Farcaster handle, OR '0xABC...' if a real address is given, OR '0xPENDING' if unknown",
      "shareDisplay": "$X.XX",
      "share": number in dollars
    }
  ],
  "confirmation": "natural spoken confirmation. For @usernames say the handle not the address. E.g. Got it! Splitting $90 between you, @alice and @bob at $30 each. Should I create this bill?"
}

Rules:
- Shares must add up to totalAmount exactly
- Equal split if no amounts specified
- If someone says 'split with @alice and @bob', create 3 participants: me + @alice + @bob
- Preserve @usernames exactly as spoken — do NOT replace them with addresses
- Return ONLY JSON, no explanation, no markdown fences`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: transcript }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1000 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("[parse-bill] Gemini API error:", err);
      return Response.json({ error: "Parsing failed" }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!raw) {
      return Response.json({ error: "Empty response from AI" }, { status: 500 });
    }

    let parsed: any;
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
      console.log("[parse-bill] participants:", JSON.stringify(parsed.participants));
    } catch {
      console.error("[parse-bill] Failed to parse Gemini response:", raw);
      return Response.json(
        { error: "Could not understand the bill. Please try rephrasing." },
        { status: 400 }
      );
    }

    // Resolve @username participants → wallet addresses via free Farcaster API
    // Uses Pinata's public Farcaster hub — no API key required
    if (parsed.participants) {
      const resolved = await Promise.all(
        parsed.participants.map(async (p: any) => {
          if (typeof p.address === "string" && p.address.startsWith("@")) {
            const username = p.address.replace(/^@/, "").trim().toLowerCase();
            try {
              // Step 1: get FID from username using Pinata public hub (free, no key)
              const fidRes = await fetch(
                `https://hub.pinata.cloud/v1/userNameProofByName?name=${encodeURIComponent(username)}`
              );

              if (!fidRes.ok) {
                console.error(`[parse-bill] FID lookup failed for @${username}:`, fidRes.status);
                return { ...p, address: "0xPENDING", resolvedFrom: p.address };
              }

              const fidData = await fidRes.json();
              console.log(`[parse-bill] FID data for @${username}:`, JSON.stringify(fidData)); 
              const fid = fidData?.data?.usernameProofBody?.fid || fidData?.fid;

              if (!fid) {
                console.error(`[parse-bill] No FID found for @${username}`);
                return { ...p, address: "0xPENDING", resolvedFrom: p.address };
              }

              // Step 2: get verified addresses for this FID
              const addrRes = await fetch(
                `https://hub.pinata.cloud/v1/verificationsByFid?fid=${fid}`
              );

              if (addrRes.ok) {
                const addrData = await addrRes.json();

                console.log(`[parse-bill] addr data for fid ${fid}:`, JSON.stringify(addrData)); 

                const messages = addrData?.messages || [];


const ethVerification = messages.find((m: any) => {
  const body = m?.data?.verificationAddAddressBody;
  return (
    body?.protocol === "PROTOCOL_ETHEREUM" &&
    typeof body?.address === "string" &&
    body.address.startsWith("0x")
  );
});
const address = ethVerification?.data?.verificationAddAddressBody?.address;

                if (address) {
                  console.log(`[parse-bill] Resolved @${username} → ${address}`);
                  return { ...p, address, resolvedFrom: p.address };
                }
              }

              // No verified address — fall back to custody address
              const custodyRes = await fetch(
                `https://hub.pinata.cloud/v1/custodyAddressByFid?fid=${fid}`
              );

              if (custodyRes.ok) {
                const custodyData = await custodyRes.json();
                const address = custodyData?.custodyAddress;
                if (address) {
                  console.log(`[parse-bill] Resolved @${username} → custody ${address}`);
                  return { ...p, address, resolvedFrom: p.address };
                }
              }

              return { ...p, address: "0xPENDING", resolvedFrom: p.address };
            } catch (e) {
              console.error(`[parse-bill] Resolution error for @${username}:`, e);
              return { ...p, address: "0xPENDING", resolvedFrom: p.address };
            }
          }
          return p;
        })
      );
      parsed.participants = resolved;
    }

    return Response.json(parsed);
  } catch (err: any) {
    console.error("[parse-bill] unexpected error:", err);
    return Response.json({ error: "Server error: " + err.message }, { status: 500 });
  }
}