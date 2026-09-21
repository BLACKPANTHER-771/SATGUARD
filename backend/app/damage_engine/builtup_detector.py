"""
EPOCH Damage Engine - BuiltUpDetector Module
Identifies candidate built-up land cover and excludes non-structural land classes (vegetation, deep water, bare talus).
"""

import numpy as np
import cv2
from typing import Tuple, Dict, Any


class BuiltUpDetector:
    """Isolates built-up and settlement land cover masks to prevent false damage classification on natural terrain."""

    @classmethod
    def extract_builtup_mask(cls, img_rgb: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Extracts built-up candidate mask using edge density, color variance, and contrast heuristics.
        Returns uint8 binary mask (255 = candidate built-up, 0 = non-structural terrain).
        """
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)

        # 1. Edge density (Buildings typically have crisp rectilinear high-contrast boundaries)
        edges = cv2.Canny(gray, 50, 150)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        edge_density = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)

        # 2. Exclude deep natural green vegetation (Excess Green Index estimate)
        r = img_rgb[:, :, 0].astype(np.float32)
        g = img_rgb[:, :, 1].astype(np.float32)
        b = img_rgb[:, :, 2].astype(np.float32)

        # Dense forest heuristic: G > R + 10 and G > B + 10
        vegetation_mask = (g > (r + 8)) & (g > (b + 8))

        # 3. Exclude deep water channel (Low brightness, blue tint)
        water_mask = (b > r) & (gray < 75)

        # 4. Candidate built-up mask
        builtup_mask = (edge_density > 0) & (~vegetation_mask) & (~water_mask)
        builtup_uint8 = (builtup_mask.astype(np.uint8)) * 255

        meta = {
            "detector_type": "HEURISTIC_EDGE_COLOR_SEGMENTATION",
            "builtup_pixel_ratio": float(np.mean(builtup_mask)),
            "vegetation_filtered": True,
            "water_filtered": True,
            "status": "CANDIDATE_BUILTUP_ISOLATED"
        }

        return builtup_uint8, meta
