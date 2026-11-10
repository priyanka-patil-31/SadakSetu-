# Architecture

SadakSetu uses a single Android application module with a clean separation between:

- `core`: shared networking, persistence, permissions, device integrations, and UI theme/components.
- `data`: API models, local entities, and repository implementations.
- `domain`: application-facing models, repository contracts, and use cases.
- `presentation`: Compose screens and screen-level ViewModels.
- `navigation`: destination definitions and the app navigation graph.
- `di`: Hilt dependency bindings.

The backend is the source of truth for authentication, complaints, image metadata, AI detections, and notifications. Room is used as a cache/offline queue boundary, not as a replacement backend.
