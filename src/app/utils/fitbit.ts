import { FitbitSleepData, FitbitTokens } from "../types/fitbit";

const FITBIT_CLIENT_ID = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;

export async function getFitbitAuthUrl() {
  const scope = "sleep";
  const redirectUri = "http://localhost:3000/api/fitbit/callback";

  return `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${FITBIT_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<FitbitTokens> {
  const redirectUri = "http://localhost:3000/api/fitbit/callback";
  const response = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();
  return {
    ...data,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshTokens(
  refresh_token: string
): Promise<FitbitTokens> {
  const response = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    }),
  });

  const data = await response.json();
  return {
    ...data,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function getSleepData(
  date: string,
  access_token: string
): Promise<FitbitSleepData | null> {
  try {
    const response = await fetch(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch sleep data");
    }

    const data = await response.json();
    return data.sleep[0] || null;
  } catch (error) {
    console.error("Error fetching sleep data:", error);
    return null;
  }
}
