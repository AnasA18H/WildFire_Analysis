import { type NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { latitude, longitude, preFireDate, postFireDate, bufferKm = 5 } = body

    // Validate input
    if (!latitude || !longitude || !preFireDate || !postFireDate) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log("API Request received:", { latitude, longitude, preFireDate, postFireDate, bufferKm })

    // Path to the Python script and results
    const scriptsDir = path.join(process.cwd(), "scripts")
    const scriptPath = path.join(scriptsDir, "args.py")
    const resultsPath = path.join(scriptsDir, "results.json")

    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        {
          error: `Python script not found at ${scriptPath}. Please make sure args.py is in the scripts directory.`,
        },
        { status: 500 },
      )
    }

    // Build the command with proper quoting for paths to handle spaces
    // Use the scripts directory as the output directory to match how the user runs it manually
    const command = `python "${scriptPath}" --latitude ${latitude} --longitude ${longitude} --pre-fire-date ${preFireDate} --post-fire-date ${postFireDate} --buffer ${bufferKm} --output-dir "${scriptsDir}"`

    console.log(`Executing command: ${command}`)

    try {
      // Execute the command with a timeout
      await execAsync(command, {
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024, // Increase buffer size to 10MB
      })

      // Check if results.json exists
      if (!fs.existsSync(resultsPath)) {
        return NextResponse.json(
          {
            error: "Analysis failed to produce results. The Python script did not generate a results.json file.",
          },
          { status: 500 },
        )
      }

      // Read and parse the results file
      const resultsData = fs.readFileSync(resultsPath, "utf-8")
      const results = JSON.parse(resultsData)

      // Copy images to public directory if needed
      if (results.images) {
        const publicDir = path.join(process.cwd(), "public", "analysis_images")

        // Create the directory if it doesn't exist
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true })
        }

        Object.keys(results.images).forEach((key) => {
          const imagePath = results.images[key]

          // Skip if the path is already relative
          if (imagePath.startsWith("/")) {
            return
          }

          // Check if the image exists
          if (fs.existsSync(imagePath)) {
            // Create a new path in the public directory
            const filename = path.basename(imagePath)
            const newPath = path.join(publicDir, filename)

            // Copy the image to the public directory
            try {
              fs.copyFileSync(imagePath, newPath)

              // Update the path to be relative for browser access
              results.images[key] = `/analysis_images/${filename}`
            } catch (copyError) {
              console.error(`Error copying image ${imagePath}:`, copyError)
              results.images[key] = `/placeholder.svg?height=400&width=600&text=${key}`
            }
          } else {
            console.warn(`Image not found: ${imagePath}`)
            results.images[key] = `/placeholder.svg?height=400&width=600&text=${key}`
          }
        })
      }

      return NextResponse.json(results)
    } catch (execError) {
      const errorMsg = `Error executing Python script: ${execError instanceof Error ? execError.message : String(execError)}`
      console.error(errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 },
    )
  }
}

