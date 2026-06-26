"use client"

import { useState } from "react"
import { useWorkflow } from "@/lib/workflow-context"
import { PROVIDER_LIST, PROVIDERS } from "@/lib/providers"
import { Button } from "@/components/ui/button"
import type { ProviderId } from "@/lib/types"
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, KeyRound, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type TestState = { status: "idle" | "testing" | "ok" | "error"; message?: string }

export function ProviderSettings() {
  const { settings, updateSettings, setApiKey } = useWorkflow()
  const [showKey, setShowKey] = useState(false)
  const [test, setTest] = useState<TestState>({ status: "idle" })

  const provider = PROVIDERS[settings.provider]
  const currentKey = settings.apiKeys[settings.provider] ?? ""

  function onProviderChange(id: ProviderId) {
    const firstModel = PROVIDERS[id].models[0].id
    updateSettings({ provider: id, model: firstModel })
    setTest({ status: "idle" })
  }

  async function runTest() {
    setTest({ status: "testing" })
    try {
      const res = await fetch("/api/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: settings.provider, model: settings.model, apiKey: currentKey }),
      })
      const data = await res.json()
      if (data.ok) setTest({ status: "ok", message: "Connection successful." })
      else setTest({ status: "error", message: data.error || "Connection failed." })
    } catch {
      setTest({ status: "error", message: "Network error reaching the test endpoint." })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-1 font-serif text-lg font-bold">LLM Provider</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Choose the model that powers outline and release generation. Your API key is used per-request and stored only
          in this browser session.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PROVIDER_LIST.map((p) => (
            <button
              key={p.id}
              onClick={() => onProviderChange(p.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
                settings.provider === p.id
                  ? "border-accent bg-accent/5 ring-1 ring-accent"
                  : "border-border hover:bg-secondary",
              )}
            >
              <span className="text-sm font-semibold">{p.label}</span>
              <span className="text-xs text-muted-foreground">{p.models.length} models</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="model-select">
          Model
        </label>
        <select
          id="model-select"
          value={settings.model}
          onChange={(e) => {
            updateSettings({ model: e.target.value })
            setTest({ status: "idle" })
          }}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {provider.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </section>

      <section className="flex flex-col gap-2">
        <label className="flex items-center gap-1.5 text-sm font-medium" htmlFor="api-key">
          <KeyRound className="h-3.5 w-3.5" /> API Key — {provider.label}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={currentKey}
              placeholder={provider.keyPlaceholder}
              onChange={(e) => {
                setApiKey(settings.provider, e.target.value)
                setTest({ status: "idle" })
              }}
              className="h-10 w-full rounded-md border border-border bg-background px-3 pr-10 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button variant="primary" onClick={runTest} disabled={!currentKey || test.status === "testing"}>
            {test.status === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{provider.keyHint}</p>

        {test.status === "ok" && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-accent">
            <CheckCircle2 className="h-3.5 w-3.5" /> {test.message}
          </p>
        )}
        {test.status === "error" && (
          <p className="flex items-start gap-1.5 text-xs font-medium text-destructive">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {test.message}
          </p>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <span>
          Keys are held only in this browser session (sessionStorage) and sent directly to your chosen provider through
          a stateless route. They are never logged or persisted on a server.
        </span>
      </div>
    </div>
  )
}
