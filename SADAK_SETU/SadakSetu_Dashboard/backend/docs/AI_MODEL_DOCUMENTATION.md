# SadakSetu AI Detection

## Current status

The AI service exposes a real inference contract. The selected evaluation candidate is a public DanielsStulpe YOLO11 baseline checkpoint, stored locally only at `backend/models/baseline_yolo11.pt` and ignored by Git. Its SHA-256 is `72611b4b92e5a00abb607a38d81113bc08fc88a471fb57dabd8fefc2fbad891b`. The checkpoint loaded successfully and exposed the single `pothole` class.

Source model card: <https://huggingface.co/DanielsStulpe/pothole-detection>. The associated public repository states MIT licensing and lists YOLO11/YOLO26 checkpoints; licensing and provenance must be retained with any redistributed artifact.

The service requires `AI_MODEL_PATH` to point to a reviewed checkpoint. At load time it verifies that Ultralytics can load the checkpoint and that the model exposes a `pothole` class. A generic COCO checkpoint is rejected by this class check.

## API

- `POST /api/v1/ai/images/{image_id}/detect` starts inference for an authorized complaint image.
- `GET /api/v1/ai/images/{image_id}/detections` returns detection history.

If the checkpoint is unavailable, the POST endpoint returns HTTP 503 and persists a `FAILED` `ai_detections` record with an explicit error message. It never returns fake boxes or confidence values. This behavior is covered by a live integration test.

Successful inference stores model name/version, processing time, detection count, pothole bounding boxes, confidence scores, and an annotated image path in PostgreSQL metadata.

## Model and dataset policy

- Candidate model must be pothole-specific YOLO11 or YOLO26.
- The Intel Unnati Roboflow v9 source, RDD2022 source, and separately verified user-provided local export are documented in `docs/dataset-sources.md`.
- Dataset archives and weights remain outside Git under the ignored dataset/model paths.
- Evaluation must be reproducible and report only measured metrics.
- Severity classification is separate from detector confidence and belongs to Phase 7.

The optional AI dependencies are listed separately in `ai_service/requirements.txt`; they are not required by the base backend requirements, but are installed in this development environment for the checkpoint smoke test.

## Evaluation result

The provided local export was prepared reproducibly by filtering source class index 6 (`pothole`) and converting its polygon rows to tight normalized detection boxes. The original export remains unchanged. The test split contains 246 images and 473 pothole instances.

Measured test-split result for `baseline_yolo11.pt`:

- Precision: `0.8441`
- Recall: `0.6980`
- mAP@0.50: `0.7683`
- mAP@0.50:0.95: `0.5736`
- CPU inference: `129.61 ms/image` at `imgsz=640`, batch size 1

The machine-readable evaluation result and preparation manifest are generated under the ignored `backend/datasets/provided_pothole_detection_yolo11_prepared/` directory when the evaluation commands run. Generated evaluation artifacts are not retained in the working tree. These metrics apply only to the supplied local Roboflow v1 export. That export is not the exact Intel Unnati v9 dataset, whose download route previously returned HTTP 403 without a Roboflow credential. Exact v9 evaluation remains pending if that source is required.
