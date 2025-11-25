import { WhoopSleepData, WhoopTokens, WhoopSleepCollection } from "../types/whoop";

const WHOOP_CLIENT_ID = process.env.NEXT_PUBLIC_WHOOP_CLIENT_ID;
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;

export async function getWhoopAuthUrl() {
  const scope = "read:sleep read:profile";
  const redirectUri = `${process.env.BASE_URL}/api/whoop/callback`;
  const state = `whoop_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  return `https://api.prod.whoop.com/oauth/oauth2/auth?response_type=code&client_id=${WHOOP_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}&state=${state}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<WhoopTokens> {
  const redirectUri = `${process.env.BASE_URL}/api/whoop/callback`;
  const response = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: WHOOP_CLIENT_ID || "",
      client_secret: WHOOP_CLIENT_SECRET || "",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  const data = await response.json();
  return {
    ...data,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshTokens(
  refresh_token: string
): Promise<WhoopTokens> {
  const response = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
      client_id: WHOOP_CLIENT_ID || "",
      client_secret: WHOOP_CLIENT_SECRET || "",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  return {
    ...data,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function getSleepData(
  date: string,
  access_token: string
): Promise<WhoopSleepData | null> {
  try {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const params = new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    const response = await fetch(
      `https://api.prod.whoop.com/developer/v1/activity/sleep?${params}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error("Failed to fetch sleep data");
    }

    const data: WhoopSleepCollection = await response.json();
    const sleepRecord = data.records.find((r) => !r.nap);
    return sleepRecord || null;
  } catch (error) {
    console.error("Error fetching Whoop sleep data:", error);
    return null;
  }
}

