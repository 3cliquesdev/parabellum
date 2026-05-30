import { GoogleAuth } from "google-auth-library";

const SPEECH_API = "https://speech.googleapis.com/v1/speech:recognize";

async function getSpeechToken(): Promise<string> {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  return (await client.getAccessToken()).token!;
}

// Detecta encoding a partir do mime type
function getEncoding(mime: string | null): string {
  if (!mime) return "OGG_OPUS";
  if (mime.includes("ogg")) return "OGG_OPUS";
  if (mime.includes("mp4") || mime.includes("m4a")) return "MP4";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "MP3";
  if (mime.includes("webm")) return "WEBM_OPUS";
  if (mime.includes("wav")) return "LINEAR16";
  return "OGG_OPUS"; // WhatsApp voice padrão
}

export async function transcribeAudio(audioUrl: string, mime?: string | null): Promise<string | null> {
  try {
    // Baixar áudio
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) return null;
    const audioBuffer = await audioRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    const token = await getSpeechToken();
    const encoding = getEncoding(mime ?? null);

    const body = {
      config: {
        encoding,
        sampleRateHertz: encoding === "MP3" ? 16000 : undefined,
        languageCode: "pt-BR",
        model: "latest_long",
        enableAutomaticPunctuation: true,
        useEnhanced: true,
      },
      audio: { content: audioBase64 },
    };

    const res = await fetch(SPEECH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("STT error:", await res.text());
      return null;
    }

    const data = await res.json();
    const transcript = data.results
      ?.map((r: any) => r.alternatives?.[0]?.transcript ?? "")
      .join(" ")
      .trim();

    return transcript || null;
  } catch (err) {
    console.error("transcribeAudio error:", err);
    return null;
  }
}
