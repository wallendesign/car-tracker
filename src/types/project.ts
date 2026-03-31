export interface ProjectRecord {
  id: number
  name: string
  slug: string
  createdAt: number
}

export interface ProjectWithStats extends ProjectRecord {
  carCount: number
  avgPrice: number | null
  statusCounts: {
    contacted: number
    test_driven: number
    pass: number
    sold: number
  }
  previewPhotos: string[] // up to 4, favorites (contacted) first
}
