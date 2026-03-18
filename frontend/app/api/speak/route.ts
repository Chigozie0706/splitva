// app/api/speak/route.ts
// Receives text → returns ElevenLabs TTS audio stream (corrected)

import { NextRequest, NextResponse } from "next/server";

const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // ElevenLabs "George" - clear, natural voice
// Change to any voice ID from your ElevenLabs account

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5", // lowest latency — best for voice agent use
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("TTS error:", error);
      return NextResponse.json({ error: "TTS failed" }, { status: 500 });
    }

    // Stream the audio back to the client
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("Speak route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}