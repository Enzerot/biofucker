import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    cookieStore.delete("fitbit_access_token");
    cookieStore.delete("fitbit_refresh_token");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging out from Fitbit:", error);
    return NextResponse.json(
      { error: "Failed to logout from Fitbit" },
      { status: 500 }
    );
  }
}


