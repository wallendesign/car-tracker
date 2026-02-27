"use client"

import { Badge } from "@/components/ui/badge"

const PLACEHOLDER_CARS = [
  {
    id: 1,
    make: "Volvo",
    model: "V60",
    year: 2019,
    price: 189000,
    mileage: 87000,
    status: "Interested",
    statusVariant: "default" as const,
  },
  {
    id: 2,
    make: "BMW",
    model: "320d",
    year: 2021,
    price: 249000,
    mileage: 42000,
    status: "Contacted",
    statusVariant: "secondary" as const,
  },
]

export function CarList() {
  return (
    <div className="flex flex-col">
      {PLACEHOLDER_CARS.map((car) => (
        <div
          key={car.id}
          className="flex flex-col gap-1 border-b border-border px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {car.year} {car.make} {car.model}
            </span>
            <Badge variant={car.statusVariant} className="text-xs">
              {car.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{car.price.toLocaleString("sv-SE")} kr</span>
            <span>·</span>
            <span>{car.mileage.toLocaleString("sv-SE")} km</span>
          </div>
        </div>
      ))}
    </div>
  )
}
