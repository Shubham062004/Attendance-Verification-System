"""
StreakService — calculates a student's consecutive daily attendance streak.

A "streak day" is any calendar day on which the student has at least one
attendance record with status PRESENT or FLAGGED (i.e. was physically
present, regardless of any risk flag).

Algorithm
---------
1. Query all PRESENT / FLAGGED attendance records for the student.
2. Extract unique submission dates (in local calendar days — we use UTC
   dates so the result is deterministic on the server).
3. Sort descending.
4. The streak starts from today or yesterday (if the student hasn't yet
   submitted today, their active streak still counts).
5. Increment for each consecutive preceding day.
"""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord, AttendanceStatus


class StreakService:
    @staticmethod
    def get_streak(db: Session, student_id: int) -> int:
        """
        Return the current consecutive-day attendance streak for a student.

        Returns 0 if the student has no qualifying attendance records, or if
        the last qualifying day was more than one calendar day ago.
        """
        records = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.status.in_(
                    [AttendanceStatus.PRESENT.value, AttendanceStatus.FLAGGED.value]
                ),
            )
            .all()
        )

        if not records:
            return 0

        # Deduplicate to unique UTC calendar dates
        unique_dates: set[date] = set()
        for r in records:
            submitted = r.submitted_at
            if submitted.tzinfo is None:
                # If stored as naive datetime treat as UTC
                submitted = submitted.replace(tzinfo=UTC)
            unique_dates.add(submitted.astimezone(UTC).date())

        sorted_dates = sorted(unique_dates, reverse=True)

        today = datetime.now(UTC).date()
        yesterday = today - timedelta(days=1)

        # Streak only counts if the latest day is today or yesterday
        if sorted_dates[0] not in (today, yesterday):
            return 0

        streak = 1
        prev = sorted_dates[0]
        for d in sorted_dates[1:]:
            if prev - d == timedelta(days=1):
                streak += 1
                prev = d
            else:
                break

        return streak
