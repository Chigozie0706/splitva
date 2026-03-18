// lib/neynar.ts
import { env } from "@/lib/env";
import { neynarUserCache } from "./cache";

export interface NeynarUser {
  fid: string;
  username: string;
  display_name: string;
  pfp_url: string;
  custody_address: string;
  verifications: string[];
}

export const fetchUser = async (fid: string): Promise<NeynarUser> => {
  // Check cache first
  const cached = neynarUserCache.get(fid);
  if (cached) {
    console.log(`✅ Cache hit for user ${fid}`);
    return cached;
  }

  console.log(`🔍 Fetching user ${fid} from Neynar API`);

  const response = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
    {
      headers: {
        "x-api-key": env.NEYNAR_API_KEY!,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Failed to fetch Farcaster user on Neynar", errorData);

    // Check if it's a rate limit error
    if (errorData.code === "RateLimitExceeded") {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    throw new Error("Failed to fetch Farcaster user on Neynar");
  }

  const data = await response.json();
  const user = data.users[0];

  // Cache the result
  neynarUserCache.set(fid, user);
  console.log(`💾 Cached user ${fid}`);

  return user;
};