import ee
import requests
from PIL import Image
from io import BytesIO
import os
import csv
from datetime import datetime, timedelta
import sys

# Initialize Earth Engine
try:
    ee.Initialize(project="fiery-cistern-454011-e3")  # Using the provided project ID
    print("Google Earth Engine initialized successfully.")
except Exception as e:
    print(f"Error initializing Earth Engine: {e}")
    print(
        "Please make sure you have authenticated with Earth Engine using 'earthengine authenticate'"
    )
    sys.exit(1)


def get_satellite_image(latitude, longitude, date_str, buffer_km=5, days_range=30):
    """
    Fetch satellite imagery from Google Earth Engine.

    Args:
        latitude: Latitude in decimal degrees.
        longitude: Longitude in decimal degrees.
        date_str: Date in YYYY-MM-DD format.
        buffer_km: Buffer around the point in kilometers.
        days_range: Number of days before and after the date to search for images.

    Returns:
        ee.Image: The least cloudy image within the date range.
        ee.Geometry: The region of interest.
    """
    print(f"Fetching satellite image for {date_str}...")

    # Create a point geometry
    point = ee.Geometry.Point([longitude, latitude])

    # Create a buffer around the point
    region = point.buffer(buffer_km * 1000)

    # Parse the date
    date = datetime.strptime(date_str, "%Y-%m-%d")

    # Define the date range
    start_date = date - timedelta(days=days_range)
    end_date = date + timedelta(days=days_range)

    # Format dates for Earth Engine
    start_date_str = start_date.strftime("%Y-%m-%d")
    end_date_str = end_date.strftime("%Y-%m-%d")

    print(f"  Searching for images between {start_date_str} and {end_date_str}")

    # Get Sentinel-2 collection
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR")
        .filterDate(start_date_str, end_date_str)
        .filterBounds(region)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))  # Filter by cloud cover
        .sort("CLOUDY_PIXEL_PERCENTAGE")
    )

    # If no images with < 20% cloud cover, try with higher threshold
    if collection.size().getInfo() == 0:
        print("  No images with <20% cloud cover found, trying with <50% cloud cover")
        collection = (
            ee.ImageCollection("COPERNICUS/S2_SR")
            .filterDate(start_date_str, end_date_str)
            .filterBounds(region)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 50))
            .sort("CLOUDY_PIXEL_PERCENTAGE")
        )

    # Get the least cloudy image
    image = collection.first()

    # Check if image is None
    if image is None:
        raise Exception(f"No suitable satellite images found for {date_str}")

    # Get image metadata
    image_date = ee.Date(image.get("system:time_start")).format("YYYY-MM-dd").getInfo()
    cloud_percentage = image.get("CLOUDY_PIXEL_PERCENTAGE").getInfo()

    print(f"  Found image from {image_date} with {cloud_percentage:.1f}% cloud cover")

    return image, region


def download_and_save_image(image, region, vis_params, filename):
    """
    Download an image from Earth Engine and save it to a file.

    Args:
        image: Earth Engine image.
        region: Region to download.
        vis_params: Visualization parameters.
        filename: Output filename.

    Returns:
        str: Path to the saved image.
    """
    print(f"Downloading and saving {filename}...")

    try:
        # Get the image URL
        url = image.getThumbURL(
            {
                "region": region,
                "dimensions": "800x600",
                "format": "png",
                "min": vis_params.get("min", 0),
                "max": vis_params.get("max", 1),
                "bands": vis_params.get("bands", None),
                "palette": vis_params.get("palette", None),
                "crs": "EPSG:4326",
            }
        )

        # Download the image
        response = requests.get(url, timeout=60)
        response.raise_for_status()  # Raise exception for HTTP errors

        # Save the image
        img = Image.open(BytesIO(response.content))
        img.save(filename)
        print(f"  Saved to {filename}")

        return filename
    except Exception as e:
        print(f"Error downloading image: {e}")
        # Create a placeholder image with error message
        img = Image.new("RGB", (800, 600), color=(200, 200, 200))
        img.save(filename)
        print(f"  Created placeholder image at {filename}")
        return filename


def process_WildFire_Info(csv_file, output_dir="scripts\\SegForest\\Data\\images"):
    """
    Process wildfire data from a CSV file and download pre-fire and post-fire images.

    Args:
        csv_file: Path to the CSV file.
        output_dir: Output directory for images.
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Read CSV file
    with open(csv_file, mode="r") as file:
        reader = csv.DictReader(file)
        for i, row in enumerate(reader):
            latitude = float(row["latitude"])
            longitude = float(row["longitude"])
            pre_fire_date = row["pre_fire_date"]
            post_fire_date = row["post_fire_date"]
            event_name = row["event_name"]
            location = row["location"]

            print(f"\nProcessing wildfire {i + 1}: {event_name} ({location})...")

            # Define output paths
            pre_fire_path = os.path.join(output_dir, f"image{i * 2 + 1}.png")
            post_fire_path = os.path.join(output_dir, f"image{i * 2 + 2}.png")

            # Download pre-fire image
            try:
                pre_fire_image, region = get_satellite_image(
                    latitude, longitude, pre_fire_date
                )
                true_color_vis = {"min": 0, "max": 3000, "bands": ["B4", "B3", "B2"]}
                download_and_save_image(
                    pre_fire_image, region, true_color_vis, pre_fire_path
                )
            except Exception as e:
                print(f"Error processing pre-fire image: {e}")

            # Download post-fire image
            try:
                post_fire_image, region = get_satellite_image(
                    latitude, longitude, post_fire_date
                )
                true_color_vis = {"min": 0, "max": 3000, "bands": ["B4", "B3", "B2"]}
                download_and_save_image(
                    post_fire_image, region, true_color_vis, post_fire_path
                )
            except Exception as e:
                print(f"Error processing post-fire image: {e}")


def main():
    """
    Main function to process wildfire data from CSV and download images.
    """
    csv_file = "scripts\\SegForest\\WildFire_Info.csv"  # Path to the CSV file
    output_dir = "scripts\\SegForest\\Data\\images"  # Output directory for images

    # Process wildfire data
    process_WildFire_Info(csv_file, output_dir)


if __name__ == "__main__":
    main()
