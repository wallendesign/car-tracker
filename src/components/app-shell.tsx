import { CarList } from "@/components/car-list"
import { CarPanel } from "@/components/car-panel"

export function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Minimal header — single line, no chrome */}
      <header className="flex h-10 shrink-0 items-center border-b border-border px-4">
        <span className="text-sm font-medium tracking-tight">Car Tracker</span>
      </header>

      {/* Main: list sidebar + detail panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Car list — fixed 320px, scrollable */}
        <aside className="w-80 shrink-0 overflow-y-auto border-r border-border">
          <CarList />
        </aside>

        {/* Detail panel — fills remaining space, scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          <CarPanel />
        </main>
      </div>
    </div>
  )
}
