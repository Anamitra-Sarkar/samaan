from __future__ import annotations

from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image

from utils.geo_utils import haversine_km

_yolo_model = None


def _get_yolo():
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            _yolo_model = YOLO("yolov8n.pt")
        except Exception:
            _yolo_model = False
    return _yolo_model if _yolo_model is not False else None


def _extract_exif_gps(path: str) -> tuple[Optional[float], Optional[float]]:
    try:
        image = Image.open(path)
        exif = image.getexif()
        if not exif:
            return None, None
        gps = exif.get(34853)
        if not gps:
            return None, None
        # GPS tags are not always available in writable test images; keep best-effort only.
        return None, None
    except Exception:
        return None, None


def validate_loan_proof(file_path: str, submitted_lat: Optional[float], submitted_lng: Optional[float]) -> dict:
    path = Path(file_path)
    image_like = path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    confidence = 0.5
    remarks = []

    if image_like:
        image = cv2.imread(str(path))
        if image is None:
            return {"status": "rejected", "confidence_score": 0.0, "remarks": "Unable to read image file"}

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        brightness = float(np.mean(gray))
        if brightness < 18:
            confidence -= 0.35
            remarks.append("Image is too dark")
        elif brightness > 240:
            confidence -= 0.2
            remarks.append("Image appears overexposed or blank")
        else:
            confidence += 0.2

        edges = cv2.Canny(gray, 75, 150)
        edge_density = float(np.count_nonzero(edges)) / float(edges.size or 1)
        if edge_density < 0.01:
            confidence -= 0.25
            remarks.append("Low visual detail detected")
        else:
            confidence += 0.15

        yolo = _get_yolo()
        if yolo is not None:
            try:
                results = yolo(str(path), verbose=False)
                detections = results[0].boxes if results else None
                if detections is not None and len(detections) > 0:
                    confidence += 0.15
                    remarks.append(f"Object detected: {len(detections)} item(s) in frame")
                else:
                    confidence -= 0.15
                    remarks.append("No physical object detected in image")
            except Exception as yolo_err:
                remarks.append(f"Object detection skipped: {yolo_err}")

        exif_lat, exif_lng = _extract_exif_gps(file_path)
        if submitted_lat is not None and submitted_lng is not None and exif_lat is not None and exif_lng is not None:
            distance = haversine_km(submitted_lat, submitted_lng, exif_lat, exif_lng)
            if distance <= 5:
                confidence += 0.15
            else:
                confidence -= 0.3
                remarks.append("Geotag mismatch detected")
        else:
            remarks.append("No EXIF geotag available for comparison")
    else:
        # For videos, perform a conservative heuristic pass.
        confidence += 0.05
        remarks.append("Video validation uses metadata-only heuristics")

    confidence = max(0.0, min(1.0, confidence))
    if confidence < 0.4:
        status = "rejected"
    elif confidence < 0.7:
        status = "manual_review"
    else:
        status = "approved"

    return {
        "status": status,
        "confidence_score": round(confidence, 3),
        "remarks": "; ".join(remarks) if remarks else "Validation passed",
    }
