"use client"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export function CarPanel() {
  return (
    <div className="flex flex-col gap-6">
      {/* Photo placeholder */}
      <div className="aspect-video w-full rounded-md bg-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Photo placeholder</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">2019 Volvo V60</h2>
          <p className="text-sm text-muted-foreground">Blocket listing</p>
        </div>
        <Badge>Interested</Badge>
      </div>

      <Separator />

      {/* Listing details */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Price", value: "189 000 kr" },
          { label: "Mileage", value: "87 000 km" },
          { label: "Year", value: "2019" },
          { label: "Location", value: "Stockholm" },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>

      <Separator />

      {/* AI summary placeholder */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Summary</span>
        <p className="text-sm text-muted-foreground">
          AI-generated model overview, common issues, and value assessment will appear here in Phase 4.
        </p>
      </div>
    </div>
  )
}
