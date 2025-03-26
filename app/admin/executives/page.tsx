
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import ExecutivesList from "./executives-list"

export const metadata = {
title: "Manage Executives | Admin Dashboard",
}

export default function ExecutivesPage() {
return (
<div className="space-y-6">
<div className="flex justify-between items-center">
<div>
<h1 className="text-2xl font-bold tracking-tight">Executives</h1>
<p className="text-muted-foreground">Manage executive team members and their display order</p>
</div>
<Button className="flex items-center gap-2">
<PlusCircle className="h-4 w-4" />
Add Executive
</Button>
</div>

<Suspense fallback={<div>Loading...</div>}>
<ExecutivesList />
</Suspense>
</div>
)
}

