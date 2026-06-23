from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.audit import AuditLogPaginatedResponse, AuditLogResponse
from app.services.audit_service import AuditService
from app.utils.auth import RoleChecker

router = APIRouter(prefix="/audit", tags=["audit"])

admin_or_dev_required = Depends(RoleChecker(["Admin", "Developer"]))


@router.get("", response_model=AuditLogPaginatedResponse, dependencies=[admin_or_dev_required])
def get_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    action_type: str | None = Query(None),
    actor_role: str | None = Query(None),
    entity_type: str | None = Query(None),
    actor_id: int | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get paginated, filtered system audit logs. (Admin/Developer only)
    """
    items, total = AuditService.search_logs(
        db=db,
        page=page,
        size=size,
        action_type=action_type,
        actor_role=actor_role,
        entity_type=entity_type,
        actor_id=actor_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
    )
    return AuditLogPaginatedResponse(items=items, total=total, page=page, size=size)


@router.get("/export", dependencies=[admin_or_dev_required])
def export_audit_logs(
    format: str = Query(..., description="Export format: csv, excel, pdf"),
    action_type: str | None = Query(None),
    actor_role: str | None = Query(None),
    entity_type: str | None = Query(None),
    actor_id: int | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db)
):
    """
    Export audit logs in CSV, Excel, or PDF format. (Admin/Developer only)
    """
    try:
        content = AuditService.export_logs(
            db=db,
            format_type=format,
            action_type=action_type,
            actor_role=actor_role,
            entity_type=entity_type,
            actor_id=actor_id,
            start_date=start_date,
            end_date=end_date,
            search=search,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    current_date = datetime.now(UTC).strftime("%Y-%m-%d")
    
    if format.lower() == "csv":
        filename = f"Audit_Log_{current_date}.csv"
        media_type = "text/csv"
    elif format.lower() == "excel":
        filename = f"Audit_Log_{current_date}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        filename = f"Audit_Log_{current_date}.pdf"
        media_type = "application/pdf"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.get("/user/{id}", response_model=list[AuditLogResponse], dependencies=[admin_or_dev_required])
def get_user_audit_logs(id: int, db: Session = Depends(get_db)):
    """
    Get audit logs for a specific user. (Admin/Developer only)
    """
    return AuditService.get_by_user(db, id)


@router.get("/entity/{entity_id}", response_model=list[AuditLogResponse], dependencies=[admin_or_dev_required])
def get_entity_audit_logs(
    entity_id: int,
    entity_type: str | None = Query(None, description="Optional entity type filter"),
    db: Session = Depends(get_db)
):
    """
    Get audit logs for a specific database entity/record. (Admin/Developer only)
    """
    return AuditService.get_by_entity(db, entity_id, entity_type)


@router.get("/{id}", response_model=AuditLogResponse, dependencies=[admin_or_dev_required])
def get_audit_log_detail(id: int, db: Session = Depends(get_db)):
    """
    Get detailed audit log by ID. (Admin/Developer only)
    """
    log = AuditService.get_by_id(db, id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit log #{id} not found"
        )
    return log
