import { NextResponse } from "next/server";
import { getFitbitAuthUrl } from "@/app/utils/fitbit";

export async function GET() {
  try {
    const authUrl = await getFitbitAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Fitbit auth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Fitbit authorization" },
      { status: 500 }
    );
  }
}
