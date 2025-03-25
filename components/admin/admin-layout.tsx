"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase"
import AdminSidebar from "./admin-sidebar"
import { Loader2 } from "lucide-react"
import { AuthChangeEvent, Session } from "@supabase/supabase-js"

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data } = await supabase.auth.getSession()
        
        if (!data.session) {
          // console.log("No session found in client, redirecting to login")
          router.push("/login")
        } else {
          // console.log("Session found in client")
          setIsAuthenticated(true)
          setLoading(false)
        }
      } catch (error) {
        // console.error("Error checking session:", error)
        router.push("/login")
      }
    }
    
    checkAuth()
  }, [router, supabase])

  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Set up auth state change listener only after authentication is confirmed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, _session: Session | null) => {
      if (event === "SIGNED_OUT") {
        router.push("/login")
      }
    })

    // Clean up subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase, isAuthenticated])

  // Prevent layout from rendering while loading
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <AdminSidebar />
      <div className="flex-1 ml-0 lg:ml-64 min-h-screen overflow-auto">
        <main className="p-6">
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
} 