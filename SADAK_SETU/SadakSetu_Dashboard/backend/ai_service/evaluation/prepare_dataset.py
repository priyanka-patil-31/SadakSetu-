"""Prepare the provided Roboflow export for single-class pothole evaluation.

The source export is never modified.  Its eight-class labels are reduced to the
``pothole`` class and polygon rows are converted to YOLO detection boxes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

DEFAULT_SOURCE = Path(__file__).resolve().parents[3] / "Pothole Detection.v1i.yolov11"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "datasets" / "provided_pothole_detection_yolo11_prepared"
SPLITS = ("train", "valid", "test")
POTHOLE_CLASS_INDEX = 6


@dataclass
class SplitSummary:
    images: int = 0
    source_label_rows: int = 0
    pothole_rows: int = 0
    converted_polygon_rows: int = 0
    preserved_box_rows: int = 0
    skipped_non_pothole_rows: int = 0
    skipped_invalid_rows: int = 0
    empty_output_labels: int = 0


def _sha256_tree(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(item for item in root.rglob("*") if item.is_file() and ".DS_Store" not in item.name):
        relative = path.relative_to(root).as_posix().encode()
        digest.update(relative)
        digest.update(b"\0")
        digest.update(path.read_bytes())
    return digest.hexdigest()


def _valid_number(value: str) -> float:
    number = float(value)
    if not 0 <= number <= 1:
        raise ValueError("coordinate outside normalized range")
    return number


def _convert_row(row: str) -> tuple[str | None, str]:
    """Return ``(converted_label, reason)`` for one source annotation row."""

    fields = row.split()
    if not fields:
        return None, "empty"
    try:
        class_index = int(fields[0])
    except ValueError:
        return None, "invalid_class"
    if class_index != POTHOLE_CLASS_INDEX:
        return None, "non_pothole"
    if len(fields) == 5:
        try:
            center_x, center_y, width, height = (_valid_number(value) for value in fields[1:])
        except (ValueError, TypeError):
            return None, "invalid_box"
        if width <= 0 or height <= 0:
            return None, "invalid_box"
        return f"0 {center_x:.10f} {center_y:.10f} {width:.10f} {height:.10f}", "box"
    if len(fields) < 7 or len(fields[1:]) % 2:
        return None, "invalid_polygon"
    try:
        coordinates = [_valid_number(value) for value in fields[1:]]
    except (ValueError, TypeError):
        return None, "invalid_polygon"
    x_values = coordinates[0::2]
    y_values = coordinates[1::2]
    min_x, max_x = min(x_values), max(x_values)
    min_y, max_y = min(y_values), max(y_values)
    width, height = max_x - min_x, max_y - min_y
    if width <= 0 or height <= 0:
        return None, "invalid_polygon"
    center_x, center_y = (min_x + max_x) / 2, (min_y + max_y) / 2
    return f"0 {center_x:.10f} {center_y:.10f} {width:.10f} {height:.10f}", "polygon"


def prepare_dataset(source: Path, output: Path) -> dict[str, Any]:
    """Create a deterministic, single-class detector dataset and return its manifest."""

    source = source.resolve()
    output = output.resolve()
    if not source.is_dir():
        raise FileNotFoundError(f"Source dataset does not exist: {source}")
    source_yaml = source / "data.yaml"
    metadata = yaml.safe_load(source_yaml.read_text(encoding="utf-8"))
    source_names = metadata.get("names", [])
    if len(source_names) <= POTHOLE_CLASS_INDEX or str(source_names[POTHOLE_CLASS_INDEX]).casefold() != "pothole":
        raise ValueError("Expected source class index 6 to be pothole")

    output.mkdir(parents=True, exist_ok=True)
    summaries: dict[str, SplitSummary] = {}
    invalid_rows: list[dict[str, Any]] = []
    for split in SPLITS:
        source_images = source / split / "images"
        source_labels = source / split / "labels"
        if not source_images.is_dir() or not source_labels.is_dir():
            raise FileNotFoundError(f"Expected split directories for {split}")
        destination_images = output / split / "images"
        destination_labels = output / split / "labels"
        destination_images.mkdir(parents=True, exist_ok=True)
        destination_labels.mkdir(parents=True, exist_ok=True)
        summary = summaries[split] = SplitSummary()
        for image_path in sorted(path for path in source_images.iterdir() if path.is_file()):
            summary.images += 1
            shutil.copy2(image_path, destination_images / image_path.name)
            source_label = source_labels / f"{image_path.stem}.txt"
            destination_label = destination_labels / source_label.name
            output_rows: list[str] = []
            if source_label.is_file():
                for line_number, row in enumerate(source_label.read_text(encoding="utf-8").splitlines(), start=1):
                    if not row.strip():
                        continue
                    summary.source_label_rows += 1
                    converted, reason = _convert_row(row)
                    if reason == "non_pothole":
                        summary.skipped_non_pothole_rows += 1
                    elif reason == "box":
                        summary.pothole_rows += 1
                        summary.preserved_box_rows += 1
                        output_rows.append(converted or "")
                    elif reason == "polygon":
                        summary.pothole_rows += 1
                        summary.converted_polygon_rows += 1
                        output_rows.append(converted or "")
                    else:
                        summary.skipped_invalid_rows += 1
                        invalid_rows.append(
                            {"split": split, "label": source_label.name, "line": line_number, "reason": reason}
                        )
            if not output_rows:
                summary.empty_output_labels += 1
            destination_label.write_text("\n".join(output_rows) + ("\n" if output_rows else ""), encoding="utf-8")

    data = {
        "path": str(output),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": 1,
        "names": ["pothole"],
    }
    (output / "data.yaml").write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    manifest = {
        "source": str(source),
        "source_tree_sha256": _sha256_tree(source),
        "source_project": metadata.get("roboflow", {}),
        "source_class_index": POTHOLE_CLASS_INDEX,
        "source_class_name": "pothole",
        "output": str(output),
        "output_task": "single-class YOLO detection",
        "splits": {split: vars(summary) for split, summary in summaries.items()},
        "invalid_rows": invalid_rows,
        "policy": {
            "non_pothole_classes": "excluded",
            "polygon_annotations": "converted to tight normalized bounding boxes",
            "invalid_annotations": "excluded and listed in invalid_rows",
            "original_source_modified": False,
        },
    }
    manifest_path = output / "preparation-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    manifest = prepare_dataset(args.source, args.output)
    print(json.dumps(manifest, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()

