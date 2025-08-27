import { NextResponse } from "next/server"

export async function POST() {
  try {
    // TODO: Integrate with your Node.js WhatsApp bot
    // This would typically send a request to your bot server to stop the WhatsApp client

    console.log("[v0] Stopping WhatsApp bot...")

    return NextResponse.json({
      success: true,
      message: "Bot stopped successfully",
      status: "stopped",
    })
  } catch (error) {
    console.error("[v0] Failed to stop bot:", error)
    return NextResponse.json({ success: false, message: "Failed to stop bot" }, { status: 500 })
  }
}
