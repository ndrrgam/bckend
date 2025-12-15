import type React from "react"
import type { Metadata } from "next"
import { Fredoka } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Lucky Wheel",
  description: "Fun lucky wheel game component",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fredoka.className} antialiased`}>
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
