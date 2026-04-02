from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Tuple

from models.village import InfrastructureCategory, InfrastructureStatus, Village, InfrastructureItem

BASELINE_ITEMS = {
    InfrastructureCategory.EDUCATION: ["primary school", "secondary school", "anganwadi"],
    InfrastructureCategory.HEALTHCARE: ["phc", "asha worker", "ambulance access"],
    InfrastructureCategory.SANITATION: ["odf status", "public toilets", "solid waste management"],
    InfrastructureCategory.CONNECTIVITY: ["paved road", "mobile signal", "internet access"],
    InfrastructureCategory.WATER: ["piped water supply", "hand pump", "water quality tested"],
    InfrastructureCategory.ELECTRICITY: ["grid connection", "street lights", "solar backup"],
    InfrastructureCategory.SKILL: ["iti/vocational centre access", "shg activity"],
    InfrastructureCategory.LIVELIHOOD: ["mgnrega enrolment", "market access"],
}


def evaluate_village_gap(village: Village, items: List[InfrastructureItem]) -> Tuple[float, Dict[str, int], List[str]]:
    gap_summary: Dict[str, int] = defaultdict(int)
    interventions: List[str] = []
    weighted_gaps = 0.0
    total_expected = sum(len(v) for v in BASELINE_ITEMS.values())

    for category, expected_items in BASELINE_ITEMS.items():
        category_items = [item for item in items if item.category == category]
        existing_names = {item.item_name.lower().strip() for item in category_items if item.status == InfrastructureStatus.PRESENT}
        for item_name in expected_items:
            if item_name not in existing_names:
                gap_summary[category.value] += 1
                interventions.append(f"Strengthen {category.value}: {item_name}")
                weighted_gaps += 1.0

        degraded_count = sum(1 for item in category_items if item.status in {InfrastructureStatus.ABSENT, InfrastructureStatus.DEGRADED})
        gap_summary[category.value] += degraded_count
        weighted_gaps += degraded_count * 0.6

    sc_factor = 1.0 + (village.sc_population_pct / 100.0)
    score = min(100.0, round((weighted_gaps / max(total_expected, 1)) * 100.0 * sc_factor, 2))

    if village.sc_population_pct >= 50:
        interventions.insert(0, "Prioritize SC-majority service delivery and access improvements")

    if not interventions:
        interventions.append("Village infrastructure meets baseline expectations")

    return score, dict(gap_summary), interventions[:10]

