'use client';

import { LuckyWheel } from "@/components/lucky-wheel"
import { useEffect } from "react"

export default function OverlayPage() {

    // Force transparent background logic for OBS/Browser source
    useEffect(() => {
        // Save original styles
        const originalBodyBg = document.body.style.background
        const originalHtmlBg = document.documentElement.style.background

        // Set transparent
        document.body.style.background = 'transparent'
        document.documentElement.style.background = 'transparent'

        return () => {
            // Revert styles on unmount
            document.body.style.background = originalBodyBg
            document.documentElement.style.background = originalHtmlBg
        }
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Optional: Add a subtle glow or particle effect if desired, but keeping it clean for overlay */}

            {/* Main Wheel Component with Overlay Mode */}
            <div className="transform scale-100 md:scale-110 lg:scale-125 transition-transform duration-500">
                <LuckyWheel isOverlay={true} />
            </div>
        </div>
    )
}
