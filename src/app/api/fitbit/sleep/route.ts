import { NextRequest, NextResponse } from "next/server";
import { getSleepData, refreshTokens } from "@/app/utils/fitbit";
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
    const accessToken = cookieStore.get("fitbit_access_token")?.value;
    const refreshToken = cookieStore.get("fitbit_refresh_token")?.value;

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: "Not authenticated with Fitbit" },
        { status: 401 }
      );
    }

    let currentAccessToken = accessToken;

    // Пробуем получить данные
    let sleepData = await getSleepData(date, currentAccessToken);

    // Если получили ошибку авторизации, пробуем обновить токен
    if (!sleepData) {
      try {
        const newTokens = await refreshTokens(refreshToken);
        currentAccessToken = newTokens.access_token;

        // Обновляем куки
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

        // Пробуем получить данные снова
        sleepData = await getSleepData(date, currentAccessToken);
      } catch (error) {
        console.error("Error refreshing token:", error);
        return NextResponse.json(
          { error: "Failed to refresh token" },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(sleepData);
  } catch (error) {
    console.error("Error fetching sleep data:", error);
    return NextResponse.json(
      { error: "Failed to fetch sleep data" },
      { status: 500 }
    );
  }
}
