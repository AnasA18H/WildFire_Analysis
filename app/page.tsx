import { WildfireHeader } from "@/components/wildfire-header"
import { AnalysisPanel } from "@/components/analysis-panel"
import { MapWrapper } from "@/components/map-wrapper"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <WildfireHeader />
      <div className="flex flex-col lg:flex-row flex-1">
        <div className="flex-1 h-[50vh] lg:h-auto">
          <MapWrapper />
        </div>
        <AnalysisPanel className="flex-1" />
      </div>
    </main>
  )
}

