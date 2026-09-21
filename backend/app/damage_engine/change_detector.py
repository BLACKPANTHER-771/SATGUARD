"""
EPOCH Damage Engine - ChangeDetector Module
Computes pixel difference, luminance shift, edge gradient difference, local texture variation,
and outputs a noise-filtered significant change mask and aggregate changeScore (0.00 -> 1.00).
"""

import numpy as np
import cv2
from typing import Tuple, Dict, Any
from .config import CLASSIFICATION_CONFIG


class ChangeDetector:
    """Performs optical change detection between aligned bitemporal image scenes."""

    @classmethod
    def compute_change_mask(cls, before_img: np.ndarray, after_img: np.ndarray) -> Tuple[np.ndarray, float, Dict[str, Any]]:
        """
        Computes the pixel difference, luminance, edge, and texture shift.
        Returns:
            - change_mask_rgb: uint8 RGB change visualization overlay
            - change_score: float (0.00 to 1.00)
            - metadata: detailed metrics dictionary
        """
        # 1. Color / Spectral Absolute Difference (RGB Euclidean distance)
        diff_rgb = cv2.absdiff(before_img, after_img)
        diff_mag = np.linalg.norm(diff_rgb.astype(np.float32), axis=2) / np.sqrt(3 * 255.0**2)  # Normalized 0-1

        # 2. Luminance Grayscale Difference
        gray_before = cv2.cvtColor(before_img, cv2.COLOR_RGB2GRAY).astype(np.float32)
        gray_after = cv2.cvtColor(after_img, cv2.COLOR_RGB2GRAY).astype(np.float32)
        diff_gray = np.abs(gray_after - gray_before) / 255.0

        # 3. Edge Gradient Difference (Sobel Operator for structural boundary comparison)
        sobel_before_x = cv2.Sobel(gray_before, cv2.CV_32F, 1, 0, ksize=3)
        sobel_before_y = cv2.Sobel(gray_before, cv2.CV_32F, 0, 1, ksize=3)
        edge_before = np.sqrt(sobel_before_x**2 + sobel_before_y**2)
        
        sobel_after_x = cv2.Sobel(gray_after, cv2.CV_32F, 1, 0, ksize=3)
        sobel_after_y = cv2.Sobel(gray_after, cv2.CV_32F, 0, 1, ksize=3)
        edge_after = np.sqrt(sobel_after_x**2 + sobel_after_y**2)

        edge_diff = np.abs(edge_after - edge_before) / (np.max(edge_before) + 1e-5)
        edge_diff = np.clip(edge_diff, 0.0, 1.0)

        # 4. Local Texture Variation (Standard Deviation filter)
        kernel = np.ones((5, 5), np.float32) / 25.0
        mean_before = cv2.filter2D(gray_before, -1, kernel)
        sq_mean_before = cv2.filter2D(gray_before**2, -1, kernel)
        std_before = np.sqrt(np.maximum(0, sq_mean_before - mean_before**2))

        mean_after = cv2.filter2D(gray_after, -1, kernel)
        sq_mean_after = cv2.filter2D(gray_after**2, -1, kernel)
        std_after = np.sqrt(np.maximum(0, sq_mean_after - mean_after**2))
        
        texture_diff = np.abs(std_after - std_before) / (np.max(std_before) + 1e-5)
        texture_diff = np.clip(texture_diff, 0.0, 1.0)

        # 5. Composite Raw Change Magnitude (0.0 to 1.0)
        composite_change = (0.40 * diff_mag + 0.25 * diff_gray + 0.20 * edge_diff + 0.15 * texture_diff)

        # 6. Noise Reduction (Morphological Opening to remove single-pixel sensor noise)
        min_threshold = CLASSIFICATION_CONFIG["CHANGE_MASK_MIN_INTENSITY_DELTA"] / 255.0
        binary_raw = (composite_change > min_threshold).astype(np.uint8)
        
        kernel_morph = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        binary_cleaned = cv2.morphologyEx(binary_raw, cv2.MORPH_OPEN, kernel_morph)

        # 7. Aggregate Scene Change Score (0.00 -> 1.00)
        significant_pixels = np.sum(binary_cleaned)
        total_pixels = binary_cleaned.size
        change_percentage = (significant_pixels / total_pixels) * 100.0
        change_score = float(np.clip(np.mean(composite_change[binary_cleaned == 1]) if significant_pixels > 0 else 0.0, 0.0, 1.0))

        # 8. Render Change Mask Overlay (Highlight changes in warm coral / amber heatmap)
        change_mask_rgb = np.zeros_like(before_img)
        # Coral for significant changes: R=196, G=95, B=89
        change_mask_rgb[binary_cleaned == 1] = [196, 95, 89]

        metadata = {
            "change_score": round(change_score, 4),
            "change_percentage": round(change_percentage, 2),
            "significant_pixel_count": int(significant_pixels),
            "total_pixel_count": int(total_pixels),
            "mean_pixel_diff": float(np.mean(diff_mag)),
            "mean_edge_diff": float(np.mean(edge_diff)),
            "mean_texture_diff": float(np.mean(texture_diff)),
            "disclaimer": "Pixel/structural change does NOT inherently equal building damage. Environmental/vegetation changes filtered separately."
        }

        return change_mask_rgb, change_score, metadata
