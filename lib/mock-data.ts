export const mockAnalysisResults = {
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
  },
  preFireDate: "2023-06-01",
  postFireDate: "2023-08-01",
  dataSource: "Sentinel-2",
  totalBurnedArea: 42.75,
  burnSeverityStats: {
    low: 12.5,
    moderate: 15.3,
    high: 8.7,
    veryHigh: 4.2,
    extreme: 2.05,
  },
  nbrStats: {
    preFireAvg: 0.412,
    postFireAvg: 0.187,
    dNBRAvg: 0.225,
    dNBRMax: 0.687,
  },
  images: {
    preFireImage: "/placeholder.svg?height=400&width=600",
    postFireImage: "/placeholder.svg?height=400&width=600",
    preFireNBR: "/placeholder.svg?height=400&width=600",
    postFireNBR: "/placeholder.svg?height=400&width=600",
    dNBR: "/placeholder.svg?height=400&width=600",
    burnSeverity: "/placeholder.svg?height=400&width=600",
    burnSeverityLegend: "/placeholder.svg?height=100&width=400",
  },
}

