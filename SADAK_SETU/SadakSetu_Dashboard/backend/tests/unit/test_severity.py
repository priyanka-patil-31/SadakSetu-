import pytest
from ai_service.severity.service import classify_detections
from app.core.config import Settings
from app.models.enums import SeverityLevel


def test_severity_boundaries_use_geometry_and_count_not_confidence() -> None:
    settings = Settings()
    low = classify_detections([{"x1": 0, "y1": 0, "x2": 100, "y2": 100, "confidence": 0.99}], 1_000, 1_000, settings)
    medium = classify_detections(
        [{"x1": 0, "y1": 0, "x2": 250, "y2": 250, "confidence": 0.01}], 1_000, 1_000, settings
    )
    high = classify_detections(
        [{"x1": 0, "y1": 0, "x2": 500, "y2": 400}], 1_000, 1_000, settings
    )
    critical = classify_detections(
        [{"x1": 0, "y1": 0, "x2": 600, "y2": 600}], 1_000, 1_000, settings
    )
    assert low.severity == SeverityLevel.LOW
    assert medium.severity == SeverityLevel.MEDIUM
    assert high.severity == SeverityLevel.HIGH
    assert critical.severity == SeverityLevel.CRITICAL
    assert low.measurements["confidence_used"] is False


def test_multiple_small_detections_escalate_by_count() -> None:
    detections = [{"x1": index * 100, "y1": 0, "x2": index * 100 + 40, "y2": 40} for index in range(5)]
    result = classify_detections(detections, 1_000, 1_000, Settings())
    assert result.severity == SeverityLevel.CRITICAL
    assert result.measurements["detection_count"] == 5


@pytest.mark.parametrize(
    "detections,width,height",
    [
        ([{"x1": 1, "y1": 1, "x2": 0, "y2": 4}], 100, 100),
        ([{"x1": -1, "y1": 1, "x2": 4, "y2": 4}], 100, 100),
        ([{}], 100, 100),
    ],
)
def test_invalid_measurements_are_rejected(detections, width, height) -> None:
    with pytest.raises(ValueError):
        classify_detections(detections, width, height, Settings())
