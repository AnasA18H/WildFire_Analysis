// Simplify the API client to directly call the Python script
export interface AnalysisParams {
  latitude: number
  longitude: number
  preFireDate: string
  postFireDate: string
  bufferKm?: number
}

export interface AnalysisResults {
  location: {
    latitude: number
    longitude: number
  }
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

// Direct API client to call the Python script
export async function analyzeWildfire(params: AnalysisParams): Promise<AnalysisResults> {
  try {
    console.log("Sending analysis request to API:", params)

    const response = await fetch("/api/analyze-wildfire", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    })

    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status} ${response.statusText}`

      try {
        // Attempt to parse error as JSON
        const errorData = await response.json()
        console.error("Error data from server:", errorData)

        if (errorData && errorData.error) {
          errorMessage = errorData.error
        }
      } catch (parseError) {
        // If JSON parsing fails, try to get the text response
        try {
          const textResponse = await response.text()
          console.error("Full error response (text):", textResponse)
          errorMessage = `Server error: ${textResponse.substring(0, 200)}...`
        } catch (textError) {
          // If even text extraction fails, use the status
          console.error("Could not parse error response")
        }
      }

      throw new Error(errorMessage)
    }

    // Now we know the response is OK, parse the JSON
    const results = await response.json()
    console.log("Received analysis results:", results)

    return results
  } catch (error) {
    console.error("Error analyzing wildfire:", error)
    throw error // Re-throw the error to be handled by the caller
  }
}

