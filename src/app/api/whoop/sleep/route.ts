import { NextRequest, NextResponse } from "next/server";
import { getSleepData, refreshTokens } from "@/app/utils/whoop";
import { cookies } from "next/headers";

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
    const accessToken = cookieStore.get("whoop_access_token")?.value;
    const refreshToken = cookieStore.get("whoop_refresh_token")?.value;

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: "Not authenticated with Whoop" },
        { status: 401 }
      );
    }

    let currentAccessToken = accessToken;

    let sleepData = await getSleepData(date, currentAccessToken);

    if (!sleepData) {
      try {
        const newTokens = await refreshTokens(refreshToken);
        currentAccessToken = newTokens.access_token;

        cookieStore.set("whoop_access_token", newTokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
        });
        cookieStore.set("whoop_refresh_token", newTokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
        });

        sleepData = await getSleepData(date, currentAccessToken);
      } catch (error) {
        console.error("Error refreshing token:", error);
        return NextResponse.json(
          { error: "Failed to refresh token" },
          { status: 401 }
        );
      }
    }

    if (!sleepData) {
      return NextResponse.json({ sleep: null });
    }

    return NextResponse.json({
      startTime: sleepData.start,
      endTime: sleepData.end,
      efficiency: sleepData.score?.sleep_efficiency_percentage || null,
      performance: sleepData.score?.sleep_performance_percentage || null,
    });
  } catch (error) {
    console.error("Error fetching Whoop sleep data:", error);
    return NextResponse.json(
      { error: "Failed to fetch sleep data" },
      { status: 500 }
    );
  }
}

