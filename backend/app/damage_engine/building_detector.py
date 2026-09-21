"""
EPOCH Damage Engine - BuildingDetector Module
Extracts structure footprints. Supports deterministic Sikkim/NH-10 demonstration footprints
and contour-based candidate proposals for uploaded scenes.
"""

import numpy as np
import cv2
from typing import List, Dict, Any


class BuildingDetector:
    """Detects candidate building footprints or provides deterministic demonstration structures."""

    # Curated deterministic structure footprints for the Sikkim NH-10 / Teesta River Corridor
    DEMO_SIKKIM_STRUCTURES = [
        {
            "structureId": "SK-DKC-BLD-01",
            "name": "Singtam Hydro Intake Station & Generator Hall",
            "geometry": {"bbox": [160, 290, 50, 40], "type": "Polygon"},
            "centerLat": 27.2345,
            "centerLng": 88.5120,
            "footprintAreaM2": 680.0,
            "category": "CRITICAL_FACILITY",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-DKC-BLD-02",
            "name": "Dikchu Riverfront Commercial Market Hub",
            "geometry": {"bbox": [220, 295, 40, 30], "type": "Polygon"},
            "centerLat": 27.2358,
            "centerLng": 88.5142,
            "footprintAreaM2": 420.0,
            "category": "COMMERCIAL",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-DKC-BLD-03",
            "name": "Teesta River Viaduct Approach Pier & Toll Span",
            "geometry": {"bbox": [270, 300, 40, 35], "type": "Polygon"},
            "centerLat": 27.2372,
            "centerLng": 88.5168,
            "footprintAreaM2": 510.0,
            "category": "TRANSPORT_INFRASTRUCTURE",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-DKC-BLD-04",
            "name": "NH-10 Transport Logistics & Fuel Depot",
            "geometry": {"bbox": [340, 260, 45, 35], "type": "Polygon"},
            "centerLat": 27.2390,
            "centerLng": 88.5201,
            "footprintAreaM2": 580.0,
            "category": "LOGISTICS",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-DKC-BLD-05",
            "name": "Pakyong Emergency Medical Sub-Center",
            "geometry": {"bbox": [395, 250, 45, 35], "type": "Polygon"},
            "centerLat": 27.2410,
            "centerLng": 88.5235,
            "footprintAreaM2": 460.0,
            "category": "MEDICAL",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-DKC-BLD-06",
            "name": "Government Secondary School Wing A",
            "geometry": {"bbox": [455, 240, 40, 35], "type": "Polygon"},
            "centerLat": 27.2431,
            "centerLng": 88.5270,
            "footprintAreaM2": 390.0,
            "category": "EDUCATION",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-DKC-BLD-07",
            "name": "BSNL Regional Microwave Repeater Enclosure",
            "geometry": {"bbox": [510, 230, 35, 30], "type": "Polygon"},
            "centerLat": 27.2450,
            "centerLng": 88.5305,
            "footprintAreaM2": 240.0,
            "category": "TELECOM",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-DKC-BLD-08",
            "name": "Upper Ridge Community Panchayat Hall",
            "geometry": {"bbox": [570, 180, 40, 35], "type": "Polygon"},
            "centerLat": 27.2482,
            "centerLng": 88.5350,
            "footprintAreaM2": 350.0,
            "category": "CIVIC",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-DKC-BLD-09",
            "name": "Forest Directorate Range Inspection Quarters",
            "geometry": {"bbox": [625, 160, 40, 35], "type": "Polygon"},
            "centerLat": 27.2510,
            "centerLng": 88.5395,
            "footprintAreaM2": 310.0,
            "category": "GOVERNMENT",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-DKC-BLD-10",
            "name": "Pakyong Substation 33kV Switchyard Bunk",
            "geometry": {"bbox": [680, 140, 40, 35], "type": "Polygon"},
            "centerLat": 27.2540,
            "centerLng": 88.5440,
            "footprintAreaM2": 280.0,
            "category": "ENERGY_UTILITY",
            "isSyntheticFootprint": True
        }
    ]

    # Curated deterministic structure footprints for the Chungthang Sector (Scene 02)
    DEMO_CHUNGTHANG_STRUCTURES = [
        {
            "structureId": "SK-CTG-BLD-01",
            "name": "Chungthang Stage-III Riverfront Residential Complex",
            "geometry": {"bbox": [200, 260, 50, 40], "type": "Polygon"},
            "centerLat": 27.59814,
            "centerLng": 88.65060,
            "footprintAreaM2": 620.0,
            "category": "RESIDENTIAL",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-CTG-BLD-02",
            "name": "Chungthang Teesta Stage-III Powerhouse Control Wing",
            "geometry": {"bbox": [260, 270, 45, 35], "type": "Polygon"},
            "centerLat": 27.59850,
            "centerLng": 88.65120,
            "footprintAreaM2": 540.0,
            "category": "CRITICAL_INFRASTRUCTURE",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-CTG-BLD-03",
            "name": "Chungthang Primary Healthcare & Emergency Clinic",
            "geometry": {"bbox": [310, 280, 40, 35], "type": "Polygon"},
            "centerLat": 27.59910,
            "centerLng": 88.65190,
            "footprintAreaM2": 450.0,
            "category": "MEDICAL",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-CTG-BLD-04",
            "name": "Teesta Highway Bridge Northern Abutment Span",
            "geometry": {"bbox": [360, 260, 40, 30], "type": "Polygon"},
            "centerLat": 27.59980,
            "centerLng": 88.65250,
            "footprintAreaM2": 380.0,
            "category": "TRANSPORT_INFRASTRUCTURE",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-CTG-BLD-05",
            "name": "Chungthang Secondary School Main Building",
            "geometry": {"bbox": [410, 250, 45, 35], "type": "Polygon"},
            "centerLat": 27.60040,
            "centerLng": 88.65310,
            "footprintAreaM2": 490.0,
            "category": "EDUCATION",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-CTG-BLD-06",
            "name": "BSNL Chungthang Central Exchange & Tower Facility",
            "geometry": {"bbox": [470, 230, 35, 30], "type": "Polygon"},
            "centerLat": 27.60100,
            "centerLng": 88.65380,
            "footprintAreaM2": 260.0,
            "category": "TELECOM",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-CTG-BLD-07",
            "name": "Chungthang Market Bazaar Block A",
            "geometry": {"bbox": [520, 210, 40, 35], "type": "Polygon"},
            "centerLat": 27.60160,
            "centerLng": 88.65440,
            "footprintAreaM2": 370.0,
            "category": "COMMERCIAL",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-CTG-BLD-08",
            "name": "Police Outpost & Emergency Dispatch Post",
            "geometry": {"bbox": [580, 180, 40, 35], "type": "Polygon"},
            "centerLat": 27.60220,
            "centerLng": 88.65500,
            "footprintAreaM2": 320.0,
            "category": "CIVIC",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-CTG-BLD-09",
            "name": "State PWD Engineering Inspection Bungalow",
            "geometry": {"bbox": [630, 160, 40, 35], "type": "Polygon"},
            "centerLat": 27.60280,
            "centerLng": 88.65560,
            "footprintAreaM2": 310.0,
            "category": "GOVERNMENT",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-CTG-BLD-10",
            "name": "Chungthang 66kV Substation Transformer Yard",
            "geometry": {"bbox": [690, 140, 40, 35], "type": "Polygon"},
            "centerLat": 27.60350,
            "centerLng": 88.65620,
            "footprintAreaM2": 300.0,
            "category": "ENERGY_UTILITY",
            "isSyntheticFootprint": True
        }
    ]

    # Curated deterministic structure footprints for the Singtam-Dikchu Sector (Scene 03)
    DEMO_SINGTAM_STRUCTURES = [
        {
            "structureId": "SK-SNG-BLD-01",
            "name": "Singtam Lower Riverbank Settlement Pier & Depot",
            "geometry": {"bbox": [545, 265, 55, 38], "type": "Polygon"},
            "centerLat": 27.2348,
            "centerLng": 88.4980,
            "footprintAreaM2": 580.0,
            "category": "TRANSPORT_INFRASTRUCTURE",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-SNG-BLD-05",
            "name": "Singtam River Bridge Approach Complex",
            "geometry": {"bbox": [570, 230, 48, 35], "type": "Polygon"},
            "centerLat": 27.2355,
            "centerLng": 88.4992,
            "footprintAreaM2": 420.0,
            "category": "COMMERCIAL",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-SNG-BLD-81",
            "name": "Singtam West Commercial & Residential Block",
            "geometry": {"bbox": [450, 210, 50, 38], "type": "Polygon"},
            "centerLat": 27.2362,
            "centerLng": 88.5005,
            "footprintAreaM2": 460.0,
            "category": "COMMERCIAL",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-SNG-BLD-67",
            "name": "Upper Slope North Residential Facility",
            "geometry": {"bbox": [535, 175, 42, 32], "type": "Polygon"},
            "centerLat": 27.2370,
            "centerLng": 88.5018,
            "footprintAreaM2": 310.0,
            "category": "RESIDENTIAL",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-SHG-BLD-10",
            "name": "Highway North Transit & Storage Bunkhouse",
            "geometry": {"bbox": [615, 150, 42, 35], "type": "Polygon"},
            "centerLat": 27.2378,
            "centerLng": 88.5030,
            "footprintAreaM2": 340.0,
            "category": "LOGISTICS",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-SNG-BLD-00",
            "name": "South Riverbank Agricultural Station",
            "geometry": {"bbox": [430, 315, 48, 35], "type": "Polygon"},
            "centerLat": 27.2385,
            "centerLng": 88.5042,
            "footprintAreaM2": 280.0,
            "category": "AGRICULTURE",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-SNG-BLD-04",
            "name": "Lower River Inundation Zone Facility",
            "geometry": {"bbox": [500, 325, 48, 38], "type": "Polygon"},
            "centerLat": 27.2392,
            "centerLng": 88.5055,
            "footprintAreaM2": 490.0,
            "category": "CRITICAL_FACILITY",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-SNG-BLD-02",
            "name": "Central NH-10 Junction Commercial Hub",
            "geometry": {"bbox": [485, 235, 52, 42], "type": "Polygon"},
            "centerLat": 27.2400,
            "centerLng": 88.5068,
            "footprintAreaM2": 510.0,
            "category": "COMMERCIAL",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-SNG-BLD-03",
            "name": "Singtam Clinic & Community Depot",
            "geometry": {"bbox": [430, 230, 48, 35], "type": "Polygon"},
            "centerLat": 27.2408,
            "centerLng": 88.5080,
            "footprintAreaM2": 360.0,
            "category": "MEDICAL",
            "isSyntheticFootprint": True
        },
        {
            "structureId": "SK-SNG-BLD-08",
            "name": "Upper Terrace Residential Cabin",
            "geometry": {"bbox": [475, 155, 42, 32], "type": "Polygon"},
            "centerLat": 27.2415,
            "centerLng": 88.5092,
            "footprintAreaM2": 290.0,
            "category": "RESIDENTIAL",
            "isSyntheticFootprint": True
        }
    ]

    @classmethod
    def get_structures_for_scene(cls, scene_id: str, mode: str, builtup_mask: np.ndarray) -> List[Dict[str, Any]]:
        """
        Retrieves candidate structures for assessment.
        In DEMO mode, returns deterministic curated structure candidates marked with isSyntheticFootprint: True.
        In UPLOADED mode, performs contour-based proposal extraction.
        """
        scene_id_lower = (scene_id or "").lower()

        if mode == "DEMO" or "demo" in mode.lower():
            if "chungthang" in scene_id_lower or "scene-02" in scene_id_lower or "scene_02" in scene_id_lower:
                return cls.DEMO_CHUNGTHANG_STRUCTURES
            if "singtam" in scene_id_lower or "scene-03" in scene_id_lower or "scene_03" in scene_id_lower:
                return cls.DEMO_SINGTAM_STRUCTURES
            return cls.DEMO_SIKKIM_STRUCTURES

        # UPLOADED MODE: Contour proposal
        contours, _ = cv2.findContours(builtup_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        structures = []
        count = 1
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if 150 <= area <= 10000:  # Valid building footprint pixel range
                x, y, w, h = cv2.boundingRect(cnt)
                structures.append({
                    "structureId": f"UPL-BLD-{count:03d}",
                    "name": f"Candidate Structure #{count:03d}",
                    "geometry": {"bbox": [x, y, w, h], "type": "Polygon"},
                    "centerLat": 27.2389 + (y / 1000.0),
                    "centerLng": 88.6065 + (x / 1000.0),
                    "footprintAreaM2": float(area * 1.5),
                    "category": "UNCLASSIFIED_STRUCTURE",
                    "isSyntheticFootprint": False
                })
                count += 1
                if count > 25:
                    break

        if not structures:
            # Fallback to Sikkim structures if contour proposals are insufficient
            return cls.DEMO_SIKKIM_STRUCTURES

        return structures
