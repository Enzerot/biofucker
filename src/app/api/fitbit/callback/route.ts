import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/app/utils/fitbit";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(new URL("/integrations?error=no_code", request.url));
    }

    const tokens = await exchangeCodeForTokens(code);

    const response = NextResponse.redirect(new URL("/integrations", request.url));
    
    response.cookies.set("fitbit_access_token", tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    response.cookies.set("fitbit_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error handling Fitbit callback:", error);
    return NextResponse.redirect(new URL("/integrations?error=fitbit_auth_failed", request.url));
  }
}
