import type { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { WorkflowProvider } from "@/lib/workflow-context"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Press Release Studio — AI Editorial Workflow",
  description:
    "Transform raw materials into publication-ready press releases through a structured, human-in-the-loop editorial workflow.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`bg-background ${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        <WorkflowProvider>{children}</WorkflowProvider>
      </body>
    </html>
  )
}
