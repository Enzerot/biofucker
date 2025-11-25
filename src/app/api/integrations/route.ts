import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export type SleepSource = "fitbit" | "whoop" | "none";

export async function GET() {
  const cookieStore = await cookies();
  const activeSource = (cookieStore.get("active_sleep_source")?.value as SleepSource) || "none";
  
  const whoopAccessToken = cookieStore.get("whoop_access_token")?.value;
  const whoopRefreshToken = cookieStore.get("whoop_refresh_token")?.value;
  
  console.log("Integrations status - whoop_access_token exists:", !!whoopAccessToken);
  console.log("Integrations status - whoop_refresh_token exists:", !!whoopRefreshToken);
  
  const fitbitConnected = !!(
    cookieStore.get("fitbit_access_token")?.value && 
    cookieStore.get("fitbit_refresh_token")?.value
  );
  
  const whoopConnected = !!(whoopAccessToken && whoopRefreshToken);

  return NextResponse.json({
    activeSource,
    fitbitConnected,
    whoopConnected,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { source } = await request.json() as { source: SleepSource };
    
    if (!["fitbit", "whoop", "none"].includes(source)) {
      return NextResponse.json(
        { error: "Invalid source" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("active_sleep_source", source, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ success: true, activeSource: source });
  } catch (error) {
    console.error("Error setting active source:", error);
    return NextResponse.json(
      { error: "Failed to set active source" },
      { status: 500 }
    );
  }
}

