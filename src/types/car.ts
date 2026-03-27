// src/types/car.ts
// Canonical data model — contract for Phase 2 (extraction) and Phase 3 (UI display)

export type CarStatus = "interested" | "contacted" | "test_driven" | "pass" | "sold"

export type Marketplace = "blocket" | "bytbil" | "autouncle"

export interface CarRecord {
  id?: number              // Dexie auto-increment primary key — optional on insert
  // Source
  listingUrl: string       // Full marketplace URL (e.g. https://www.blocket.se/annons/...)
  marketplace: Marketplace // Detected source marketplace
  // Core listing data (extracted by AI in Phase 2)
  make: string             // Manufacturer, e.g. "Volvo"
  model: string            // Model name, e.g. "V60"
  year: number             // Model year, e.g. 2019
  price: number | null     // Asking price in SEK; null if AI cannot extract
  mileage: number | null
  horsepower: number | null
  location: string | null
  bodyType: string | null
  fuelType: string | null
  transmission: string | null
  driveType: string | null
  engineVolume: string | null
  color: string | null
  seats: number | null
  registrationDate: string | null
  listingDate: string | null      // Date listing was published/updated (from marketplace)
  equipment: string[] | null
  photoUrl: string | null  // Main listing photo URL (external CDN); null if not available
  // AI summary fields (populated in Phase 4 — null until then)
  aiModelOverview: string | null    // AI-generated general model info
  aiCommonIssues: string | null     // AI-generated known issues / things to inspect
  aiValueAssessment: string | null  // AI-generated price fairness verdict
  // Management
  status: CarStatus        // User-assigned research status
  createdAt: number        // Unix timestamp ms (Date.now()) — used for sort order
}
