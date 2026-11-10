# SadakSetu AI dataset sources

This document records source verification, the supplied local export, and the reproducible derived-data evaluation performed for Phase 6. Dataset archives and derived copies remain ignored by Git.

## Primary: Intel Unnati Pothole Detection, Roboflow Universe v9

- Source: <https://universe.roboflow.com/intel-unnati-training-program/pothole-detection-bqu6s/dataset/9>
- Purpose: primary pothole detection dataset for a later evaluation phase.
- Availability check: the v9 dataset page was reachable during Phase 0 verification.
- Published version: v9, generated July 14, 2023 / published July 15, 2023 according to the page.
- Annotation/export formats shown: YOLO26, YOLOv12, YOLO11, YOLOv9, and YOLOv8 TXT annotations with YAML configuration.
- Dataset split shown: 3,033 train images, 491 validation images, and 246 test images (3,770 total).
- License shown by the source page: MIT.
- Class-label status: the page reports eight classes and visibly lists labels including `pothole`, `hole`, `manhole`, `circle-drain-clean-`, `Drain Hole`, `drain-clean-`, `drain-not clean-`, and `sewer cover`. Exact class order and any remapping must be read from the downloaded v9 YAML before integration; the page also reports class preprocessing/remapping.
- Download instruction for a later phase: use the source page's v9 download flow, record the selected export format, preserve the license/citation, and store the archive only under `backend/datasets/roboflow_intel_unnati_v9/`.

## Secondary: RDD2022

- Source repository: <https://github.com/sekilab/RoadDamageDetector>
- Dataset reference: <https://figshare.com/articles/dataset/RDD2022_-_The_multi-national_Road_Damage_Dataset_released_through_CRDDC_2022/21431547>
- Purpose: secondary road-damage research, evaluation, and compatible pothole testing.
- Availability check: the Git repository was reachable and its `master` branch was visible during Phase 0 verification.
- Annotation format: training annotations are Pascal VOC XML; test data is distributed as images without labels.
- Countries listed: Japan, India, Czech Republic, Norway, United States, and China.
- Relevant labels: `D00` longitudinal crack, `D10` transverse crack, `D20` alligator crack, and `D40` pothole.
- Image license stated by the source documentation: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).
- Download instruction for a later phase: select a documented country subset, record the archive URL and checksum, preserve attribution/share-alike obligations, and store it only under `backend/datasets/rdd2022/`.

## Model-selection status

No YOLO11/YOLO26 checkpoint has been selected, downloaded, or evaluated in Phase 0. A later AI phase must verify that a candidate checkpoint actually supports pothole detection, record its license and version, and report measured evaluation results only after running a reproducible evaluation. A generic COCO checkpoint must not be treated as a pothole detector.

## Provided local export verification — 2026-11-02

The project contains `Pothole Detection.v1i.yolov11/` at the repository root. It is a readable Roboflow export with `train`, `valid`, and `test` splits, 2,475 JPEG images, matching label-file counts, and `data.yaml`. Its metadata declares MIT licensing and identifies Roboflow project `yimiha5190-37xiao-com/pothole-detection-bqu6s-jjazt`, version 1.

This is not an exact match for the requested Intel Unnati v9 primary dataset: the metadata identifies a different Roboflow project/version and declares eight classes (`Drain Hole`, `circle-drain-clean-`, `drain-clean-`, `drain-not clean-`, `hole`, `manhole`, `pothole`, `sewer cover`). It also contains polygon-style segmentation rows rather than the five-column detection rows expected by the current single-class `baseline_yolo11.pt` detector. Integrity checks found 9 malformed annotation rows (3 train, 6 valid), no missing/orphan label files, and no unreadable images. The test split had no malformed rows.

Verdict: usable as a local pothole evaluation source after the reproducible derived-data step in `ai_service/evaluation/prepare_dataset.py`, which filters class index 6 (`pothole`) and converts polygon rows to tight bounding boxes. The original directory is preserved unchanged and ignored by Git. The derived output contains 2,475 images and 4,713 pothole annotations.

Verification fingerprint used by the preparation manifest: deterministic source tree SHA-256 `5328512e47252da7780cbf08feebca564b8236e2b43833aa0d27dd9e7c208147` (4,955 files; `.DS_Store` files excluded from the digest).

## Reproducible preparation and evaluation

From `backend/`:

```bash
.venv/bin/python -m ai_service.evaluation.prepare_dataset
.venv/bin/python -m ai_service.evaluation.evaluate_model
```

The preparation manifest records source identity, per-split counts, class filtering, polygon conversion, and invalid rows. The evaluation JSON records the model checksum, dataset path, measured precision/recall/mAP, and CPU timing. The latest evaluation measured precision `0.8441`, recall `0.6980`, mAP@0.50 `0.7683`, and mAP@0.50:0.95 `0.5736` on the supplied test split. These metrics must not be attributed to the exact Intel Unnati v9 source.
