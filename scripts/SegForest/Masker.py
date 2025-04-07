import os
import numpy as np
from PIL import Image
import cv2


def generate_mask(image_path, mask_path):
    """
    Generate a binary mask for the given image using HSV color space to detect a wide range of green colors.

    Args:
        image_path: Path to the input image.
        mask_path: Path to save the mask.
    """
    try:
        # Open the image
        image = Image.open(image_path).convert("RGB")
        image_array = np.array(image)

        # Convert the image to HSV color space
        hsv = cv2.cvtColor(image_array, cv2.COLOR_RGB2HSV)

        # Define a wide range of green colors in HSV
        lower_green = np.array([35, 50, 50])  # Lower bound of green in HSV
        upper_green = np.array([85, 255, 255])  # Upper bound of green in HSV

        # Create a mask for green colors
        mask = cv2.inRange(hsv, lower_green, upper_green)

        # Remove small noise using morphological operations
        kernel = np.ones((3, 3), np.uint8)
        cleaned = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)

        # Fill holes in the mask
        filled = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=2)

        # Save the mask
        mask_image = Image.fromarray(filled)
        mask_image.save(mask_path)
        print(f"  Mask saved to {mask_path}")

    except Exception as e:
        print(f"Error generating mask: {e}")
        # Create a placeholder mask
        mask = Image.new("L", (800, 600), color=0)  # Black mask
        mask.save(mask_path)
        print(f"  Created placeholder mask at {mask_path}")


def process_masks(image_dir="dataset/images", mask_dir="dataset/masks"):
    """
    Generate masks for all images in the image directory.

    Args:
        image_dir: Directory containing images.
        mask_dir: Directory to save masks.
    """
    # Create mask directory if it doesn't exist
    os.makedirs(mask_dir, exist_ok=True)

    # Process each image
    for image_name in os.listdir(image_dir):
        if image_name.endswith(".png"):
            image_path = os.path.join(image_dir, image_name)
            mask_path = os.path.join(
                mask_dir, f"{os.path.splitext(image_name)[0]}_mask.png"
            )
            print(f"Generating mask for {image_name}...")
            generate_mask(image_path, mask_path)


def main():
    """
    Main function to generate masks for all images.
    """
    image_dir = "scripts\\SegForest\\Data\\images"  # Directory containing images
    mask_dir = "scripts\\SegForest\\Data\\masks"  # Directory to save masks

    # Process masks
    process_masks(image_dir, mask_dir)


if __name__ == "__main__":
    main()
