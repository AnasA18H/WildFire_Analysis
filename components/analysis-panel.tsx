"use client"

import { useState, useEffect } from "react"
import { useWildfireStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Calendar, MapPin, AlertTriangle, Info } from "lucide-react"
import { BurnSeverityChart } from "@/components/burn-severity-chart"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { getMockAnalysisResults } from "@/lib/mock"

interface AnalysisPanelProps {
  className?: string
}

export function AnalysisPanel({ className }: AnalysisPanelProps) {
  const { selectedLocation, analysisResults, isLoading, error, runAnalysis } = useWildfireStore()

  // Get current date and 1 month ago for default values
  const today = new Date()
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  const [preFireDate, setPreFireDate] = useState(format(oneMonthAgo, "yyyy-MM-dd"))
  const [postFireDate, setPostFireDate] = useState(format(today, "yyyy-MM-dd"))

  // Automatically run analysis when a location is selected
  useEffect(() => {
    if (selectedLocation && !isLoading && !analysisResults) {
      handleRunAnalysis()
    }
  }, [selectedLocation])

  const handleRunAnalysis = () => {
    if (!selectedLocation) return

    runAnalysis({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      preFireDate,
      postFireDate,
    })
  }

  const handleUseMockData = () => {
    if (!selectedLocation) return

    // Get mock data
    const mockResults = getMockAnalysisResults({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      preFireDate,
      postFireDate,
    })

    // Update the store with mock data
    useWildfireStore.setState({
      analysisResults: mockResults,
      burnSeverityPolygons: mockResults.burnSeverityPolygons,
      error: null,
      isLoading: false,
    })
  }

  return (
    <div className={cn("p-4 overflow-y-auto", className)}>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Wildfire Analysis</CardTitle>
          <CardDescription>Select a location on the map and specify dates to analyze wildfire damage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  value={selectedLocation?.latitude.toFixed(6) || ""}
                  readOnly
                  placeholder="Click on map"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  value={selectedLocation?.longitude.toFixed(6) || ""}
                  readOnly
                  placeholder="Click on map"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pre-fire-date">Pre-fire Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pre-fire-date"
                    type="date"
                    value={preFireDate}
                    onChange={(e) => setPreFireDate(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="post-fire-date">Post-fire Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="post-fire-date"
                    type="date"
                    value={postFireDate}
                    onChange={(e) => setPostFireDate(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            <Alert variant="info" className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-700">Analysis Information</AlertTitle>
              <AlertDescription className="text-blue-600">
                The analysis uses Sentinel-2 satellite imagery and calculates the Normalized Burn Ratio (NBR) to
                identify burned areas and estimate burn severity.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={handleRunAnalysis} disabled={!selectedLocation || isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Run Analysis"
                )}
              </Button>

              <Button onClick={handleUseMockData} variant="outline" disabled={isLoading} className="whitespace-nowrap">
                Use Mock Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}

      {analysisResults && (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="severity">Burn Severity</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Summary</CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {analysisResults.location.latitude.toFixed(6)}, {analysisResults.location.longitude.toFixed(6)}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Pre-fire Date:</div>
                    <div>{analysisResults.preFireDate}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Post-fire Date:</div>
                    <div>{analysisResults.postFireDate}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Total Burned Area:</div>
                    <div>{analysisResults.totalBurnedArea.toFixed(2)} km²</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Data Source:</div>
                    <div>{analysisResults.dataSource}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Average dNBR:</div>
                    <div>{analysisResults.nbrStats.dNBRAvg.toFixed(3)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Maximum dNBR:</div>
                    <div>{analysisResults.nbrStats.dNBRMax.toFixed(3)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="severity">
            <Card>
              <CardHeader>
                <CardTitle>Burn Severity Analysis</CardTitle>
                <CardDescription>Distribution of burn severity across the affected area</CardDescription>
              </CardHeader>
              <CardContent>
                <BurnSeverityChart data={analysisResults.burnSeverityStats} />

                <div className="mt-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-2 text-left">Severity Class</th>
                        <th className="border p-2 text-left">Area (km²)</th>
                        <th className="border p-2 text-left">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(analysisResults.burnSeverityStats).map(([key, value]) => (
                        <tr key={key}>
                          <td className="border p-2 capitalize">{key}</td>
                          <td className="border p-2">{(value as number).toFixed(2)}</td>
                          <td className="border p-2">
                            {(((value as number) / analysisResults.totalBurnedArea) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Satellite Imagery</CardTitle>
                <CardDescription>Pre-fire and post-fire satellite images</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Pre-Fire ({analysisResults.preFireDate})</h3>
                  <img
                    src={analysisResults.images.preFireImage || "/placeholder.svg?height=400&width=600"}
                    alt="Pre-fire satellite image"
                    className="w-full h-auto rounded-md border"
                  />
                </div>
                <div>
                  <h3 className="font-medium mb-2">Post-Fire ({analysisResults.postFireDate})</h3>
                  <img
                    src={analysisResults.images.postFireImage || "/placeholder.svg?height=400&width=600"}
                    alt="Post-fire satellite image"
                    className="w-full h-auto rounded-md border"
                  />
                </div>
                <div>
                  <h3 className="font-medium mb-2">Burn Severity Map</h3>
                  <img
                    src={analysisResults.images.burnSeverity || "/placeholder.svg?height=400&width=600"}
                    alt="Burn severity map"
                    className="w-full h-auto rounded-md border"
                  />
                </div>
                <div>
                  <h3 className="font-medium mb-2">dNBR Map</h3>
                  <img
                    src={analysisResults.images.dNBR || "/placeholder.svg?height=400&width=600"}
                    alt="dNBR map"
                    className="w-full h-auto rounded-md border"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

