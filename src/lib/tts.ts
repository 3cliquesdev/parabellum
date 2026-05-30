import { GoogleAuth } from "google-auth-library";

const TTS_API = "https://texttospeech.googleapis.com/v1/text:synthesize";

const VOICES: Record<string, { languageCode: string; name: string }> = {
  "pt-BR-feminina":  { languageCode: "pt-BR", name: "pt-BR-Wavenet-A" },
  "pt-BR-masculina": { languageCode: "pt-BR", name: "pt-BR-Wavenet-B" },
  "pt-BR-feminina-2":{ languageCode: "pt-BR", name: "pt-BR-Wavenet-C" },
};

async function getTTSToken(): Promise<string> {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  return (await client.getAccessToken()).token!;
}

export async function textToSpeech(text: string, voice: string = "pt-BR-feminina"): Promise<Buffer | null> {
  try {
    const token = await getTTSToken();
    const voiceConfig = VOICES[voice] ?? VOICES["pt-BR-feminina"];

    // Limitar texto para não exceder quota (5000 chars)
    const truncated = text.slice(0, 4500);

    const body = {
      input: { text: truncated },
      voice: voiceConfig,
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.0,
        pitch: 0,
      },
    };

    const res = await fetch(TTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("TTS error:", await res.text());
      return null;
    }

    const data = await res.json();
    if (!data.audioContent) return null;

    return Buffer.from(data.audioContent, "base64");
  } catch (err) {
    console.error("textToSpeech error:", err);
    return null;
  }
}
