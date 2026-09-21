"""
EPOCH Damage Engine - DamageFeatureExtractor Module
Calculates quantitative 8-dimensional damage features (0.00 to 1.00) for each candidate structure footprint.
"""

import numpy as np
import cv2
from typing import Dict, Any, Tuple
from app.models.assessment_schemas import DamageFeatures
from .image_processor import ImageProcessor


class DamageFeatureExtractor:
    """Extracts localized damage features for individual structure footprints."""

    @classmethod
    def extract_features_for_structure(
        cls,
        before_img: np.ndarray,
        after_img: np.ndarray,
        structure: Dict[str, Any]
    ) -> Tuple[DamageFeatures, float, float, str, str]:
        """
        Extracts localized damage features from the before/after crops of a structure.
        Returns:
            - features: DamageFeatures object
            - changeScore: float (0.00 to 1.00)
            - structuralChangeScore: float (0.00 to 1.00)
            - beforeEvidenceBase64: data URI string of before crop
            - afterEvidenceBase64: data URI string of after crop
        """
        x, y, w, h = structure["geometry"]["bbox"]
        img_h, img_w = before_img.shape[:2]

        # Add 10% padding for perimeter context
        pad_x = int(w * 0.15)
        pad_y = int(h * 0.15)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(img_w, x + w + pad_x)
        y2 = min(img_h, y + h + pad_y)

        crop_before = before_img[y1:y2, x1:x2]
        crop_after = after_img[y1:y2, x1:x2]

        # Generate crop evidence previews
        before_preview = ImageProcessor.to_base64(crop_before, "JPEG")
        after_preview = ImageProcessor.to_base64(crop_after, "JPEG")

        # 1. Pixel Change (RGB Euclidean difference in structure bounding box)
        diff_rgb = cv2.absdiff(crop_before, crop_after).astype(np.float32)
        pixel_change = float(np.mean(diff_rgb) / 255.0)

        # 2. Edge Change (Sobel gradient difference)
        gray_b = cv2.cvtColor(crop_before, cv2.COLOR_RGB2GRAY).astype(np.float32)
        gray_a = cv2.cvtColor(crop_after, cv2.COLOR_RGB2GRAY).astype(np.float32)

        edge_b = cv2.Canny(gray_b.astype(np.uint8), 50, 150).astype(np.float32) / 255.0
        edge_a = cv2.Canny(gray_a.astype(np.uint8), 50, 150).astype(np.float32) / 255.0
        edge_change = float(np.mean(np.abs(edge_a - edge_b)))

        # 3. Texture Change (Local variance shift)
        std_b = float(np.std(gray_b))
        std_a = float(np.std(gray_a))
        texture_change = float(min(1.0, abs(std_a - std_b) / (std_b + 1e-4)))

        # 4. Disappearance Evidence (Loss of high-frequency roof/boundary definition)
        high_freq_loss = max(0.0, float((np.sum(edge_b) - np.sum(edge_a)) / (np.sum(edge_b) + 1e-5)))
        disappearance_evidence = float(min(1.0, high_freq_loss * 1.4))

        # 5. Appearance Evidence (Debris deposition / brown-mud silt spectral encroachment)
        r_a = crop_after[:, :, 0].astype(np.float32)
        g_a = crop_after[:, :, 1].astype(np.float32)
        b_a = crop_after[:, :, 2].astype(np.float32)
        # Silt/Mud color heuristic: R > 100, G in [70, 130], B < 80
        silt_mask = (r_a > 100) & (g_a > 60) & (b_a < 95)
        appearance_evidence = float(np.mean(silt_mask))

        # 6. Area Change & Built-up Transition
        area_change = float(min(1.0, (pixel_change + edge_change) / 2.0))
        built_up_change = float(min(1.0, (disappearance_evidence * 0.6 + appearance_evidence * 0.4)))

        # 7. Composite Structural Change Score
        structural_change = float(np.clip(
            0.35 * disappearance_evidence +
            0.25 * edge_change +
            0.20 * pixel_change +
            0.10 * texture_change +
            0.10 * appearance_evidence,
            0.0, 1.0
        ))

        # Overall localized change score
        change_score = float(np.clip(0.45 * pixel_change + 0.35 * structural_change + 0.20 * edge_change, 0.0, 1.0))

        features = DamageFeatures(
            pixelChange=round(pixel_change, 4),
            edgeChange=round(edge_change, 4),
            textureChange=round(texture_change, 4),
            structuralChange=round(structural_change, 4),
            areaChange=round(area_change, 4),
            builtUpChange=round(built_up_change, 4),
            disappearanceEvidence=round(disappearance_evidence, 4),
            appearanceEvidence=round(appearance_evidence, 4)
        )

        return features, round(change_score, 4), round(structural_change, 4), before_preview, after_preview
