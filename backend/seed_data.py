from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw

from database import SessionLocal, Base, engine
from models.user import User, UserRole, BeneficiaryProfile
from models.loan import LoanRecord, LoanProof, LoanStatus, LoanProofValidationStatus
from models.credit import ConsumptionData, LoanRepaymentSummary, CreditScore, LendingApplication, RiskBand
from models.village import Village, InfrastructureItem, InfrastructureCategory, InfrastructureStatus, GapReport
from models.agency import Agency, AgencyMapping, AgencyType, AgencyRole, PMSAJAYComponent as PMSAJAYComponentModel, FundAllocation, ProjectMilestone, MilestoneStatus
from models.dbt import Victim, DBTCase, Disbursement, GrievanceTicket, CaseType, AssistanceType, DBTStatus, GrievanceCategory, GrievanceStatus, VerificationStatus
from models.notification import Notification
from routers.auth import get_password_hash
from ml.credit_model import compute_composite_score
from ml.gap_analyzer import evaluate_village_gap
from utils.file_utils import ensure_upload_root


def _dummy_image(path: Path, label: str, color: tuple[int, int, int]) -> None:
    img = Image.new("RGB", (1024, 768), color)
    draw = ImageDraw.Draw(img)
    draw.rectangle([80, 80, 944, 688], outline=(255, 255, 255), width=6)
    draw.text((120, 120), label, fill=(255, 255, 255))
    img.save(path)


def _get_or_create(db, model, defaults=None, **kwargs):
    obj = db.query(model).filter_by(**kwargs).first()
    if obj:
        return obj, False
    params = dict(defaults or {})
    params.update(kwargs)
    obj = model(**params)
    db.add(obj)
    db.flush()
    return obj, True


