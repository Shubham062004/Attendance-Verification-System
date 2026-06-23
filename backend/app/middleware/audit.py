import json
from typing import Any

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.logging import logger
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User
from app.services.audit_service import AuditService


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only log actions that fall under the API (exclude docs, assets, health)
        path = request.url.path
        if path.startswith("/docs") or path.startswith("/redoc") or path == "/health" or path == "/favicon.ico":
            return await call_next(request)

        # Cache the request body for POST/PUT/PATCH/DELETE requests
        request_body = b""
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            try:
                request_body = await request.body()
                
                # Replace the receive channel to allow route handlers to read the body again
                async def receive():
                    return {"type": "http.request", "body": request_body, "more_body": False}
                    
                request._receive = receive
            except Exception as e:
                logger.error(f"Failed to read request body in AuditMiddleware: {str(e)}")

        # Call route handler
        response = await call_next(request)

        # Do not audit log client/server error responses (only audit 2xx and redirects < 400)
        if response.status_code >= 400:
            return response

        # Extract response body safely to parse returning metadata (e.g. login user info or record IDs)
        response_body = b""
        try:
            response_body_chunks = []
            async for chunk in response.body_iterator:
                response_body_chunks.append(chunk)
            response_body = b"".join(response_body_chunks)
            
            # Reconstruct the response so the client receives the body intact
            response = Response(
                content=response_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        except Exception as e:
            logger.error(f"Failed to copy response body in AuditMiddleware: {str(e)}")

        # Perform auditing asynchronously/in try-except block to not interrupt main flow
        try:
            db = SessionLocal()
            try:
                # 1. Resolve Actor Details (User)
                actor_id = None
                actor_name = None
                actor_role = None

                # Read Authorization header
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    payload = decode_access_token(token)
                    if payload and "sub" in payload:
                        actor_id = int(payload["sub"])
                        # Query user from DB for name & role
                        user = db.query(User).filter(User.id == actor_id).first()
                        if user:
                            actor_name = user.name
                            actor_role = user.role
                        else:
                            actor_role = payload.get("role")

                # Parse Response JSON if possible
                response_json = {}
                if response.headers.get("content-type") == "application/json" and response_body:
                    try:
                        response_json = json.loads(response_body.decode("utf-8"))
                    except Exception:
                        pass

                # Fallback to response payload for authentication endpoints (where JWT is generated in current call)
                if not actor_id and response_json and "user" in response_json:
                    user_data = response_json["user"]
                    actor_id = user_data.get("id")
                    actor_name = user_data.get("name")
                    actor_role = user_data.get("role")

                # 2. Get IP and User-Agent
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent")

                # 3. Resolve Audit Actions
                audit_records = self._resolve_audit_records(
                    request.method,
                    path,
                    response_json,
                    request_body,
                    actor_role,
                    actor_name
                )

                # 4. Insert resolved audit entries
                if audit_records:
                    for rec in audit_records:
                        action_type, entity_type, entity_id, description, metadata_json = rec
                        AuditService.log_action(
                            db=db,
                            actor_id=actor_id,
                            actor_name=actor_name,
                            actor_role=actor_role,
                            action_type=action_type,
                            entity_type=entity_type,
                            entity_id=entity_id,
                            description=description,
                            metadata_json=metadata_json,
                            ip_address=ip_address,
                            user_agent=user_agent
                        )
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Audit tracking failed in middleware: {str(e)}")

        return response

    def _resolve_audit_records(
        self,
        method: str,
        path: str,
        response_json: dict[str, Any],
        request_body: bytes,
        actor_role: str | None,
        actor_name: str | None
    ) -> list[tuple[str, str | None, int | None, str, dict[str, Any] | None]]:
        records: list[tuple[str, str | None, int | None, str, dict[str, Any] | None]] = []

        # 1. Authentication
        if path == "/auth/google" and method == "POST":
            user_data = response_json.get("user", {})
            name = user_data.get("name") or "User"
            records.append((
                "Login",
                "User",
                user_data.get("id"),
                f"User {name} logged in via Google OAuth.",
                None
            ))

        elif path == "/auth/developer-login" and method == "POST":
            user_data = response_json.get("user", {})
            records.append((
                "Developer Login",
                "User",
                user_data.get("id"),
                "Developer logged in via mock credentials.",
                None
            ))

        elif path == "/auth/logout" and method == "POST":
            action = "Developer Logout" if actor_role == "Developer" else "Logout"
            records.append((
                action,
                "User",
                None,
                "User logged out of the session.",
                None
            ))

        elif path == "/auth/register-student" and method == "POST":
            user_id = response_json.get("id")
            reg_num = response_json.get("registration_number")
            records.append((
                "Registration Completed",
                "User",
                user_id,
                f"Student completed onboarding with registration number: {reg_num}.",
                {"registration_number": reg_num}
            ))

        # 2. Profile
        elif path == "/users/profile" and method == "PATCH":
            user_id = response_json.get("id")
            new_name = response_json.get("name")
            records.append((
                "Profile Updated",
                "User",
                user_id,
                f"User updated profile name to: {new_name}.",
                {"name": new_name}
            ))

        # 3. Attendance Submission
        elif path == "/attendance/submit" and method == "POST":
            record_id = response_json.get("record_id")
            session_id = response_json.get("session_id")
            status = response_json.get("status")
            records.append((
                "Attendance Submitted",
                "AttendanceRecord",
                record_id,
                f"Attendance submitted for session {session_id}. Status: {status}.",
                {"session_id": session_id, "status": status}
            ))

        # Manual Add
        elif path == "/admin/attendance/add" and method == "POST":
            record_id = response_json.get("record_id")
            try:
                req_data = json.loads(request_body.decode("utf-8"))
            except Exception:
                req_data = {}
            student_id = req_data.get("student_id")
            session_id = req_data.get("session_id")
            status = req_data.get("status")
            records.append((
                "Attendance Submitted",
                "AttendanceRecord",
                record_id,
                f"Admin manually added attendance for student {student_id} in session {session_id}. Status: {status}.",
                {"student_id": student_id, "session_id": session_id, "status": status, "notes": req_data.get("notes")}
            ))

        # Override
        elif path.startswith("/admin/attendance/") and path.endswith("/override") and method == "POST":
            parts = path.split("/")
            try:
                record_id = int(parts[3])
            except Exception:
                record_id = None
            try:
                req_data = json.loads(request_body.decode("utf-8"))
            except Exception:
                req_data = {}
            status = req_data.get("status")
            records.append((
                "Attendance Overridden",
                "AttendanceRecord",
                record_id,
                f"Admin overrode attendance record #{record_id} to status: {status}.",
                {"status": status, "notes": req_data.get("notes"), "is_technical_issue": req_data.get("is_technical_issue")}
            ))
            # Also log Risk Overridden
            records.append((
                "Risk Overridden",
                "AttendanceRecord",
                record_id,
                f"Admin overrode risk assessment for attendance record #{record_id}.",
                {"status": status, "notes": req_data.get("notes")}
            ))

        # Delete
        elif path.startswith("/admin/attendance/") and method == "DELETE":
            parts = path.split("/")
            try:
                record_id = int(parts[3])
            except Exception:
                record_id = None
            records.append((
                "Attendance Deleted",
                "AttendanceRecord",
                record_id,
                f"Admin deleted attendance record #{record_id}.",
                None
            ))

        # 4. Sessions
        elif path == "/sessions" and method == "POST":
            session_id = response_json.get("id")
            title = response_json.get("title")
            records.append((
                "Session Created",
                "AttendanceSession",
                session_id,
                f"Created session ID {session_id}: {title}.",
                {"title": title, "subject": response_json.get("subject"), "class_name": response_json.get("class_name")}
            ))

        elif path.startswith("/sessions/") and path.endswith("/start") and method == "POST":
            parts = path.split("/")
            try:
                session_id = int(parts[2])
            except Exception:
                session_id = None
            code = response_json.get("session_code")
            records.append((
                "Session Started",
                "AttendanceSession",
                session_id,
                f"Started session ID {session_id} with code: {code}.",
                {"session_code": code}
            ))

        elif path.startswith("/sessions/") and path.endswith("/end") and method == "POST":
            parts = path.split("/")
            try:
                session_id = int(parts[2])
            except Exception:
                session_id = None
            records.append((
                "Session Ended",
                "AttendanceSession",
                session_id,
                f"Ended session ID {session_id}.",
                None
            ))

        elif path.startswith("/sessions/") and path.endswith("/reopen") and method == "POST":
            parts = path.split("/")
            try:
                session_id = int(parts[2])
            except Exception:
                session_id = None
            records.append((
                "Session Reopened",
                "AttendanceSession",
                session_id,
                f"Reopened session ID {session_id}.",
                None
            ))

        # 5. Risk
        elif path == "/risk/evaluate" and method == "POST":
            assessment_id = response_json.get("id")
            record_id = response_json.get("attendance_record_id")
            score = response_json.get("risk_score")
            level = response_json.get("risk_level")
            records.append((
                "Risk Generated",
                "RiskAssessment",
                assessment_id,
                f"Evaluated risk score: {score} ({level}) for attendance record #{record_id}.",
                {"attendance_record_id": record_id, "risk_score": score, "risk_level": level}
            ))

        elif path.startswith("/risk/") and path.endswith("/review") and method == "PATCH":
            parts = path.split("/")
            try:
                assessment_id = int(parts[2])
            except Exception:
                assessment_id = None
            record_id = response_json.get("attendance_record_id")
            try:
                req_data = json.loads(request_body.decode("utf-8"))
            except Exception:
                req_data = {}
            status_choice = req_data.get("status")
            action = "Risk Approved" if status_choice == "PRESENT" else "Risk Rejected"
            desc = (
                f"Reviewed and Approved risk assessment #{assessment_id} for record #{record_id}."
                if status_choice == "PRESENT"
                else f"Reviewed and Rejected risk assessment #{assessment_id} for record #{record_id}."
            )
            records.append((
                action,
                "RiskAssessment",
                assessment_id,
                desc,
                {"status": status_choice, "notes": req_data.get("notes")}
            ))

        # 6. Report exports
        elif path == "/reports/export/csv" and method == "GET":
            records.append((
                "CSV Export",
                "Report",
                None,
                "Exported daily attendance report as CSV.",
                None
            ))

        elif path == "/reports/export/excel" and method == "GET":
            records.append((
                "Excel Export",
                "Report",
                None,
                "Exported daily attendance report as Excel.",
                None
            ))

        elif path == "/reports/export/pdf" and method == "GET":
            records.append((
                "PDF Export",
                "Report",
                None,
                "Exported daily attendance report as PDF.",
                None
            ))

        return records
