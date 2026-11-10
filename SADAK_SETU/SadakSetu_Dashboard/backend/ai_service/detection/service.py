from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import Any

from app.core.config import Settings


class ModelUnavailableError(RuntimeError):
    """Raised when a verified pothole-specific checkpoint is not available."""


@dataclass(frozen=True)
class DetectionResult:
    boxes: list[dict[str, float | str]]
    processing_time_ms: int
    image_width: int
    image_height: int
    annotated_image: Any | None = None


_MODEL_CACHE: dict[str, Any] = {}


class PotholeDetector:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = self._get_or_load_model()

    def _model_path(self) -> Path:
        path = Path(self.settings.ai_model_path)
        if not path.is_absolute():
            path = Path(__file__).resolve().parents[2] / path
        return path.resolve()

    def _get_or_load_model(self):
        path = self._model_path()
        path_str = str(path)
        if path_str in _MODEL_CACHE:
            return _MODEL_CACHE[path_str]

        model = self._load_verified_model()
        _MODEL_CACHE[path_str] = model
        return model

    def _load_verified_model(self):
        path = self._model_path()
        if not path.is_file():
            raise ModelUnavailableError(
                f"Verified pothole-specific checkpoint is unavailable at {path}. "
                "Configure AI_MODEL_PATH with a reviewed checkpoint."
            )
        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise ModelUnavailableError("Ultralytics is not installed for the AI service") from exc

        model = YOLO(str(path))
        names = model.names.values() if isinstance(model.names, dict) else model.names
        if not any(str(name).casefold() == "pothole" for name in names):
            raise ModelUnavailableError("Configured checkpoint does not expose a pothole class")
        return model

    def detect(self, image_path: Path, annotated_path: Path) -> DetectionResult:
        started = perf_counter()
        from PIL import Image

        with Image.open(image_path) as source_image:
            image_width, image_height = source_image.size
        results = self.model(str(image_path), verbose=False)
        first = results[0]
        names = first.names.values() if isinstance(first.names, dict) else first.names
        name_by_index = {index: str(name) for index, name in enumerate(names)}
        boxes: list[dict[str, float | str]] = []
        for xyxy, confidence, class_index in zip(
            first.boxes.xyxy.tolist(), first.boxes.conf.tolist(), first.boxes.cls.tolist(), strict=False
        ):
            label = name_by_index[int(class_index)]
            if label.casefold() != "pothole":
                continue
            boxes.append(
                {
                    "x1": float(xyxy[0]),
                    "y1": float(xyxy[1]),
                    "x2": float(xyxy[2]),
                    "y2": float(xyxy[3]),
                    "confidence": float(confidence),
                    "label": label,
                }
            )

        annotated_path.parent.mkdir(parents=True, exist_ok=True)
        annotated = first.plot()
        Image.fromarray(annotated[:, :, ::-1]).save(annotated_path)
        return DetectionResult(
            boxes=boxes,
            processing_time_ms=max(0, round((perf_counter() - started) * 1000)),
            image_width=image_width,
            image_height=image_height,
            annotated_image=annotated_path,
        )


__all__ = ["DetectionResult", "ModelUnavailableError", "PotholeDetector"]
