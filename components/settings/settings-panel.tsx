"use client"

import { useState, useEffect } from "react"
import { ProviderSettings } from "./provider-settings"
import { PromptManager } from "./prompt-manager"
import { cn } from "@/lib/utils"
import { X, Cpu, FileCode, Palette } from "lucide-react"

type Tab = "provider" | "prompts" | "appearance"

const TABS: { id: Tab; label: string; icon: typeof Cpu }[] = [
  { id: "provider", label: "LLM Provider", icon: Cpu },
  { id: "prompts", label: "Prompts", icon: FileCode },
  { id: "appearance", label: "Appearance", icon: Palette },
]

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("provider")

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-serif text-xl font-bold tracking-tight">Settings</h2>
            <p className="text-xs text-muted-foreground">Providers, prompts, and appearance</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex items-center gap-1 border-b border-border px-3">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5 scroll-thin">
          {tab === "provider" && <ProviderSettings />}
          {tab === "prompts" && <PromptManager />}
          {tab === "appearance" && <AppearanceSettings />}
        </div>
      </div>
    </div>
  )
}

function AppearanceSettings() {
  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="mb-1 font-serif text-lg font-bold">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Press Release Studio uses a fixed editorial theme tuned for readability and a magazine/newspaper aesthetic.
        </p>
      </section>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme</dt>
          <dd className="mt-1 text-sm">Editorial clean (default)</dd>
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accent color</dt>
          <dd className="mt-1 flex items-center gap-2 text-sm">
            <span className="h-4 w-4 rounded-sm bg-accent" /> Editorial red
          </dd>
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Typography</dt>
          <dd className="mt-1 text-sm">Playfair Display + Inter</dd>
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layout density</dt>
          <dd className="mt-1 text-sm">Whitespace-heavy, readable</dd>
        </div>
      </dl>
    </div>
  )
}
