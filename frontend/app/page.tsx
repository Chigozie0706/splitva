import { Metadata } from "next";
import { env } from "@/lib/env";
import HomeClient from "./HomeClient";

const appUrl = env.NEXT_PUBLIC_URL;

const frame = {
  version: "next",
  imageUrl: `${appUrl}/images/feed.png`,
  button: {
    title: "Open splitva",
    action: {
      type: "launch_frame",
      name: "Splitva",
      url: appUrl,
      splashImageUrl: `${appUrl}/images/splash.png`,
      splashBackgroundColor: "#10b981",
    },
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "splitva",
    openGraph: {
      title: "splitva",
      description: "Split bills with Mento stablecoins on Celo",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function Page() {
  return <HomeClient />;
}
