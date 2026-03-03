"use client"

import { Badge } from "@/components/ui/badge"
import type { CarRecord, CarStatus } from "@/types/car"

const STATUS_LABEL: Record<CarStatus, string> = {
  interested: "Interested",
  contacted: "Contacted",
  pass: "Pass",
}

const STATUS_VARIANT: Record<CarStatus, "default" | "secondary" | "outline"> = {
  interested: "default",
  contacted: "secondary",
  pass: "outline",
}

interface CarListProps {
  cars: CarRecord[]
  selectedId?: number | null
  onSelect: (car: CarRecord) => void
}

export function CarList({ cars, selectedId, onSelect }: CarListProps) {
  if (cars.length === 0) {
    return (
      <div className="px-4 py-6 text-xs text-muted-foreground">
        No cars yet. Paste a URL above.
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {cars.map((car) => (
        <div
          key={car.id}
          onClick={() => onSelect(car)}
          className={`flex gap-3 border-b border-border px-4 py-3 cursor-pointer transition-colors ${
            car.id === selectedId ? "bg-accent" : "hover:bg-accent/50"
          }`}
        >
          {/* Thumbnail */}
          <div className="w-14 h-10 shrink-0 rounded bg-muted overflow-hidden">
            {car.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/image-proxy?url=${encodeURIComponent(car.photoUrl)}`}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">
                {car.year} {car.make} {car.model}
              </span>
              <Badge variant={STATUS_VARIANT[car.status]} className="text-xs shrink-0">
                {STATUS_LABEL[car.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {car.price != null && <span>{car.price.toLocaleString("sv-SE")} kr</span>}
              {car.price != null && car.mileage != null && <span>·</span>}
              {car.mileage != null && <span>{car.mileage.toLocaleString("sv-SE")} km</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