def seed_sample_data() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).count() > 0 or os.getenv("SAMAAN_ENABLE_SAMPLE_DATA", "").lower() not in {"1", "true", "yes"}:
            return

        rng = Random(42)
        uploads = ensure_upload_root()

        # Users
        users = []
        user_specs = [
            ("9999999999", "Admin User", "admin123", UserRole.ADMIN, "Delhi", "New Delhi"),
            ("7777777777", "Anita Devi", "officer123", UserRole.STATE_OFFICER, "Uttar Pradesh", "Lucknow"),
            ("7766666666", "Ramesh Kumar", "officer123", UserRole.STATE_OFFICER, "Bihar", "Patna"),
            ("6666666666", "Neha Sharma", "bank123", UserRole.BANK_OFFICER, "Delhi", "New Delhi"),
            ("8888888888", "Rajesh Kumar", "user123", UserRole.BENEFICIARY, "Rajasthan", "Jaipur"),
            ("8888888887", "Sunita Devi", "user123", UserRole.BENEFICIARY, "Uttar Pradesh", "Varanasi"),
        ]
        for mobile, name, password, role, state, district in user_specs:
            user = User(mobile=mobile, name=name, password_hash=get_password_hash(password), role=role, state=state, district=district)
            db.add(user)
            users.append(user)
        db.flush()

        beneficiaries = [u for u in users if u.role == UserRole.BENEFICIARY]
        officers = [u for u in users if u.role != UserRole.BENEFICIARY]

        # Beneficiary profiles
        for user, aadhaar, income, family, occupation in zip(
            beneficiaries,
            ["1234", "5678"],
            [62000, 94000],
            [5, 4],
            ["self-help group member", "small farmer"],
        ):
            db.add(BeneficiaryProfile(
                user_id=user.id,
                aadhaar_last4=aadhaar,
                caste_category="SC",
                annual_income_estimate=income,
                family_size=family,
                occupation=occupation,
                bank_account_last4="4321",
                bank_name="State Bank of India",
                ifsc_code="SBIN0000001",
                address=f"{user.district}, {user.state}",
                pincode="110001",
            ))

        # Agencies and components
        component_rows = {}
        for comp_name, desc in [
            ("adarsh_gram", "Adarsh Gram component"),
            ("grant_in_aid", "Grant in aid component"),
            ("hostel", "Hostel infrastructure component"),
        ]:
            component = PMSAJAYComponentModel(name=comp_name, description=desc)
            db.add(component)
            db.flush()
            component_rows[comp_name] = component

        agencies = []
        agency_specs = [
            ("Uttar Pradesh Social Welfare Department", AgencyType.STATE_GOVERNMENT, "Uttar Pradesh", "swd.up@gov.in"),
            ("Bihar Social Welfare Department", AgencyType.STATE_GOVERNMENT, "Bihar", "swd.bihar@gov.in"),
            ("Rajasthan Social Justice Department", AgencyType.STATE_GOVERNMENT, "Rajasthan", "sjd.rajasthan@gov.in"),
            ("National Scheduled Castes Finance and Development Corporation", AgencyType.CENTRAL_MINISTRY, "Delhi", "nsfdc@gov.in"),
            ("District Rural Development Agency Lucknow", AgencyType.EXECUTING_AGENCY, "Uttar Pradesh", "drda.lucknow@gov.in"),
            ("District Rural Development Agency Patna", AgencyType.EXECUTING_AGENCY, "Bihar", "drda.patna@gov.in"),
            ("District Rural Development Agency Jaipur", AgencyType.EXECUTING_AGENCY, "Rajasthan", "drda.jaipur@gov.in"),
            ("State Bank of India", AgencyType.FINANCIAL_INSTITUTION, "Delhi", "sbi@gov.in"),
            ("National Institute of Social Defence", AgencyType.CENTRAL_MINISTRY, "Delhi", "nisd@gov.in"),
            ("Jan Seva Foundation", AgencyType.NGO, "Uttar Pradesh", "contact@janseva.org"),
        ]
        for idx, (name, type_, state, email) in enumerate(agency_specs, start=1):
            agency = Agency(
                name=name,
                type=type_,
                state=state,
                contact_email=email,
                contact_phone=f"98765{idx:05d}",
                head_name=f"Head {idx}",
                address=f"{state}, India",
            )
            db.add(agency)
            db.flush()
            agencies.append(agency)

        mappings = []
        for agency, component_name, role in [
            (agencies[0], "adarsh_gram", AgencyRole.IMPLEMENTING),
            (agencies[1], "grant_in_aid", AgencyRole.EXECUTING),
            (agencies[2], "adarsh_gram", AgencyRole.MONITORING),
            (agencies[3], "grant_in_aid", AgencyRole.FUNDING),
            (agencies[4], "hostel", AgencyRole.EXECUTING),
        ]:
            mapping = AgencyMapping(
                agency_id=agency.id,
                component_id=component_rows[component_name].id,
                role=role,
                state=agency.state or "India",
                notes="Seeded mapping",
            )
            db.add(mapping)
            db.flush()
            mappings.append(mapping)
            db.add(FundAllocation(mapping_id=mapping.id, total_allocated=5000000 + mapping.id * 250000, total_released=4000000 + mapping.id * 150000, total_utilized=3200000 + mapping.id * 120000, financial_year="2024-2025"))
            db.add(ProjectMilestone(mapping_id=mapping.id, milestone_name="Initial review", target_date=datetime.now(timezone.utc) + timedelta(days=30), status=MilestoneStatus.IN_PROGRESS, remarks="Seed milestone"))

        # Villages and infrastructure
        village_specs = [
            ("Barauli", "Uttar Pradesh", "Gorakhpur", "Sahjanwa", 52.0, 5400, 26.9, 83.4),
            ("Sahora", "Bihar", "Gaya", "Wazirganj", 58.0, 6200, 25.0, 85.1),
            ("Khetasar", "Rajasthan", "Banswara", "Ghatol", 61.5, 4800, 23.1, 74.4),
            ("Madhopur", "Uttar Pradesh", "Bahraich", "Mahasi", 44.0, 5100, 27.8, 81.5),
            ("Navapura", "Bihar", "Nalanda", "Hilsa", 47.5, 7300, 25.1, 85.3),
            ("Sundarpur", "Rajasthan", "Udaipur", "Girwa", 39.0, 4200, 24.6, 73.7),
        ]
        villages = []
        for name, state, district, block, sc_pct, pop, lat, lng in village_specs:
            village = Village(name=name, state=state, district=district, block=block, sc_population_pct=sc_pct, total_population=pop, lat=lat, lng=lng, is_adarsh_gram=sc_pct >= 55, declared_date=datetime.now(timezone.utc) - timedelta(days=rng.randint(30, 900)) if sc_pct >= 55 else None)
            db.add(village)
            db.flush()
            villages.append(village)
            for category, items in {
                InfrastructureCategory.EDUCATION: ["primary school", "secondary school", "anganwadi"],
                InfrastructureCategory.HEALTHCARE: ["phc", "asha worker", "ambulance access"],
                InfrastructureCategory.SANITATION: ["odf status", "public toilets", "solid waste management"],
                InfrastructureCategory.CONNECTIVITY: ["paved road", "mobile signal", "internet access"],
                InfrastructureCategory.WATER: ["piped water supply", "hand pump", "water quality tested"],
                InfrastructureCategory.ELECTRICITY: ["grid connection", "street lights", "solar backup"],
                InfrastructureCategory.SKILL: ["iti/vocational centre access", "shg activity"],
                InfrastructureCategory.LIVELIHOOD: ["mgnrega enrolment", "market access"],
            }.items():
                for item_name in items:
                    status = rng.choice([InfrastructureStatus.PRESENT, InfrastructureStatus.ABSENT, InfrastructureStatus.DEGRADED, InfrastructureStatus.UNDER_CONSTRUCTION])
                    db.add(InfrastructureItem(village_id=village.id, category=category, item_name=item_name, status=status, notes="Seeded"))
            report_score, summary, interventions = evaluate_village_gap(village, db.query(InfrastructureItem).filter_by(village_id=village.id).all())
            db.add(GapReport(village_id=village.id, gap_score=report_score, gap_summary=summary, recommended_interventions=interventions, priority_rank=None))

        db.flush()
        reports = db.query(GapReport).order_by(GapReport.gap_score.desc()).all()
        for index, report in enumerate(reports, start=1):
            report.priority_rank = index

        # Loan records and proofs
        demo_files = []
        for idx in range(5):
            path = uploads / f"seed-proof-{idx + 1}.jpg"
            _dummy_image(path, f"SAMAAN Seed Proof {idx + 1}", (20 + idx * 30, 100 + idx * 20, 140 + idx * 10))
            demo_files.append(path)

        for idx, beneficiary in enumerate(beneficiaries, start=1):
            for loan_idx in range(5):
                loan = LoanRecord(
                    beneficiary_id=beneficiary.id,
                    state_agency_id=agencies[loan_idx % len(agencies)].id,
                    loan_amount=50000 + loan_idx * 25000 + idx * 10000,
                    loan_purpose=["livestock purchase", "weaving unit", "agriculture support", "small shop setup", "toolkit purchase"][loan_idx],
                    asset_description="Income generation asset",
                    repayment_schedule="monthly",
                    interest_rate=4.5,
                    loan_status=[LoanStatus.ACTIVE, LoanStatus.CLOSED, LoanStatus.DEFAULTED, LoanStatus.ACTIVE, LoanStatus.PENDING][loan_idx],
                )
                db.add(loan)
                db.flush()
                if loan_idx < len(demo_files):
                    status = [LoanProofValidationStatus.APPROVED, LoanProofValidationStatus.MANUAL_REVIEW, LoanProofValidationStatus.REJECTED, LoanProofValidationStatus.PENDING, LoanProofValidationStatus.APPROVED][loan_idx]
                    db.add(LoanProof(
                        loan_id=loan.id,
                        beneficiary_id=beneficiary.id,
                        file_path=str(demo_files[loan_idx]),
                        file_type="photo",
                        original_filename=demo_files[loan_idx].name,
                        geolat=villages[loan_idx % len(villages)].lat,
                        geolng=villages[loan_idx % len(villages)].lng,
                        ai_validation_status=status,
                        ai_confidence_score=0.88 if status == LoanProofValidationStatus.APPROVED else 0.55 if status == LoanProofValidationStatus.MANUAL_REVIEW else 0.22,
                        ai_remarks="Seeded proof",
                        synced=True,
                    ))

        # Consumption, repayment summaries, and credit scores
        for beneficiary in beneficiaries:
            consumption = ConsumptionData(
                beneficiary_id=beneficiary.id,
                electricity_units_monthly=rng.choice([None, 72, 95, 140]),
                mobile_recharge_monthly_avg=rng.choice([None, 180, 240, 420]),
                utility_bill_avg=rng.choice([None, 350, 620, 980]),
                govt_survey_income_band=rng.choice([None, "A", "B", "C", "D"]),
            )
            db.add(consumption)
            summary = LoanRepaymentSummary(
                beneficiary_id=beneficiary.id,
                total_loans=4,
                on_time_payments=3,
                delayed_payments=1,
                defaults=0,
                avg_loan_amount=85000,
            )
            db.add(summary)
            db.flush()
            score, risk, explanation = compute_composite_score(summary, consumption)
            db.add(CreditScore(
                beneficiary_id=beneficiary.id,
                composite_score=score,
                repayment_sub_score=75.0,
                income_sub_score=62.0,
                risk_band=risk,
                score_explanation=explanation,
                model_version="1.0.0",
            ))
            db.add(LendingApplication(
                beneficiary_id=beneficiary.id,
                requested_amount=100000,
                purpose="Seed lending application",
                tenure_months=24,
                status="pending" if risk == RiskBand.LOW_RISK_HIGH_NEED else "rejected",
                approved_amount=100000 if risk == RiskBand.LOW_RISK_HIGH_NEED else None,
                approval_notes="Seed approval" if risk == RiskBand.LOW_RISK_HIGH_NEED else None,
                rejection_reason="Seeded rejection" if risk != RiskBand.LOW_RISK_HIGH_NEED else None,
            ))

        # Victims, DBT cases, disbursements, grievances
        victim_specs = [
            ("Shanti Devi", "1234", "9111111111", "Uttar Pradesh", "Sitapur", CaseType.POA, "FIR-1001"),
            ("Mohan Lal", "2345", "9222222222", "Bihar", "Nalanda", CaseType.PCR, "FIR-1002"),
            ("Rekha Kumari", "3456", "9333333333", "Rajasthan", "Banswara", CaseType.POA, "FIR-1003"),
            ("Dinesh Ram", "4567", "9444444444", "Uttar Pradesh", "Bahraich", CaseType.PCR, "FIR-1004"),
            ("Kusum Devi", "5678", "9555555555", "Bihar", "Gaya", CaseType.POA, "FIR-1005"),
            ("Hari Prasad", "6789", "9666666666", "Rajasthan", "Udaipur", CaseType.PCR, "FIR-1006"),
        ]
        for idx, (name, aadhaar, mobile, state, district, case_type, fir) in enumerate(victim_specs, start=1):
            victim = Victim(
                name=name,
                aadhaar_last4=aadhaar,
                mobile=mobile,
                state=state,
                district=district,
                case_type=case_type,
                fir_number=fir,
                court_case_number=f"CCT/{1000 + idx}" if idx % 2 == 0 else None,
                incident_date=datetime.now(timezone.utc) - timedelta(days=120 + idx * 4),
                verification_status=VerificationStatus.VERIFIED if idx % 2 == 0 else VerificationStatus.PENDING,
                digilocker_verified=idx % 2 == 0,
                cctns_verified=idx % 2 == 0,
            )
            db.add(victim)
            db.flush()
            case = DBTCase(
                victim_id=victim.id,
                assistance_type=[AssistanceType.RELIEF, AssistanceType.REHABILITATION, AssistanceType.INTER_CASTE_MARRIAGE_INCENTIVE][idx % 3],
                approved_amount=50000 + idx * 5000,
                disbursed_amount=0.0,
                status=DBTStatus.SANCTIONED if idx % 2 == 0 else DBTStatus.UNDER_REVIEW,
                assigned_officer_id=officers[idx % len(officers)].id,
            )
            db.add(case)
            db.flush()
            if idx % 2 == 0:
                db.add(Disbursement(case_id=case.id, amount=case.approved_amount, transaction_ref=f"TXN-SEED-{idx}", bank_account_last4="7788", remarks="Seed disbursement"))
                case.disbursed_amount = case.approved_amount
                case.status = DBTStatus.DISBURSED
            if idx <= 3:
                db.add(GrievanceTicket(case_id=case.id, victim_id=victim.id, category=GrievanceCategory.DELAY, description="Seed grievance", status=GrievanceStatus.OPEN))

        db.commit()
    finally:
        db.close()


