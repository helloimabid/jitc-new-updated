import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import Terminal from "@/components/terminal"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-slate-900 to-black">
      <Terminal />
      <Navbar />
      <Hero />
      <Footer />
    </main>
  )
}

