"use client"

import type { ReactNode } from "react"

export function WorkspaceLayout({
  step,
  title,
  subtitle,
  actions,
  children,
  aside,
}: {
  step: number
  title: string
  subtitle: string
  actions?: ReactNode
  children: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-card px-6 py-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent">Step {step} of 5</p>
            <h1 className="mt-0.5 font-serif text-2xl font-bold tracking-tight text-balance">{title}</h1>
            <p className="mt-0.5 max-w-xl text-sm text-muted-foreground text-pretty">{subtitle}</p>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 scroll-thin">{children}</div>
      </div>
      {aside && (
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-secondary/30 p-5 scroll-thin xl:block">
          {aside}
        </aside>
      )}
    </div>
  )
}
