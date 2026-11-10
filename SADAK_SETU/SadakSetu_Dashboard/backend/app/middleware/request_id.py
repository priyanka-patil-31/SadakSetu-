from uuid import uuid4

from starlette.types import ASGIApp, Receive, Scope, Send


class RequestIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request_id = next(
            (value.decode("latin-1") for key, value in scope.get("headers", []) if key.lower() == b"x-request-id"),
            None,
        ) or str(uuid4())
        scope["sadaksetu.request_id"] = request_id

        async def send_with_request_id(message):
            if message["type"] == "http.response.start":
                headers = [
                    (key, value) for key, value in message.get("headers", []) if key.lower() != b"x-request-id"
                ]
                headers.append((b"x-request-id", request_id.encode("latin-1")))
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_request_id)
