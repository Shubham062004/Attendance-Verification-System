from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.reports import (
    AttendanceSummaryResponse,
    EODReportResponse,
    SessionReportResponse,
    StudentReportResponse,
)
from app.services.reporting_service import ReportingService
from app.utils.auth import RoleChecker, get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

admin_or_dev_required = Depends(RoleChecker(["Admin", "Developer"]))


@router.get("/eod", response_model=EODReportResponse, dependencies=[admin_or_dev_required])
def get_eod_report(
    date: str = Query(None, description="Target date in format YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """
    Get daily EOD report data for a specific date (defaults to today). (Admin/Developer only)
    """
    target_date = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.now(UTC).date()
    return ReportingService.get_eod_data(db, target_date)


@router.get("/student/{id}", response_model=StudentReportResponse, dependencies=[admin_or_dev_required])
def get_student_report(id: int, db: Session = Depends(get_db)):
    """
    Get student-wise report metrics. (Admin/Developer only)
    """
    return ReportingService.get_student_report(db, id)


@router.get("/session/{id}", response_model=SessionReportResponse, dependencies=[admin_or_dev_required])
def get_session_report(id: int, db: Session = Depends(get_db)):
    """
    Get session-wise report metrics. (Admin/Developer only)
    """
    return ReportingService.get_session_report(db, id)


@router.get("/summary", response_model=AttendanceSummaryResponse, dependencies=[admin_or_dev_required])
def get_summary_metrics(db: Session = Depends(get_db)):
    """
    Retrieve overview cards of highest, lowest, and average attendance ratios. (Admin/Developer only)
    """
    return ReportingService.get_summary_metrics(db)


@router.get("/export/csv", dependencies=[admin_or_dev_required])
def export_csv_report(
    date: str = Query(None, description="Target date in format YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download daily EOD attendance report as CSV. (Admin/Developer only)
    """
    target_date = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.now(UTC).date()
    csv_content = ReportingService.generate_csv(db, target_date, int(current_user.id))
    
    filename = f"Attendance_Report_{target_date.strftime('%Y-%m-%d')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.get("/export/excel", dependencies=[admin_or_dev_required])
def export_excel_report(
    date: str = Query(None, description="Target date in format YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download daily EOD attendance report as styled Excel. (Admin/Developer only)
    """
    target_date = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.now(UTC).date()
    excel_content = ReportingService.generate_excel(db, target_date, int(current_user.id))
    
    filename = f"Attendance_Report_{target_date.strftime('%Y-%m-%d')}.xlsx"
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.get("/export/pdf", dependencies=[admin_or_dev_required])
def export_pdf_report(
    date: str = Query(None, description="Target date in format YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download daily EOD attendance report as printable PDF. (Admin/Developer only)
    """
    target_date = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.now(UTC).date()
    pdf_content = ReportingService.generate_pdf(db, target_date, int(current_user.id))
    
    filename = f"Attendance_Report_{target_date.strftime('%Y-%m-%d')}.pdf"
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
