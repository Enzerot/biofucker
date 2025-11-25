import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("whoop_access_token")?.value;
  const refreshToken = cookieStore.get("whoop_refresh_token")?.value;

  return NextResponse.json({
    isConnected: !!(accessToken && refreshToken),
  });
}

