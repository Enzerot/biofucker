import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSleepData as getFitbitSleepData, refreshTokens as refreshFitbitTokens } from "@/app/utils/fitbit";
import { getSleepData as getWhoopSleepData, refreshTokens as refreshWhoopTokens } from "@/app/utils/whoop";

type SleepSource = "fitbit" | "whoop" | "none";

interface SleepResponse {
  startTime: string | null;
  endTime: string | null;
  efficiency: number | null;
  source: SleepSource;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const activeSource = (cookieStore.get("active_sleep_source")?.value as SleepSource) || "none";

    if (activeSource === "none") {
      return NextResponse.json({
        startTime: null,
        endTime: null,
        efficiency: null,
        source: "none",
      } as SleepResponse);
    }

    if (activeSource === "fitbit") {
      return await handleFitbitSleep(date, cookieStore);
    }

    if (activeSource === "whoop") {
      return await handleWhoopSleep(date, cookieStore);
    }

    return NextResponse.json({
      startTime: null,
      endTime: null,
      efficiency: null,
      source: activeSource,
    } as SleepResponse);
  } catch (error) {
    console.error("Error fetching sleep data:", error);
    return NextResponse.json(
      { error: "Failed to fetch sleep data" },
      { status: 500 }
    );
  }
}

async function handleFitbitSleep(date: string, cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const accessToken = cookieStore.get("fitbit_access_token")?.value;
  const refreshToken = cookieStore.get("fitbit_refresh_token")?.value;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({
      startTime: null,
      endTime: null,
      efficiency: null,
      source: "fitbit",
      error: "Not authenticated",
    });
  }

  let currentAccessToken = accessToken;
  let sleepData = await getFitbitSleepData(date, currentAccessToken);

  if (!sleepData) {
    try {
      const newTokens = await refreshFitbitTokens(refreshToken);
      currentAccessToken = newTokens.access_token;

      cookieStore.set("fitbit_access_token", newTokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
      cookieStore.set("fitbit_refresh_token", newTokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });

      sleepData = await getFitbitSleepData(date, currentAccessToken);
    } catch (error) {
      console.error("Error refreshing Fitbit token:", error);
      return NextResponse.json({
        startTime: null,
        endTime: null,
        efficiency: null,
        source: "fitbit",
        error: "Failed to refresh token",
      });
    }
  }

  if (!sleepData) {
    return NextResponse.json({
      startTime: null,
      endTime: null,
      efficiency: null,
      source: "fitbit",
    } as SleepResponse);
  }

  return NextResponse.json({
    startTime: sleepData.startTime,
    endTime: sleepData.endTime,
    efficiency: sleepData.efficiency,
    source: "fitbit",
  } as SleepResponse);
}

async function handleWhoopSleep(date: string, cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const accessToken = cookieStore.get("whoop_access_token")?.value;
  const refreshToken = cookieStore.get("whoop_refresh_token")?.value;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({
      startTime: null,
      endTime: null,
      efficiency: null,
      source: "whoop",
      error: "Not authenticated",
    });
  }

  let currentAccessToken = accessToken;
  let sleepData = await getWhoopSleepData(date, currentAccessToken);

  if (!sleepData) {
    try {
      const newTokens = await refreshWhoopTokens(refreshToken);
      currentAccessToken = newTokens.access_token;

      cookieStore.set("whoop_access_token", newTokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
      if (newTokens.refresh_token) {
        cookieStore.set("whoop_refresh_token", newTokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
        });
      }

      sleepData = await getWhoopSleepData(date, currentAccessToken);
    } catch (error) {
      console.error("Error refreshing Whoop token:", error);
    }
  }

  if (!sleepData) {
    return NextResponse.json({
      startTime: null,
      endTime: null,
      efficiency: null,
      source: "whoop",
    } as SleepResponse);
  }

  return NextResponse.json({
    startTime: sleepData.start,
    endTime: sleepData.end,
    efficiency: sleepData.score?.sleep_efficiency_percentage || null,
    source: "whoop",
  } as SleepResponse);
}

