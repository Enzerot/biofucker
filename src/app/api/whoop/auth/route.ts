import { NextResponse } from "next/server";
import { getWhoopAuthUrl } from "@/app/utils/whoop";

export async function GET() {
  try {
    const authUrl = await getWhoopAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Whoop auth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Whoop authorization" },
      { status: 500 }
    );
  }
}


