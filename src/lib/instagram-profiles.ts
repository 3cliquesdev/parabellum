import { sanitizeMetaAccessToken } from "@/lib/meta-channel";

export type InstagramSenderProfile = {
  username: string | null;
  name: string | null;
  profilePicUrl: string | null;
};

export function isGenericInstagramLeadName(name: string | null | undefined) {
  const value = name?.trim() ?? "";
  if (!value) return true;

  return (
    /^Instagram\s+\d{4,}$/i.test(value) ||
    /^Lead\s+\d+$/i.test(value) ||
    /^Lead\s+instagram$/i.test(value) ||
    value === "Desconhecido"
  );
}

export function buildInstagramLeadName(senderId: string, profile: InstagramSenderProfile | null) {
  const name = profile?.name?.trim() ?? "";
  if (name) return name;

  const username = profile?.username?.trim().replace(/^@/, "") ?? "";
  if (username) return username;

  return `Instagram ${senderId.slice(-6)}`;
}

export function normalizeInstagramUsername(username: string | null | undefined) {
  const value = username?.trim().replace(/^@/, "") ?? "";
  return value || null;
}

export async function fetchInstagramSenderProfile(
  accessToken: string,
  senderId: string,
): Promise<InstagramSenderProfile | null> {
  try {
    const sanitizedToken = sanitizeMetaAccessToken(accessToken);
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${senderId}?fields=username,name,profile_pic&access_token=${sanitizedToken}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      console.warn("Instagram sender profile fetch failed:", response.status, await response.text());
      return null;
    }

    const data = (await response.json()) as {
      username?: string | null;
      name?: string | null;
      profile_pic?: string | null;
    };

    return {
      username: normalizeInstagramUsername(data.username),
      name: data.name?.trim() || null,
      profilePicUrl: data.profile_pic?.trim() || null,
    };
  } catch (error) {
    console.warn("Instagram sender profile fetch error:", error);
    return null;
  }
}
