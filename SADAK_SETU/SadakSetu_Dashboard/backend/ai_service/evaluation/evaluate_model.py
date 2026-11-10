"""Run and persist a measured Ultralytics evaluation on a prepared dataset."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

from ultralytics import YOLO

from ai_service.evaluation.prepare_dataset import DEFAULT_OUTPUT

DEFAULT_MODEL = Path(__file__).resolve().parents[2] / "models" / "baseline_yolo11.pt"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def evaluate(model_path: Path, dataset_path: Path, output_path: Path) -> dict[str, Any]:
    model_path = model_path.resolve()
    dataset_path = dataset_path.resolve()
    data_yaml = dataset_path / "data.yaml"
    if not model_path.is_file():
        raise FileNotFoundError(f"Model does not exist: {model_path}")
    if not data_yaml.is_file():
        raise FileNotFoundError(f"Prepared dataset manifest does not exist: {data_yaml}")
    model = YOLO(str(model_path))
    names = model.names.values() if isinstance(model.names, dict) else model.names
    if not any(str(name).casefold() == "pothole" for name in names):
        raise ValueError("Evaluation model does not expose a pothole class")
    metrics = model.val(
        data=str(data_yaml),
        split="test",
        imgsz=640,
        batch=1,
        device="cpu",
        workers=0,
        verbose=False,
        plots=False,
        save_json=False,
        project=str(output_path.parent),
        name=output_path.stem,
        exist_ok=True,
    )
    box = metrics.box
    result = {
        "model": {
            "path": str(model_path),
            "sha256": _sha256(model_path),
            "task": model.task,
            "names": {str(key): str(value) for key, value in model.names.items()}
            if isinstance(model.names, dict)
            else [str(value) for value in model.names],
        },
        "dataset": {
            "path": str(dataset_path),
            "manifest": str(dataset_path / "preparation-manifest.json"),
        },
        "split": "test",
        "metrics": {
            "precision": float(box.mp),
            "recall": float(box.mr),
            "map50": float(box.map50),
            "map50_95": float(box.map),
            "per_class_map50_95": [float(value) for value in box.maps],
        },
        "speed_ms_per_image": {key: float(value) for key, value in metrics.speed.items()},
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()
    output = args.output or args.dataset / "evaluation-test.json"
    print(json.dumps(evaluate(args.model, args.dataset, output), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()

