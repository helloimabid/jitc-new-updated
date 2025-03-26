import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { id, order } = await request.json()

    if (!id || typeof order !== "number") {
      return NextResponse.json({ error: "Invalid request. Both id and order are required." }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("executives")
      .update({ display_order: order })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

