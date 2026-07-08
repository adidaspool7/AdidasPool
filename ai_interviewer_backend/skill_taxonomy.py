"""Single source of truth for classifying a target skill under assessment.

Both the interviewer (ai_interviewer.py) and the evaluator (evaluator.py) must
agree on whether the skill being validated is a programming/query LANGUAGE, a
SOFT skill, or a GENERIC technical skill -- the persona, the questioning style,
and the pass/fail rubric all differ per class. Keeping the logic here avoids a
circular import between the two modules and guarantees they never diverge.
"""
from __future__ import annotations

from typing import Iterable, Literal, Optional

SkillType = Literal["language", "soft", "generic"]

# Programming + query languages that receive the strict per-topic scope contract.
PROGRAMMING_LANGUAGES: frozenset[str] = frozenset({
    "python", "javascript", "typescript", "java", "c", "c++", "c#", "go", "golang",
    "rust", "swift", "kotlin", "ruby", "php", "scala", "r", "lua", "haskell",
    "elixir", "dart", "perl", "bash", "shell", "powershell",
})

STRICT_SCOPE_SKILLS: frozenset[str] = PROGRAMMING_LANGUAGES | frozenset({"sql"})

# The CV parser emits category "Soft Skill" (cv-parser.service.ts). We match any
# category containing "soft" so minor label variants ("Soft Skills") still register.
SOFT_SKILL_CATEGORY_TOKEN = "soft"

# Fallback lexical detector for when the skill carries no category (older parses,
# manual entry). Substring match against the normalized skill name.
SOFT_SKILL_KEYWORDS: frozenset[str] = frozenset({
    "communication", "communicating", "leadership", "leading", "teamwork",
    "team work", "collaboration", "collaborating", "adaptability", "adaptable",
    "flexibility", "problem solving", "problem-solving", "critical thinking",
    "creativity", "creative thinking", "time management", "organization",
    "organisation", "work ethic", "work-ethic", "attention to detail",
    "conflict resolution", "negotiation", "emotional intelligence", "empathy",
    "interpersonal", "presentation", "public speaking", "active listening",
    "decision making", "decision-making", "mentoring", "coaching",
    "stakeholder management", "self motivation", "self-motivation", "resilience",
    "accountability", "patience", "networking", "persuasion", "storytelling",
    "cultural awareness", "customer service",
})


def normalize(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None


def _looks_soft_by_name(normalized_skill: str) -> bool:
    return any(keyword in normalized_skill for keyword in SOFT_SKILL_KEYWORDS)


def classify_skill(
    skill_name: Optional[str],
    category: Optional[str] = None,
) -> SkillType:
    """Classify a single skill by name (+ optional CV-parser category).

    Precedence:
      1. Curated programming/query languages -> "language" (regardless of category).
      2. category contains "soft" -> "soft".
      3. Name matches a soft-skill keyword -> "soft".
      4. Otherwise -> "generic".
    """
    normalized = normalize(skill_name)
    if normalized and normalized in STRICT_SCOPE_SKILLS:
        return "language"
    normalized_category = normalize(category)
    if normalized_category and SOFT_SKILL_CATEGORY_TOKEN in normalized_category:
        return "soft"
    if normalized and _looks_soft_by_name(normalized):
        return "soft"
    return "generic"


def _category_for_target(
    target_skill: Optional[str],
    skills: Iterable[object],
) -> Optional[str]:
    """Find the category of the candidate skill matching the target skill.

    `skills` is any iterable of objects/dicts exposing `.name`/`.category`
    (CandidateSkill) or the equivalent keys.
    """
    target = normalize(target_skill)
    if not target:
        return None
    for skill in skills:
        name = getattr(skill, "name", None)
        category = getattr(skill, "category", None)
        if name is None and isinstance(skill, dict):
            name = skill.get("name")
            category = skill.get("category")
        if normalize(name) == target and category:
            return category
    return None


def classify_target(candidate: object) -> SkillType:
    """Classify the target skill of a candidate profile.

    Looks up the category from the candidate's own skills list so the CV-parser
    "Soft Skill" tag is honored even though `target_skill` is only a string.
    """
    target_skill = getattr(candidate, "target_skill", None)
    skills = getattr(candidate, "skills", None) or []
    category = _category_for_target(target_skill, skills)
    return classify_skill(target_skill, category)
