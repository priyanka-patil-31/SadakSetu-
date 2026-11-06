# SadakSetu Android final test report

Date: 2026-11-02
Project: /Users/nandish/Developer/Priyanka/Android Application
Result: CONDITIONAL PASS

## Executed

- Debug compilation and packaging: PASS
- Minified release compilation and packaging: PASS
- JVM unit tests: PASS, 5 tests
- Compose instrumentation test compilation: PASS
- Physical-device Compose instrumentation execution: PASS on OnePlus CPH2613, Android 16/API 36
- Multipass physical-device execution: PASS on Motorola moto g34 5G, Android 15/API 35; installed debug APK, registered a fresh citizen account, signed out, and logged back in against the SadakSetu backend
- Mobile preferences and submission progress implementation: PASS compilation, lint, unit tests, and debug packaging
- Debug mobile Demo login button: PASS; demo credentials injected only at debug build time and APK installed successfully
- Per-user complaint visibility: PASS implementation; backend reporter ownership plus user-scoped local cache filtering are in place
- Complaint detail media/location: PASS implementation; protected complaint photos download into the app and latitude/longitude are displayed with native map launch
- Mistaken complaint deletion: PASS implementation; citizens can delete only their own `SUBMITTED` complaint after confirmation, while admins retain submitted/rejected cleanup and audit logging records the deletion
- Backend complaint deletion integration tests: PASS, 3 tests
- Updated debug APK installed on connected Motorola moto g34 5G: PASS
- Retrofit complaint-delete body error: PASS; switched the DELETE endpoint to Retrofit `@HTTP(..., hasBody = true)` and reinstalled the APK
- Android lint: PASS
- Git whitespace check: PASS

## Not run

- Screenshot and responsive visual inspection: NOT COMPLETED; the captured frame showed the device lock screen/fingerprint prompt.
- Post-change physical-device instrumentation rerun: NOT COMPLETED; the connected Motorola was locked behind the system keyguard during the final rerun.
- Post-change API/device delete-flow execution: NOT COMPLETED; the phone was locked behind the system keyguard during the final device rerun.
- Final physical click-through of the delete button: NOT COMPLETED; the phone remained behind the system keyguard after the corrected APK was installed.
- API registration/login/complaint/image/GPS/AI/notification end-to-end flow: no complete live multipass was available after the delete change.
- API 26/current/tablet compatibility execution: no AVDs are installed.
- Runtime performance/memory profiling: no device was available.

## Known release conditions

- Release APK is unsigned; a production keystore must be configured before distribution.
- Debug uses the documented emulator URL http://10.0.2.2:8000/. Release cleartext is disabled and requires an HTTPS backend URL configuration.
- Firebase push delivery remains optional; durable notification history is integrated.
- The app uses the existing backend and admin dashboard; this change extends the backend complaint contract with an ownership-checked citizen delete operation.

## Artifacts

- Debug APK: app/build/outputs/apk/debug/app-debug.apk
- Release APK: app/build/outputs/apk/release/app-release-unsigned.apk
- Debug SHA-256: ddc498886a68d24bc504a49d2f8eb6c2563aa8f9b7c0ca923374919028317010
- Release SHA-256: c2f499fb9bef236f2db67a7df5887ff93186d062665b6638fe2a88313dc67111