def purge_seed_data() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_user_mobiles = ["9999999999", "7777777777", "7766666666", "6666666666", "8888888888", "8888888887"]
        seed_agency_names = [
            "Uttar Pradesh Social Welfare Department",
            "Bihar Social Welfare Department",
            "Rajasthan Social Justice Department",
            "National Scheduled Castes Finance and Development Corporation",
            "District Rural Development Agency Lucknow",
            "District Rural Development Agency Patna",
            "District Rural Development Agency Jaipur",
            "State Bank of India",
            "National Institute of Social Defence",
            "Jan Seva Foundation",
        ]
        seed_village_names = ["Barauli", "Sahora", "Khetasar", "Madhopur", "Navapura", "Sundarpur"]
        seed_victim_mobiles = ["9111111111", "9222222222", "9333333333", "9444444444", "9555555555", "9666666666"]

        seed_user_ids = [user.id for user in db.query(User).filter(User.mobile.in_(seed_user_mobiles)).all()]
        test_user_ids = [
            user.id
            for user in db.query(User).filter(
                (User.name.like("Test%")) | (User.name.like("Readback%")) | (User.name.like("Notif%"))
            ).all()
        ]
        cleanup_user_ids = list({*seed_user_ids, *test_user_ids})
        seed_agency_ids = [agency.id for agency in db.query(Agency).filter(Agency.name.in_(seed_agency_names)).all()]
        seed_village_ids = [village.id for village in db.query(Village).filter(Village.name.in_(seed_village_names)).all()]
        seed_victim_ids = [victim.id for victim in db.query(Victim).filter(Victim.mobile.in_(seed_victim_mobiles)).all()]
        test_victim_ids = [
            victim.id
            for victim in db.query(Victim).filter(
                (Victim.name.like("Test%")) | (Victim.name.like("Readback%"))
            ).all()
        ]
        cleanup_victim_ids = list({*seed_victim_ids, *test_victim_ids})
        seed_case_ids = [case.id for case in db.query(DBTCase).filter(DBTCase.victim_id.in_(cleanup_victim_ids)).all()]
        seed_mapping_ids = [mapping.id for mapping in db.query(AgencyMapping).filter(AgencyMapping.notes == "Seeded mapping").all()]

        if cleanup_user_ids:
            db.query(Notification).filter(Notification.user_id.in_(cleanup_user_ids)).delete(synchronize_session=False)
            db.query(LoanProof).filter(LoanProof.beneficiary_id.in_(cleanup_user_ids)).delete(synchronize_session=False)
            db.query(LoanRecord).filter(LoanRecord.beneficiary_id.in_(cleanup_user_ids)).delete(synchronize_session=False)
            db.query(CreditScore).filter(CreditScore.beneficiary_id.in_(cleanup_user_ids)).delete(synchronize_session=False)
            db.query(ConsumptionData).filter(ConsumptionData.beneficiary_id.in_(cleanup_user_ids)).delete(synchronize_session=False)
            db.query(LoanRepaymentSummary).filter(LoanRepaymentSummary.beneficiary_id.in_(cleanup_user_ids)).delete(synchronize_session=False)
            db.query(LendingApplication).filter(LendingApplication.beneficiary_id.in_(cleanup_user_ids)).delete(synchronize_session=False)
            db.query(BeneficiaryProfile).filter(BeneficiaryProfile.user_id.in_(cleanup_user_ids)).delete(synchronize_session=False)
            db.query(User).filter(User.id.in_(cleanup_user_ids)).delete(synchronize_session=False)

        if seed_mapping_ids:
            db.query(ProjectMilestone).filter(ProjectMilestone.mapping_id.in_(seed_mapping_ids)).delete(synchronize_session=False)
            db.query(FundAllocation).filter(FundAllocation.mapping_id.in_(seed_mapping_ids)).delete(synchronize_session=False)
            db.query(AgencyMapping).filter(AgencyMapping.id.in_(seed_mapping_ids)).delete(synchronize_session=False)

        if seed_agency_ids:
            db.query(Agency).filter(Agency.id.in_(seed_agency_ids)).delete(synchronize_session=False)

        if seed_village_ids:
            db.query(GapReport).filter(GapReport.village_id.in_(seed_village_ids)).delete(synchronize_session=False)
            db.query(InfrastructureItem).filter(InfrastructureItem.village_id.in_(seed_village_ids)).delete(synchronize_session=False)
            db.query(Village).filter(Village.id.in_(seed_village_ids)).delete(synchronize_session=False)

        if seed_case_ids:
            db.query(Disbursement).filter(Disbursement.case_id.in_(seed_case_ids)).delete(synchronize_session=False)
            db.query(GrievanceTicket).filter(GrievanceTicket.case_id.in_(seed_case_ids)).delete(synchronize_session=False)
            db.query(DBTCase).filter(DBTCase.id.in_(seed_case_ids)).delete(synchronize_session=False)
        if cleanup_victim_ids:
            db.query(Victim).filter(Victim.id.in_(cleanup_victim_ids)).delete(synchronize_session=False)

        db.query(Disbursement).filter(Disbursement.transaction_ref.like("TXN-SEED-%")).delete(synchronize_session=False)
        db.query(GrievanceTicket).filter(GrievanceTicket.description == "Seed grievance").delete(synchronize_session=False)

        seed_component_names = ["adarsh_gram", "grant_in_aid", "hostel"]
        db.query(PMSAJAYComponentModel).filter(PMSAJAYComponentModel.name.in_(seed_component_names)).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    purge_seed_data()
    if os.getenv("SAMAAN_ENABLE_SAMPLE_DATA", "").lower() in {"1", "true", "yes"}:
        seed_sample_data()
    print("Seed data cleanup complete")
