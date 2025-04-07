const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

// Create scripts directory if it doesn't exist
const scriptsDir = path.join(process.cwd(), "scripts")
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true })
}

// Copy the args.py script to the scripts directory
const sourcePath = path.join(process.cwd(), "node_modules", ".temp", "args.py")
const destPath = path.join(scriptsDir, "args.py")

try {
  // Check if the source file exists
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath)
    console.log("Successfully copied args.py to scripts directory")
  } else {
    console.log("Source file not found. Please manually copy args.py to the scripts directory")
  }

  // Install required Python packages
  console.log("Installing required Python packages...")
  execSync("pip install earthengine-api numpy matplotlib pillow requests", { stdio: "inherit" })
  console.log("Python packages installed successfully")

  // Authenticate with Earth Engine (this will require user interaction)
  console.log("Authenticating with Google Earth Engine...")
  execSync("earthengine authenticate", { stdio: "inherit" })
  console.log("Earth Engine authentication completed")
} catch (error) {
  console.error("Error setting up Python environment:", error.message)
  console.log("Please set up the Python environment manually:")
  console.log("1. Copy args.py to the scripts directory")
  console.log("2. Install required packages: pip install earthengine-api numpy matplotlib pillow requests")
  console.log("3. Authenticate with Earth Engine: earthengine authenticate")
}

