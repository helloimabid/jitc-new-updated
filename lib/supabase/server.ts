import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import { cookies } from "next/headers"

// Create a single instance of the Supabase client for server components
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options })
        },
      },
    },
  )
}

// Data fetching functions
export async function getExecutives() {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .from("executives")
      .select("*")
      .order("display_order", { ascending: true, nullsLast: true })

    if (error) throw error
    return data || []
  } catch (error) {
    return []
  }
}

