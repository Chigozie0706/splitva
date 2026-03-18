// app/api/resolve-username/route.ts
// Resolves a Farcaster username → verified Ethereum wallet address via Neynar

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    if (!username) {
      return Response.json({ error: "No username provided" }, { status: 400 });
    }

    if (!process.env.NEYNAR_API_KEY) {
      return Response.json(
        { error: "Neynar API key not configured" },
        { status: 500 }
      );
    }

    // Strip leading @ if present
    const clean = username.replace(/^@/, "").trim();

    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(clean)}&limit=5`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[resolve-username] Neynar error:", err);
      return Response.json({ error: "Failed to search user" }, { status: 500 });
    }

    const data = await res.json();
    const users = data.result?.users || [];

    // Find exact username match (search can return partial matches)
    const exactMatch = users.find(
      (u: any) => u.username?.toLowerCase() === clean.toLowerCase()
    );
    const user = exactMatch || users[0];

    if (!user) {
      return Response.json(
        { error: `User @${clean} not found on Farcaster` },
        { status: 404 }
      );
    }

    // Prefer verified eth address, fall back to custody address
    const address =
      user.verified_addresses?.eth_addresses?.[0] || user.custody_address;

    if (!address) {
      return Response.json(
        { error: `@${clean} has no connected wallet address` },
        { status: 404 }
      );
    }

    return Response.json({
      username: user.username,
      displayName: user.display_name,
      pfp: user.pfp_url,
      address,
    });
  } catch (err: any) {
    console.error("[resolve-username] unexpected error:", err);
    return Response.json({ error: "Server error: " + err.message }, { status: 500 });
  }
}