"use client"


import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { Trash2, GripVertical, Pencil } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import type { Database } from "@/types/supabase"

type Executive = Database["public"]["Tables"]["executives"]["Row"]

export default function ExecutivesList() {
const [executives, setExecutives] = useState<Executive[]>([])
const [loading, setLoading] = useState(true)
const [updating, setUpdating] = useState(false)

useEffect(() => {
fetchExecutives()
}, [])

const fetchExecutives = async () => {
setLoading(true)
try {
const supabase = createClientSupabaseClient()
const { data, error } = await supabase
.from("executives")
.select("*")
.order("display_order", { ascending: true, nullsLast: true })

if (error) {
throw error
}

setExecutives(data || [])
} catch (error) {
console.error("Error fetching executives:", error)
toast.error("Failed to load executives")
} finally {
setLoading(false)
}
}

const handleDragEnd = async (result) => {
if (!result.destination) return

const startIndex = result.source.index
const endIndex = result.destination.index

if (startIndex === endIndex) return

setUpdating(true)
try {
// Create a copy of the executives array
const reorderedExecutives = Array.from(executives)

// Remove the dragged item from the array
const [removed] = reorderedExecutives.splice(startIndex, 1)

// Insert the dragged item at the new position
reorderedExecutives.splice(endIndex, 0, removed)

// Update the state immediately for a responsive UI
setExecutives(reorderedExecutives)

// Extract the IDs in the new order
const executiveIds = reorderedExecutives.map((exec) => exec.id)

// Call the API to update the order in the database
const response = await fetch("/api/admin/reorder-executives", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({ executiveIds }),
})

const data = await response.json()

if (!response.ok) {
throw new Error(data.error || "Failed to update order")
}

toast.success("Executive order updated successfully")
} catch (error) {
console.error("Error updating executive order:", error)
toast.error("Failed to update executive order")

// Revert to the original order by refetching
fetchExecutives()
} finally {
setUpdating(false)
}
}

if (loading) {
return (
<div className="flex justify-center items-center h-64">
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
</div>
)
}

return (
<div className="bg-card rounded-lg shadow">
<div className="p-4 border-b">
<h3 className="text-lg font-medium">Executive Members</h3>
<p className="text-sm text-muted-foreground">Drag and drop to reorder executives</p>
</div>

<DragDropContext onDragEnd={handleDragEnd}>
<Droppable droppableId="executives">
{(provided) => (
<div
{...provided.droppableProps}
ref={provided.innerRef}
className={`divide-y ${updating ? "opacity-70 pointer-events-none" : ""}`}
>
{executives.map((executive, index) => (
<Draggable key={executive.id} draggableId={executive.id} index={index}>
{(provided) => (
<div
ref={provided.innerRef}
{...provided.draggableProps}
className="flex items-center p-4 hover:bg-muted/50 transition-colors"
>
<div {...provided.dragHandleProps} className="mr-3 cursor-grab">
<GripVertical className="h-5 w-5 text-muted-foreground" />
</div>

<div className="h-10 w-10 rounded-full overflow-hidden mr-4 flex-shrink-0">
<Image
src={executive.image_url || "/placeholder.svg?height=40&width=40"}
alt={executive.name}
width={40}
height={40}
className="object-cover"
/>
</div>

<div className="flex-1 min-w-0">
<p className="font-medium truncate">{executive.name}</p>
<p className="text-sm text-muted-foreground truncate">{executive.position}</p>
</div>

<div className="flex items-center gap-2 ml-4">
<button className="p-2 hover:bg-muted rounded-full transition-colors" title="Edit executive">
<Pencil className="h-4 w-4 text-muted-foreground" />
</button>
<button
className="p-2 hover:bg-destructive/10 rounded-full transition-colors"
title="Delete executive"
>
<Trash2 className="h-4 w-4 text-destructive" />
</button>
</div>
</div>
)}
</Draggable>
))}
{provided.placeholder}
</div>
)}
</Droppable>
</DragDropContext>
</div>
)
}
