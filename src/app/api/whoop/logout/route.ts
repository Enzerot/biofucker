import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    cookieStore.delete("whoop_access_token");
    cookieStore.delete("whoop_refresh_token");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging out from Whoop:", error);
    return NextResponse.json(
      { error: "Failed to logout from Whoop" },
      { status: 500 }
    );
  }
}


