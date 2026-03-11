"use client"

import { Badge } from "@/components/ui/badge"
import type { CarRecord, CarStatus } from "@/types/car"

const STATUS_VARIANT: Record<CarStatus, "default" | "secondary" | "outline"> = {
  interested: "default",
  contacted: "secondary",
  pass: "outline",
}

const STATUS_LABEL: Record<CarStatus, string> = {
  interested: "Intresserad",
  contacted: "Kontaktad",
  pass: "Passar ej",
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
        Inga bilar ännu. Klistra in en länk ovan.
      </div>
    )
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-border text-xs text-muted-foreground">
          <th className="w-12 py-2 px-3 font-normal text-left"></th>
          <th className="py-2 px-3 font-normal text-left">Modell</th>
          <th className="py-2 px-3 font-normal text-right">År</th>
          <th className="py-2 px-3 font-normal text-right">HK</th>
          <th className="py-2 px-3 font-normal text-right">Miltal</th>
          <th className="py-2 px-3 font-normal text-right">Pris</th>
          <th className="py-2 px-3 font-normal text-left">Status</th>
        </tr>
      </thead>
      <tbody>
        {cars.map((car) => (
          <tr
            key={car.id}
            onClick={() => onSelect(car)}
            className={`border-b border-border cursor-pointer transition-colors ${
              car.id === selectedId ? "bg-accent" : "hover:bg-accent/50"
            }`}
          >
            {/* Thumbnail */}
            <td className="py-2 px-3">
              <div className="w-10 h-7 rounded bg-muted overflow-hidden shrink-0">
                {car.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/image-proxy?url=${encodeURIComponent(car.photoUrl)}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </td>

            {/* Make + Model */}
            <td className="py-2 px-3 font-medium whitespace-nowrap">
              {car.make} {car.model}
            </td>

            {/* Year */}
            <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
              {car.year}
            </td>

            {/* Horsepower */}
            <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
              {car.horsepower != null ? `${car.horsepower}` : "—"}
            </td>

            {/* Mileage */}
            <td className="py-2 px-3 text-right text-muted-foreground tabular-nums whitespace-nowrap">
              {car.mileage != null ? `${car.mileage.toLocaleString("sv-SE")} mil` : "—"}
            </td>

            {/* Price */}
            <td className="py-2 px-3 text-right font-medium tabular-nums whitespace-nowrap">
              {car.price != null ? `${car.price.toLocaleString("sv-SE")} kr` : "—"}
            </td>

            {/* Status — only show if not default */}
            <td className="py-2 px-3">
              {car.status !== "interested" && (
                <Badge variant={STATUS_VARIANT[car.status]} className="text-xs">
                  {STATUS_LABEL[car.status]}
                </Badge>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
