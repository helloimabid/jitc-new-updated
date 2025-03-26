import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
try {
const { executiveIds } = await request.json()

if (!executiveIds || !Array.isArray(executiveIds)) {
return NextResponse.json({ error: "Invalid request. executiveIds array is required." }, { status: 400 })
}

console.log("Reordering executives with IDs:", executiveIds)

const supabase = await createClient()

// Update each executive with its new order
const updatePromises = executiveIds.map((id, index) => {
const newOrder = index + 1
console.log(`Setting executive ${id} to order ${newOrder}`)

return supabase.from("executives").update({ display_order: newOrder }).eq("id", id)
})

const results = await Promise.all(updatePromises)

// Check for errors
const errors = results.filter((result) => result.error)
if (errors.length > 0) {
console.error("Errors updating executives:", errors)
return NextResponse.json({ error: "Some updates failed", details: errors }, { status: 500 })
}

return NextResponse.json({
success: true,
message: `Successfully updated order for ${executiveIds.length} executives`,
})
} catch (error) {
console.error("Error in reorder-executives:", error)
return NextResponse.json({ error: "An unexpected error occurred", details: error }, { status: 500 })
}
}
