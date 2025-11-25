import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/app/utils/whoop";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const error = searchParams.get("error");
    const code = searchParams.get("code");

    if (error) {
      console.error(
        "WHOOP OAuth error:",
        error,
        searchParams.get("error_description")
      );
      return NextResponse.redirect(
        new URL("/integrations?error=whoop_auth_failed", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/integrations?error=no_code", request.url)
      );
    }

    const tokens = await exchangeCodeForTokens(code);

    console.log(
      "WHOOP callback - tokens received, access_token length:",
      tokens.access_token?.length
    );
    console.log(
      "WHOOP callback - refresh_token exists:",
      !!tokens.refresh_token
    );

    const response = NextResponse.redirect(
      new URL("/integrations", request.url)
    );

    response.cookies.set("whoop_access_token", tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    response.cookies.set("whoop_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    console.log("WHOOP callback - cookies set on response");

    return response;
  } catch (error) {
    console.error("Error handling Whoop callback:", error);
    return NextResponse.redirect(
      new URL("/integrations?error=whoop_token_exchange_failed", request.url)
    );
  }
}
