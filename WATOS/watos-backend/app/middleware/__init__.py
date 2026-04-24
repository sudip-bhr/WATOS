"""
Audit logging middleware for WATOS v2.5.

Automatically logs all state-changing HTTP requests (POST, PATCH, PUT, DELETE)
to the audit_logs table, capturing who did what, when, and from where.
"""

import uuid
import json
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy import text


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Middleware that auto-logs all write operations."""

    LOGGED_METHODS = {"POST", "PATCH", "PUT", "DELETE"}

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Only log state-changing methods that succeeded
        if request.method not in self.LOGGED_METHODS:
            return response
        if response.status_code >= 400:
            return response

        # Extract user ID from the JWT (best-effort, don't block on failure)
        user_id = None
        try:
            from app.core.security import decode_access_token
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1]
                payload = decode_access_token(token)
                user_id = payload.get("sub")
        except Exception:
            pass

        # Extract resource info from path
        path_parts = request.url.path.strip("/").split("/")
        # e.g. /api/v1/tasks/abc123 → resource="tasks", resource_id="abc123"
        resource = None
        resource_id = None
        if len(path_parts) >= 3:
            resource = path_parts[3] if len(path_parts) > 3 else path_parts[-1]
        if len(path_parts) >= 5:
            try:
                resource_id = str(uuid.UUID(path_parts[4]))
            except (ValueError, IndexError):
                resource_id = None

        # Persist asynchronously (fire-and-forget)
        try:
            from app.db.session import async_session_factory
            async with async_session_factory() as session:
                await session.execute(
                    text(
                        "INSERT INTO audit_logs (id, user_id, organization_id, action, resource, resource_id, details, created_at) "
                        "VALUES (:id, :user_id, (SELECT organization_id FROM users WHERE id = CAST(:user_id AS UUID)), :action, :resource, :resource_id, :details, now())"
                    ),
                    {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "action": request.method,
                        "resource": resource,
                        "resource_id": resource_id,
                        "details": json.dumps({
                            "path": str(request.url.path),
                            "query": str(request.url.query),
                            "status": response.status_code,
                            "ip": request.client.host if request.client else None,
                        }),
                    },
                )
                await session.commit()
        except Exception:
            # Never let audit logging crash the request
            pass

        return response
