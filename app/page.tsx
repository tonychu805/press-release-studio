"use client"

import { useState } from "react"
import { useWorkflow } from "@/lib/workflow-context"
import { AppHeader } from "@/components/app-header"
import { StepNavigator } from "@/components/step-navigator"
import { SettingsPanel } from "@/components/settings/settings-panel"
import { StepUpload } from "@/components/steps/step-upload"
import { StepOutline } from "@/components/steps/step-outline"
import { StepReview } from "@/components/steps/step-review"
import { StepRelease } from "@/components/steps/step-release"
import { StepExport } from "@/components/steps/step-export"

export default function Page() {
  const { currentStep } = useWorkflow()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AppHeader onOpenSettings={() => setSettingsOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left rail — step navigation */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-border bg-secondary/40 p-4 scroll-thin lg:block">
          <StepNavigator />
        </aside>

        {/* Center workspace */}
        <main className="flex-1 overflow-hidden">
          {currentStep === 1 && <StepUpload />}
          {currentStep === 2 && <StepOutline />}
          {currentStep === 3 && <StepReview />}
          {currentStep === 4 && <StepRelease />}
          {currentStep === 5 && <StepExport />}
        </main>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
