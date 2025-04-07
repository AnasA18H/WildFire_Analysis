import { create } from "zustand"
import { analyzeWildfire } from "./api"

interface Location {
  latitude: number
  longitude: number
}

interface AnalysisParams {
  latitude: number
  longitude: number
  preFireDate: string
  postFireDate: string
}

interface AnalysisResults {
  location: Location
  preFireDate: string
  postFireDate: string
  dataSource: string
  totalBurnedArea: number
  burnSeverityStats: {
    low: number
    moderate: number
    high: number
    veryHigh: number
    extreme: number
  }
  nbrStats: {
    preFireAvg: number
    postFireAvg: number
    dNBRAvg: number
    dNBRMax: number
  }
  images: {
    preFireImage: string
    postFireImage: string
    preFireNBR: string
    postFireNBR: string
    dNBR: string
    burnSeverity: string
    burnSeverityLegend: string
  }
  burnSeverityPolygons?: any
  status?: string
  timestamp?: string
}

interface WildfireStore {
  selectedLocation: Location | null
  setSelectedLocation: (location: Location) => void

  analysisResults: AnalysisResults | null
  burnSeverityPolygons: any | null

  isLoading: boolean
  error: string | null

  visibleLayers: {
    burnSeverity: boolean
  }
  toggleLayerVisibility: (layer: keyof WildfireStore["visibleLayers"]) => void

  runAnalysis: (params: AnalysisParams) => Promise<void>
  clearAnalysis: () => void
}

export const useWildfireStore = create<WildfireStore>((set, get) => ({
  selectedLocation: null,
  setSelectedLocation: (location) => {
    set({
      selectedLocation: location,
      // Clear previous analysis results when a new location is selected
      analysisResults: null,
      burnSeverityPolygons: null,
      error: null,
    })
  },

  analysisResults: null,
  burnSeverityPolygons: null,

  isLoading: false,
  error: null,

  visibleLayers: {
    burnSeverity: true,
  },
  toggleLayerVisibility: (layer) => {
    set((state) => ({
      visibleLayers: {
        ...state.visibleLayers,
        [layer]: !state.visibleLayers[layer],
      },
    }))
  },

  runAnalysis: async (params) => {
    set({ isLoading: true, error: null })

    try {
      console.log("Running analysis with params:", params)

      // Call the API to run the Python script
      const results = await analyzeWildfire(params)

      // Use the polygons directly from Python script
      const geojsonData = results.burnSeverityPolygons || null

      console.log("Analysis complete. Results:", results)

      set({
        analysisResults: results,
        burnSeverityPolygons: geojsonData,
        isLoading: false,
      })
    } catch (error) {
      console.error("Error running analysis:", error)
      set({
        error: error instanceof Error ? error.message : "An unknown error occurred",
        isLoading: false,
      })
    }
  },

  clearAnalysis: () => {
    set({
      analysisResults: null,
      burnSeverityPolygons: null,
      error: null,
    })
  },
}))

