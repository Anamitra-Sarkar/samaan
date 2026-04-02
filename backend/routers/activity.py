from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_active_user
from models.loan import LoanProof
from models.credit import CreditScore
from models.dbt import Disbursement, DBTCase, DBTStatus
from models.village import GapReport

router = APIRouter()


@router.get("/recent")
async def recent_activity(current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    def normalize_dt(value):
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def relative_time(value):
        if value is None:
            return "recent"
        delta = datetime.now(timezone.utc) - normalize_dt(value)
        minutes = max(int(delta.total_seconds() // 60), 0)
        if minutes < 1:
            return "just now"
        if minutes < 60:
            return f"{minutes} min ago"
        hours = minutes // 60
        if hours < 24:
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        days = hours // 24
        return f"{days} day{'s' if days != 1 else ''} ago"

    items = []

    for proof in db.query(LoanProof).order_by(LoanProof.created_at.desc()).limit(3).all():
        status = "success" if proof.ai_validation_status and proof.ai_validation_status.value == "approved" else "warning" if proof.ai_validation_status and proof.ai_validation_status.value == "manual_review" else "info"
        items.append({
            "source": "loan",
            "id": proof.id,
            "icon": "Upload",
            "title": "Loan proof uploaded",
            "description": f"{proof.original_filename} uploaded for Loan #{proof.loan_id}",
            "time_ago": relative_time(proof.created_at),
            "status": status,
            "_sort": normalize_dt(proof.created_at) or datetime.now(timezone.utc),
        })

    for score in db.query(CreditScore).order_by(CreditScore.scored_at.desc()).limit(2).all():
        items.append({
            "source": "credit",
            "id": score.id,
            "icon": "TrendingUp",
            "title": "Credit score updated",
            "description": f"Beneficiary #{score.beneficiary_id} scored {score.composite_score:.1f}",
            "time_ago": relative_time(score.scored_at),
            "status": "success" if score.composite_score >= 75 else "warning" if score.composite_score >= 50 else "info",
            "_sort": normalize_dt(score.scored_at) or datetime.now(timezone.utc),
        })

    for case in db.query(DBTCase).order_by(DBTCase.created_at.desc()).limit(2).all():
        status = "success" if case.status == DBTStatus.DISBURSED else "warning" if case.status in {DBTStatus.REGISTERED, DBTStatus.UNDER_REVIEW} else "info"
        items.append({
            "source": "dbt",
            "id": case.id,
            "icon": "Shield",
            "title": f"DBT case {case.status.value.replace('_', ' ')}",
            "description": f"Case #{case.id} for victim #{case.victim_id}",
            "time_ago": relative_time(case.updated_at or case.created_at),
            "status": status,
            "_sort": normalize_dt(case.updated_at or case.created_at) or datetime.now(timezone.utc),
        })

    for disbursement in db.query(Disbursement).order_by(Disbursement.disbursed_at.desc()).limit(2).all():
        items.append({
            "source": "dbt",
            "id": disbursement.id,
            "icon": "Shield",
            "title": "DBT disbursed",
            "description": f"{disbursement.transaction_ref} for case #{disbursement.case_id}",
            "time_ago": relative_time(disbursement.disbursed_at),
            "status": "success",
            "_sort": normalize_dt(disbursement.disbursed_at) or datetime.now(timezone.utc),
        })

    for report in db.query(GapReport).order_by(GapReport.generated_at.desc()).limit(2).all():
        items.append({
            "source": "village",
            "id": report.id,
            "icon": "Map",
            "title": "Gap report generated",
            "description": f"Village #{report.village_id} gap score {report.gap_score:.1f}",
            "time_ago": relative_time(report.generated_at),
            "status": "info",
            "_sort": normalize_dt(report.generated_at) or datetime.now(timezone.utc),
        })

    items.sort(key=lambda item: item["_sort"], reverse=True)
    return {"items": [{k: v for k, v in item.items() if k != "_sort"} for item in items[:8]]}
