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

// Auth functions
export async function getSession() {
  const supabase = await createClient()
  try {
    const { data } = await supabase.auth.getSession()
    return data.session
  } catch (error) {
    return null
  }
}

// Data fetching functions
export async function getEvents() {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    return []
  }
}

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

export async function getModerators() {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase.from("moderators").select("*").order("created_at", { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    return []
  }
}

export async function getDevelopers() {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase.from("developers").select("*").order("created_at", { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    return []
  }
}

export async function getContactSubmissions() {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    return []
  }
}

export async function getJoinSubmissions() {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .from("join_submissions")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    return []
  }
}

// Dashboard stats
export async function getDashboardStats() {
  const supabase = await createClient()
  try {
    // Fetch all counts in parallel
    const [
      eventsCount,
      executivesCount,
      moderatorsCount,
      developersCount,
      contactCount,
      joinCount,
      unreadContactCount,
      pendingJoinCount,
    ] = await Promise.all([
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("executives").select("id", { count: "exact", head: true }),
      supabase.from("developers").select("id", { count: "exact", head: true }),
      supabase.from("contact_submissions").select("id", { count: "exact", head: true }),
      supabase.from("join_submissions").select("id", { count: "exact", head: true }),
      supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("is_read", false),
      supabase.from("join_submissions").select("id", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("join_submissions").select("id", { count: "exact", head: true }).eq("is_approved", false),
    ])

    return {
      events: eventsCount.count || 0,
      unreadContactSubmissions: unreadContactCount.count || 0,
      pendingJoinSubmissions: pendingJoinCount.count || 0,
      developers: developersCount.count || 0,
      contactSubmissions: contactCount.count || 0,
      joinSubmissions: joinCount.count || 0,
    }
  } catch (error) {
    return {
      events: 0,
      executives: 0,
      moderators: 0,
      developers: 0,
      contactSubmissions: 0,
      joinSubmissions: 0,
      unreadContactSubmissions: 0,
      pendingJoinSubmissions: 0,
    }
  }
}

