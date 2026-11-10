from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from math import isfinite
from typing import Any

from app.core.config import Settings
from app.models.enums import SeverityLevel

SEVERITY_METHOD = "IMAGE_HEURISTIC"
SEVERITY_METHOD_VERSION = "1.0"
SEVERITY_LIMITATIONS = (
    "Image-based severity is an operational estimate only. It does not measure real-world depth, "
    "traffic risk, structural integrity, or road-user impact. Detector confidence is intentionally "
    "not used as severity. Human review is required for safety-critical decisions."
)


@dataclass(frozen=True)
class SeverityAssessment:
    severity: SeverityLevel
    method: str
    method_version: str
    measurements: dict[str, Any]
    limitations: str


def _number(value: object, field: str) -> float:
    if isinstance(value, bool):
        raise ValueError(f"{field} must be a finite number")
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be a finite number") from exc
    if not isfinite(number):
        raise ValueError(f"{field} must be a finite number")
    return number


def _validate_thresholds(settings: Settings) -> None:
    ratios = (
        settings.severity_small_area_ratio,
        settings.severity_medium_area_ratio,
        settings.severity_large_area_ratio,
    )
    if not all(0 < ratio < 1 for ratio in ratios) or not ratios == tuple(sorted(ratios)):
        raise ValueError("Severity area thresholds must be ordered values between 0 and 1")
    counts = (
        settings.severity_medium_count,
        settings.severity_high_count,
        settings.severity_critical_count,
    )
    if not all(count > 0 for count in counts) or not counts == tuple(sorted(counts)):
        raise ValueError("Severity count thresholds must be ordered positive integers")


def _level_rank(level: SeverityLevel) -> int:
    return {
        SeverityLevel.LOW: 0,
        SeverityLevel.MEDIUM: 1,
        SeverityLevel.HIGH: 2,
        SeverityLevel.CRITICAL: 3,
    }[level]


def _higher(left: SeverityLevel, right: SeverityLevel) -> SeverityLevel:
    return left if _level_rank(left) >= _level_rank(right) else right


def classify_detections(
    detections: Sequence[Mapping[str, object]],
    image_width: int,
    image_height: int,
    settings: Settings,
) -> SeverityAssessment:
    """Classify detection geometry using documented, configurable heuristics.

    This function deliberately ignores confidence values. Bounding boxes must be in the
    coordinate space of the source image and are rejected when malformed or out of bounds.
    """

    _validate_thresholds(settings)
    if isinstance(image_width, bool) or not isinstance(image_width, int) or image_width <= 0:
        raise ValueError("image_width must be a positive integer")
    if isinstance(image_height, bool) or not isinstance(image_height, int) or image_height <= 0:
        raise ValueError("image_height must be a positive integer")

    image_area = image_width * image_height
    areas: list[float] = []
    for index, detection in enumerate(detections):
        if not isinstance(detection, Mapping):
            raise ValueError(f"detection {index} must be an object")
        label = detection.get("label")
        if label is not None and str(label).casefold() != "pothole":
            raise ValueError(f"detection {index} is not a pothole detection")
        x1 = _number(detection.get("x1"), f"detection {index}.x1")
        y1 = _number(detection.get("y1"), f"detection {index}.y1")
        x2 = _number(detection.get("x2"), f"detection {index}.x2")
        y2 = _number(detection.get("y2"), f"detection {index}.y2")
        if x1 < 0 or y1 < 0 or x2 > image_width or y2 > image_height or x2 <= x1 or y2 <= y1:
            raise ValueError(f"detection {index} has invalid image bounds")
        areas.append(((x2 - x1) * (y2 - y1)) / image_area)

    count = len(areas)
    largest_area_ratio = max(areas, default=0.0)
    total_area_ratio = min(1.0, sum(areas))
    if largest_area_ratio >= settings.severity_large_area_ratio:
        area_level = SeverityLevel.CRITICAL
    elif largest_area_ratio >= settings.severity_medium_area_ratio:
        area_level = SeverityLevel.HIGH
    elif largest_area_ratio >= settings.severity_small_area_ratio:
        area_level = SeverityLevel.MEDIUM
    else:
        area_level = SeverityLevel.LOW

    if count >= settings.severity_critical_count:
        count_level = SeverityLevel.CRITICAL
    elif count >= settings.severity_high_count:
        count_level = SeverityLevel.HIGH
    elif count >= settings.severity_medium_count:
        count_level = SeverityLevel.MEDIUM
    else:
        count_level = SeverityLevel.LOW

    return SeverityAssessment(
        severity=_higher(area_level, count_level),
        method=SEVERITY_METHOD,
        method_version=SEVERITY_METHOD_VERSION,
        measurements={
            "image_width": image_width,
            "image_height": image_height,
            "detection_count": count,
            "largest_box_area_ratio": round(largest_area_ratio, 6),
            "total_box_area_ratio": round(total_area_ratio, 6),
            "area_level": area_level.value,
            "count_level": count_level.value,
            "confidence_used": False,
            "thresholds": {
                "small_area_ratio": settings.severity_small_area_ratio,
                "medium_area_ratio": settings.severity_medium_area_ratio,
                "large_area_ratio": settings.severity_large_area_ratio,
                "medium_count": settings.severity_medium_count,
                "high_count": settings.severity_high_count,
                "critical_count": settings.severity_critical_count,
            },
        },
        limitations=SEVERITY_LIMITATIONS,
    )


__all__ = [
    "SEVERITY_LIMITATIONS",
    "SEVERITY_METHOD",
    "SEVERITY_METHOD_VERSION",
    "SeverityAssessment",
    "classify_detections",
]
