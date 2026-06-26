"use client"

import { useState } from "react"
import { MarkdownView } from "./markdown-view"
import { cn } from "@/lib/utils"
import { Pencil, Eye, Columns2 } from "lucide-react"

type View = "edit" | "preview" | "split"

export function MarkdownEditor({
  value,
  onChange,
  readOnly,
  minHeight = "h-full",
}: {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  minHeight?: string
}) {
  const [view, setView] = useState<View>(readOnly ? "preview" : "split")

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        {(["edit", "split", "preview"] as View[]).map((v) => {
          const Icon = v === "edit" ? Pencil : v === "preview" ? Eye : Columns2
          const disabled = readOnly && v !== "preview"
          return (
            <button
              key={v}
              disabled={disabled}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                view === v ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                disabled && "cursor-not-allowed opacity-40",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {v}
            </button>
          )
        })}
        <span className="ml-auto pr-1 text-xs text-muted-foreground">Markdown</span>
      </div>

      <div className={cn("flex flex-1 overflow-hidden", minHeight)}>
        {(view === "edit" || view === "split") && (
          <textarea
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange?.(e.target.value)}
            spellCheck={false}
            className={cn(
              "h-full resize-none overflow-auto bg-background p-4 font-mono text-sm leading-relaxed text-foreground scroll-thin focus:outline-none",
              view === "split" ? "w-1/2 border-r border-border" : "w-full",
            )}
          />
        )}
        {(view === "preview" || view === "split") && (
          <div className={cn("h-full overflow-auto p-5 scroll-thin", view === "split" ? "w-1/2" : "w-full")}>
            <MarkdownView content={value || "_Nothing to preview yet._"} />
          </div>
        )}
      </div>
    </div>
  )
}
