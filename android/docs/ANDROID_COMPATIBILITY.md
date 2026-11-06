# Android compatibility matrix

| Dimension | Declared support | Verification status |
| --- | --- | --- |
| Minimum SDK | Android 8.0 / API 26 | Build configured; emulator execution requires an installed AVD |
| Target SDK | API 35 | Build configured |
| Compile SDK | API 37 | Build verified against installed SDK |
| Phone layouts | Compact through expanded Compose layouts | Source-level adaptive layouts; screenshot execution pending emulator availability |
| Tablet layouts | Expanded width support | Source-level adaptive layouts; screenshot execution pending emulator availability |
| Camera | Optional hardware; runtime permission | Manifest and runtime path implemented in later phases |
| Location | Coarse/fine runtime permission | Permission denial is handled in later phases |
| Notifications | POST_NOTIFICATIONS on Android 13+ | Permission handling implemented in later phases |

The project does not claim device or API-level coverage beyond the rows above until an emulator or physical device executes the corresponding tests.
