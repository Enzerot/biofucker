import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/app/utils/fitbit";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "No authorization code provided" },
        { status: 400 }
      );
    }

    const tokens = await exchangeCodeForTokens(code);

    // Сохраняем токены в куки
    const cookieStore = await cookies();
    cookieStore.set("fitbit_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 дней
    });
    cookieStore.set("fitbit_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 дней
    });

    // Редирект обратно на главную страницу
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Error handling Fitbit callback:", error);
    return NextResponse.json(
      { error: "Failed to handle Fitbit callback" },
      { status: 500 }
    );
  }
}
