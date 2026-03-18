// app/api/transcribe/route.ts
// Receives audio blob from VoiceSplitAgent, returns transcript via ElevenLabs Scribe v2

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get("audio") as Blob;

    if (!audioBlob) {
      return Response.json({ error: "No audio provided" }, { status: 400 });
    }

    console.log("[transcribe] audio size:", audioBlob.size, "type:", audioBlob.type);

    // Guard: too small means the recorder didn't capture real audio
    if (audioBlob.size < 1000) {
      return Response.json(
        { error: "Recording too short. Please speak for at least 1 second." },
        { status: 400 }
      );
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      console.error("[transcribe] ELEVENLABS_API_KEY is not set");
      return Response.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    // Map MIME type → file extension so ElevenLabs picks the right decoder
    const mimeType = audioBlob.type || "audio/webm";
    const ext = mimeType.includes("mp4")
      ? "mp4"
      : mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("wav")
      ? "wav"
      : "webm";

    const elFormData = new FormData();
    elFormData.append("file", audioBlob, `recording.${ext}`);
    elFormData.append("model_id", "scribe_v2");
    // FIX: ElevenLabs Scribe v2 expects ISO 639-1 two-letter code ("en"), not "eng"
    elFormData.append("language_code", "en");

    console.log("[transcribe] sending to ElevenLabs, ext:", ext);

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: elFormData,
    });

    // Always read body before checking ok so we can log the real error message
    const responseText = await response.text();
    console.log(
      "[transcribe] ElevenLabs status:",
      response.status,
      "body:",
      responseText
    );

    if (!response.ok) {
      return Response.json(
        { error: `ElevenLabs error ${response.status}: ${responseText}` },
        { status: 500 }
      );
    }

    const data = JSON.parse(responseText);

    if (!data.text || data.text.trim() === "") {
      return Response.json(
        { error: "No speech detected. Please speak clearly and try again." },
        { status: 400 }
      );
    }

    return Response.json({ transcript: data.text.trim() });
  } catch (err: any) {
    console.error("[transcribe] unexpected error:", err);
    return Response.json({ error: "Server error: " + err.message }, { status: 500 });
  }
}