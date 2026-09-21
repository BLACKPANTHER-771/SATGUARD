"""
EPOCH Phase 2 - Damage Assessment Configuration & Centralized Thresholds
Contains centralized demonstration thresholds clearly labeled as INITIAL DEMONSTRATION THRESHOLDS.
"""

# ==============================================================================
# INITIAL DEMONSTRATION THRESHOLDS (Unvalidated Demonstration Configuration)
# Note: These values represent empirical baseline thresholds for deterministic
# demonstration and will be refined once formally calibrated against labeled field data.
# ==============================================================================

CLASSIFICATION_CONFIG = {
    "engine_name": "EPOCH Deterministic Damage Assessment Engine v2.0",
    "version": "2.0.0-DEMO",
    "threshold_status": "INITIAL DEMONSTRATION THRESHOLDS",
    "classes": ["DESTROYED", "MAJOR_DAMAGE", "MINOR_DAMAGE", "NO_DAMAGE"],
    
    # Structural change score thresholds (0.0 to 1.0)
    "DESTROYED_THRESHOLD": 0.65,      # >= 0.65 indicates severe structural failure / envelope collapse
    "MAJOR_DAMAGE_THRESHOLD": 0.40,   # 0.40 <= score < 0.65 indicates major structural / roof damage
    "MINOR_DAMAGE_THRESHOLD": 0.18,   # 0.18 <= score < 0.40 indicates localized/superficial damage
    "NO_DAMAGE_THRESHOLD": 0.00,      # < 0.18 indicates intact / baseline correlation
    
    # Feature weights for structuralChange score calculation
    "FEATURE_WEIGHTS": {
        "structuralChange": 0.30,
        "disappearanceEvidence": 0.25,
        "edgeChange": 0.20,
        "pixelChange": 0.10,
        "textureChange": 0.10,
        "appearanceEvidence": 0.05
    },
    
    # Change Detection Noise Filter Config
    "CHANGE_MASK_MIN_INTENSITY_DELTA": 24,  # Minimum 8-bit channel delta for change flagging
    "NOISE_FILTER_KERNEL_SIZE": 3,
    "SIGNIFICANT_CHANGE_PERCENTILE": 80.0,
    
    # Confidence Calculation Weights
    "CONFIDENCE_WEIGHTS": {
        "image_quality": 0.25,
        "alignment_fidelity": 0.25,
        "feature_agreement": 0.30,
        "classification_margin": 0.20
    }
}
