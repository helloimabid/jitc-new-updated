"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Facebook, Instagram, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/supabase"

type Executive = Database["public"]["Tables"]["executives"]["Row"]

export default function ExecutivesContent() {
  const [executives, setExecutives] = useState<Executive[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const fetchExecutives = async () => {
      const supabase = createClient()

      // Changed to order by display_order instead of created_at
      const { data, error } = await supabase
        .from("executives")
        .select("*")
        .order("display_order", { ascending: true, nullsLast: true })

      if (data) {
        setExecutives(data)
      }

      setLoading(false)
    }

    fetchExecutives()

    // Check screen size for responsive icon sizing
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return (
    <section className="relative pt-10 pb-10 sm:pt-16 sm:pb-16">
      <div className="container mx-auto px-4 py-8 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Our <span className="text-primary">Executive</span> Team
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
            Meet the dedicated team of students leading the Josephite IT Club and driving our mission forward.
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-gray-400">Loading executives...</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {executives.map((executive, index) => (
              <motion.div
                key={executive.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass rounded-lg overflow-hidden group hover:transform hover:scale-[1.02] transition-all duration-300 w-full"
              >
                <div className="relative aspect-[6/7] w-full overflow-hidden">
                  <Image
                    src={executive.image_url || "/placeholder.svg?height=400&width=400"}
                    alt={executive.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <h3 className="text-lg sm:text-xl font-bold text-white">{executive.name}</h3>
                    <p className="text-primary text-sm sm:text-base">{executive.position}</p>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <p className="text-gray-400 text-xs sm:text-sm mb-4">{executive.bio}</p>

                  <div className="flex space-x-4">
                    {executive.github_url && (
                      <a
                        href={executive.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary transition-colors"
                        title="GitHub"
                      >
                        <Facebook size={isMobile ? 16 : 18} />
                      </a>
                    )}
                    {executive.linkedin_url && (
                      <a
                        href={executive.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary transition-colors"
                        title="LinkedIn"
                      >
                        <Instagram size={isMobile ? 16 : 18} />
                      </a>
                    )}
                    <a
                      href={`mailto:${executive.email}`}
                      className="text-gray-400 hover:text-primary transition-colors"
                      title="Email"
                    >
                      <Mail size={isMobile ? 16 : 18} />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

