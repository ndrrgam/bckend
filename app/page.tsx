import { LuckyWheel } from "@/components/lucky-wheel"
import Link from "next/link"
import { Trophy } from "lucide-react"

export default function Page() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        // Transparent background option - can be removed for TikTok overlay
        background: "linear-gradient(180deg, #1a0a2e 0%, #0f0518 50%, #1a0a2e 100%)",
      }}
    >
      {/* Link ke halaman winners */}
      <Link
        href="/winners"
        className="absolute top-4 right-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200 shadow-lg"
      >
        <Trophy className="w-4 h-4" />
        Winners
      </Link>

      {/* Container sized for TikTok Live overlay 1080x1920 aspect */}
      <div className="w-full max-w-md mx-auto">
        <LuckyWheel username="@TikTokUser" rewardText="Mitos" isSpinning={false} />
      </div>
    </main>
  )
}
