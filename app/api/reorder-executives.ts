import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { executiveIds } = await request.json()

    if (!executiveIds || !Array.isArray(executiveIds)) {
      return NextResponse.json({ error: "Invalid request. executiveIds array is required." }, { status: 400 })
    }

    const supabase = await createClient()

    // Update each executive with its new order
    const updatePromises = executiveIds.map((id, index) => {
      return supabase
        .from("executives")
        .update({ display_order: index + 1 })
        .eq("id", id)
    })

    await Promise.all(updatePromises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in reorder-executives:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

