# Phase 8 — Camera and gallery

Status: PASS (source/build scope)

## Work completed

- Added a CameraX preview and capture surface with lifecycle binding and back-camera selection.
- Added runtime camera permission request and denial recovery.
- Added Android Photo Picker gallery selection.
- Added FileProvider-backed cache files so captured images are not exposed through public storage.
- Added selected-photo preview and a 10 MB upload limit boundary.

## Verification

| Pass | Result | Evidence |
| --- | --- | --- |
| Build / compilation | PASS | Gradle debug assemble |
| Unit tests | PASS | Debug unit test task |
| Camera/gallery UI | NOT RUN | No emulator/device connected |
| Responsive screenshots | NOT RUN | Requires emulator/device |
| Live upload integration | NOT RUN | Requires configured backend |
| Regression | PASS | Debug build and lint include prior phases |
| Lint | PASS | Gradle debug lint |

Camera behavior is source-integrated but not claimed device-verified without a camera-capable emulator or physical device.
