# Phase 16 — Final testing and release preparation

Status: CONDITIONAL PASS

## Release artifacts

- Debug APK: app/build/outputs/apk/debug/app-debug.apk
- Minified release APK: app/build/outputs/apk/release/app-release-unsigned.apk
- Release configuration uses R8 shrinking and resource shrinking.

## Executed verification

| Pass | Result | Evidence |
| --- | --- | --- |
| Debug build | PASS | Gradle assembleDebug |
| Release build | PASS | Gradle assembleRelease |
| Unit tests | PASS | 5 JVM tests via testDebugUnitTest |
| Static analysis | PASS | lintDebug |
| Instrumentation test compilation | PASS | compileDebugAndroidTestKotlin |
| Instrumentation execution | PASS | Physical OnePlus CPH2613/API 36 and Motorola moto g34 5G/API 35 |
| Authentication end-to-end | PASS | Fresh account registration, sign-out, and login completed on the Motorola against the running SadakSetu backend |
| Dark/light theme and mobile options | PASS | Persistent Material 3 theme switch and notification preference compile and pass lint/unit/package verification |
| Complaint submission progress | PASS | Staged progress state is wired through complaint creation and photo upload UI |
| Debug mobile Demo login | PASS | Button is available when demo credentials are supplied at build time; final debug APK installed |
| Per-user complaint visibility | PASS | Backend citizen ownership filters plus Android reporter-ID cache/history filters |
| Complaint photo and map location | PASS | Protected image download/display and latitude/longitude map action are wired into complaint details |
| Mistaken complaint deletion | PASS | Own `SUBMITTED` complaints can be deleted after confirmation; later-status complaints remain protected and deletions are audited |
| Backend deletion integration suite | PASS | 3 targeted complaint integration tests |
| Updated APK installation | PASS | Debug APK installed on Motorola moto g34 5G/API 35 |
| Retrofit delete-body error fix | PASS | Complaint delete uses body-enabled `@HTTP` declaration; build, lint, and APK installation passed |
| Post-change device rerun | NOT COMPLETED | Motorola keyguard/NotificationShade was active; the app was installed but the Compose hierarchy could not be inspected |
| Screenshot/responsive execution | NOT COMPLETED | Device capture showed the lock screen/fingerprint prompt |
| Live API/end-to-end workflow | NOT RUN | Backend/device credentials and device unavailable |
| Security source checks | PASS | Encrypted session storage, release HTTPS-only policy, debug-only logging |

## Remaining release-gate work

Run the post-change instrumentation/delete-flow, screenshot, compatibility, and end-to-end API passes on at least one API 26 emulator, one current API emulator, and a tablet profile before publishing to users. This report does not claim those checks passed.

The release APK is intentionally unsigned because no production keystore was supplied. Configure release signing before distribution.
