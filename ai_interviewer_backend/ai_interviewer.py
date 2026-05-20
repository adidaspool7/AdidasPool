from __future__ import annotations

from openai import AsyncOpenAI
from typing import Any
from uuid import uuid4

from config import settings
from models import CandidateProfile, ChatMessage

END_INTERVIEW_SENTINEL = "__END_INTERVIEW__"

# ── Skill domain taxonomy ───────────────────────────────────────────────────────

_PROGRAMMING_LANGUAGES: frozenset[str] = frozenset({
    "python", "javascript", "typescript", "java", "c", "c++", "c#", "go", "golang",
    "rust", "swift", "kotlin", "ruby", "php", "scala", "r", "lua", "haskell",
    "elixir", "dart", "perl", "bash", "shell", "powershell",
})

# Core allowed topics per language — injected verbatim into scope block
_LANGUAGE_CORE_TOPICS: dict[str, list[str]] = {
    "python": [
        "core syntax, scoping rules, name binding, and the GIL",
        "built-in types and data structures: list, dict, set, tuple, comprehensions, generators",
        "standard library: collections, itertools, functools, contextlib, pathlib, asyncio, subprocess",
        "OOP: classes, dunder/magic methods, MRO, metaclasses, descriptors, dataclasses",
        "decorators, context managers, closures",
        "concurrency: threading, multiprocessing, asyncio/await coroutines",
        "error handling, exception hierarchy, custom exceptions",
        "memory model, garbage collection, reference counting, weak references",
        "testing: pytest, unittest, mocking, fixtures",
        "packaging: pip, virtualenv, pyproject.toml, __init__ vs __main__",
        "performance profiling, caching strategies, complexity trade-offs",
    ],
    "javascript": [
        "event loop, call stack, microtasks vs macrotasks",
        "prototypal inheritance, closures, scope chain",
        "ES2015+ features: Promises, async/await, destructuring, spread/rest, modules",
        "the DOM and browser APIs (if applicable) or Node.js internals",
        "type coercion, equality semantics, hoisting, TDZ",
        "error handling, error types, try/catch/finally",
        "functional patterns: map/filter/reduce, currying, composition",
        "memory management, garbage collection, WeakRef",
    ],
    "typescript": [
        "static type system: inference, generics, conditional types, mapped types, template literals",
        "structural typing vs nominal typing",
        "utility types: Partial, Required, Pick, Omit, ReturnType, etc.",
        "declaration files and module augmentation",
        "strict mode and compiler options",
        "discriminated unions and exhaustiveness checking",
        "type narrowing, type guards, assertion functions",
    ],
    "java": [
        "JVM internals: class loading, bytecode, JIT compilation, GC algorithms",
        "OOP: inheritance, polymorphism, abstract classes, interfaces, inner classes",
        "generics and type erasure",
        "collections framework: List, Map, Set implementations and trade-offs",
        "concurrency: threads, synchronized, locks, volatile, java.util.concurrent",
        "streams, lambdas, Optional, functional interfaces (Java 8+)",
        "exception handling, checked vs unchecked",
        "annotations, reflection",
    ],
    "go": [
        "goroutines, channels, select statement",
        "interfaces, embedding, composition",
        "defer, panic, recover",
        "memory model, escape analysis, garbage collector",
        "error handling patterns (error interface, wrapping)",
        "modules and dependency management",
        "testing and benchmarking with go test",
        "context package and cancellation",
    ],
    "rust": [
        "ownership, borrowing, lifetimes",
        "traits and generics",
        "enums and pattern matching, Option, Result",
        "closures and iterators",
        "concurrency: Send/Sync, Arc, Mutex",
        "unsafe Rust and when it is justified",
        "cargo, crates, modules",
        "zero-cost abstractions and performance trade-offs",
    ],
}

_GENERIC_LANGUAGE_TOPICS: list[str] = [
    "core syntax and semantics of the language",
    "type system and memory model",
    "standard library and built-in data structures",
    "OOP or FP paradigms as applicable",
    "concurrency and error handling",
    "testing, packaging, and tooling",
    "performance and trade-off analysis",
]

# Topics that are ALWAYS off-limits when interviewing on a plain programming language
_LANGUAGE_FORBIDDEN_TOPICS: list[str] = [
    "AI/ML frameworks (TensorFlow, PyTorch, Keras, Hugging Face, scikit-learn) — "
    "unless this skill is explicitly listed as the target",
    "prompt engineering, LLM APIs, or generative AI concepts",
    "cloud provider services (AWS, GCP, Azure, Vercel) unless a cloud-native SDK "
    "is the stated target skill",
    "DevOps tooling (Docker, Kubernetes, CI/CD pipelines, Terraform) unless stated as target",
    "data science or analytics workflows (pandas, numpy, Jupyter) unless stated in the "
    "candidate's projects AND directly tied to Python internals",
    "abstract system design or architecture theory not anchored to the language runtime",
]


def _get_skill_type(normalized_skill: str | None) -> str:
    """Returns 'language', or 'generic'."""
    if normalized_skill and normalized_skill in _PROGRAMMING_LANGUAGES:
        return "language"
    return "generic"


def _build_language_scope_addendum(skill_name: str) -> str:
    """Returns additional scope lines for programming-language target skills."""
    normalized = skill_name.strip().lower()
    core_topics = _LANGUAGE_CORE_TOPICS.get(normalized, _GENERIC_LANGUAGE_TOPICS)
    topics_str = "\n".join(f"  • {t}" for t in core_topics)
    forbidden_str = "\n".join(f"  ✗ {t}" for t in _LANGUAGE_FORBIDDEN_TOPICS)
    return f"""
Language-specific scope enforcement (CRITICAL — topic drift is a hard failure):
You are ONLY allowed to ask questions that test the candidate's knowledge of the {skill_name} language itself. Permitted topic areas:
{topics_str}

Absolutely FORBIDDEN question domains (do not ask about these under any circumstances):
{forbidden_str}

If the candidate's answer touches a forbidden domain, acknowledge it with one sentence and redirect immediately to a core {skill_name} question.
""".strip()


# ── Technical mode prompts ──────────────────────────────────────────────────────

INTERVIEWER_PERSONA_PROMPT = """
You are a senior technical interviewer. You are concise, professional, focused, and fast-paced.
"""

INTERVIEW_GUARDRAILS_PROMPT = """
Strict rules you must always follow:
1) Only ask deeply technical implementation questions grounded in the candidate's provided projects and skills.
2) Never drift into off-topic discussion.
3) If candidate asks irrelevant questions, politely refuse and steer back to technical interview.
4) Never reveal or provide answers to your own questions, even if explicitly asked.
5) Keep questions sharp, concrete, and progressive in difficulty.
6) Ask exactly one technical question per turn.
7) Prefer implementation details: architecture choices, trade-offs, debugging, complexity, memory/performance, edge cases.
8) Keep conversational flow natural and low-latency.
"""

INTERVIEW_FLOW_PROMPT = """
Interview flow:
- Start with a project-specific deep question.
- Probe with follow-ups based on the previous answer.
- Prioritize factual correctness checks.
- End interview only when asked by the system or after enough evidence is collected.
- Keep an internal turn-state:
  - current_topic_or_project
  - depth_level (1-5)
  - evidence_confidence (0.0-1.0)
  - remaining_question_budget
- Deterministic stop conditions:
  - max 10 technical questions (clarification turns do NOT count)
  - end if evidence_confidence >= 0.85 and at least 6 questions asked
- end if user repeatedly refuses technical answers
- when ending, append {END_INTERVIEW_SENTINEL} token at response end.
"""


# ── Language mode — writing reference texts ─────────────────────────────────────
# One translation of the adidas Porto paragraph per supported language.
# The evaluator compares the candidate's typed text against this reference.

WRITING_REFERENCE_TEXTS: dict[str, str] = {
    "english": (
        "adidas Porto provides globally unified services to adidas employees, consumers and other users, "
        "based on standardized and automated solutions across different functions and markets. "
        "We leverage state-of-the-art technology and encourage a human-centric and innovative mindset "
        "to continually raise the bar of the user experience. This is enabling us to drive operational "
        "efficiency, improved agility, and better decision-making whilst reducing complexity in adidas.\n"
        "Our mandate is to be the foundation for an agile and efficient company. This is our role to "
        "support adidas mission of being the best sports brand in the world.\n"
        "We embrace diverse backgrounds, experiences, and perspectives and seek to create a workforce "
        "that reflects our consumers and communities. We champion individual uniqueness and cultivate "
        "a culture of belonging so that everyone can create at their best."
    ),
    "portuguese": (
        "A adidas Porto fornece serviços globalmente unificados a colaboradores, consumidores e outros "
        "utilizadores da adidas, com base em soluções padronizadas e automatizadas em diferentes funções "
        "e mercados. Recorremos a tecnologia de ponta e incentivamos uma mentalidade centrada no ser humano "
        "e inovadora para elevar continuamente o nível da experiência do utilizador. Isto permite-nos "
        "impulsionar a eficiência operacional, melhorar a agilidade e tomar melhores decisões, reduzindo "
        "simultaneamente a complexidade na adidas.\n"
        "O nosso mandato é ser a fundação de uma empresa ágil e eficiente. Este é o nosso papel para apoiar "
        "a missão da adidas de ser a melhor marca de desporto do mundo.\n"
        "Valorizamos origens, experiências e perspetivas diversas e procuramos criar uma força de trabalho "
        "que reflita os nossos consumidores e comunidades. Defendemos a singularidade individual e cultivamos "
        "uma cultura de pertença para que todos possam criar ao seu melhor nível."
    ),
    "spanish": (
        "adidas Porto proporciona servicios globalmente unificados a los empleados, consumidores y otros "
        "usuarios de adidas, basados en soluciones estandarizadas y automatizadas en diferentes funciones "
        "y mercados. Aprovechamos la tecnología más avanzada y fomentamos una mentalidad centrada en el "
        "ser humano e innovadora para elevar continuamente el nivel de la experiencia del usuario. Esto nos "
        "permite impulsar la eficiencia operativa, mejorar la agilidad y tomar mejores decisiones mientras "
        "reducimos la complejidad en adidas.\n"
        "Nuestro mandato es ser la base de una empresa ágil y eficiente. Este es nuestro papel para apoyar "
        "la misión de adidas de ser la mejor marca deportiva del mundo.\n"
        "Valoramos la diversidad de orígenes, experiencias y perspectivas, y buscamos crear una fuerza "
        "laboral que refleje a nuestros consumidores y comunidades. Defendemos la singularidad individual "
        "y cultivamos una cultura de pertenencia para que todos puedan crear en su mejor nivel."
    ),
    "german": (
        "adidas Porto bietet weltweit einheitliche Dienstleistungen für adidas-Mitarbeiter, Verbraucher "
        "und andere Nutzer an, basierend auf standardisierten und automatisierten Lösungen in verschiedenen "
        "Funktionen und Märkten. Wir nutzen modernste Technologie und fördern eine menschenzentrierte und "
        "innovative Denkweise, um die Messlatte für die Nutzererfahrung kontinuierlich höher zu legen. "
        "Dies ermöglicht es uns, die betriebliche Effizienz zu steigern, die Agilität zu verbessern und "
        "bessere Entscheidungen zu treffen, während wir die Komplexität bei adidas reduzieren.\n"
        "Unser Auftrag ist es, das Fundament für ein agiles und effizientes Unternehmen zu sein. Dies ist "
        "unsere Rolle zur Unterstützung der Mission von adidas, die beste Sportmarke der Welt zu sein.\n"
        "Wir begrüßen unterschiedliche Hintergründe, Erfahrungen und Perspektiven und streben danach, eine "
        "Belegschaft zu schaffen, die unsere Verbraucher und Gemeinschaften widerspiegelt. Wir fördern "
        "individuelle Einzigartigkeit und kultivieren eine Kultur der Zugehörigkeit, damit jeder sein "
        "Bestes geben kann."
    ),
    "french": (
        "adidas Porto fournit des services mondialement unifiés aux employés, consommateurs et autres "
        "utilisateurs d'adidas, basés sur des solutions standardisées et automatisées dans différentes "
        "fonctions et marchés. Nous tirons parti des technologies de pointe et encourageons un état d'esprit "
        "centré sur l'humain et innovant pour relever continuellement la barre de l'expérience utilisateur. "
        "Cela nous permet de stimuler l'efficacité opérationnelle, d'améliorer l'agilité et de prendre "
        "de meilleures décisions tout en réduisant la complexité chez adidas.\n"
        "Notre mission est d'être le fondement d'une entreprise agile et efficace. C'est notre rôle pour "
        "soutenir la mission d'adidas d'être la meilleure marque sportive du monde.\n"
        "Nous accueillons des parcours, des expériences et des perspectives diversifiés et cherchons à "
        "créer une main-d'œuvre qui reflète nos consommateurs et communautés. Nous défendons l'unicité "
        "individuelle et cultivons une culture d'appartenance afin que chacun puisse créer au mieux de "
        "ses capacités."
    ),
}

WRITING_REFERENCE_TEXTS_DEFAULT = WRITING_REFERENCE_TEXTS["english"]


def get_writing_reference_text(language: str) -> str:
    return WRITING_REFERENCE_TEXTS.get(language.strip().lower(), WRITING_REFERENCE_TEXTS_DEFAULT)


# ── Language mode prompts ───────────────────────────────────────────────────────

LANGUAGE_PERSONA_PROMPT = """
You are a friendly, professional CEFR language examiner conducting a structured language proficiency
assessment on behalf of a recruitment team. Your tone is warm, professional, and encouraging.
Your evaluation is rigorous but fair.
"""

LANGUAGE_GUARDRAILS_PROMPT = """
Strict rules you must always follow:
1) Conduct the entire interview in the assessed language — every message you send must be in that language.
2) Never discuss technical programming or IT topics.
3) Do NOT correct grammar explicitly mid-conversation — note errors internally for evaluation.
4) Ask exactly one question per turn during the oral phase.
5) If a response is very short (under 2 sentences), follow up with: "Could you tell me a bit more about that?"
6) If the candidate writes in the wrong language, politely remind them to respond in the assessed language.
7) During the writing phase, present the dictation text exactly as provided — do not paraphrase or shorten it.
8) Never skip a phase or reorder them.
"""

LANGUAGE_FLOW_PROMPT = f"""
You MUST follow this exact 4-phase structure. Do not deviate from the order.

══════════════════════════════════════════════════════════
PHASE 1 — INTRO (exactly 1 turn, your opening message)
══════════════════════════════════════════════════════════
Deliver a warm personalized greeting using the candidate's name.
State that this is a language proficiency assessment for the role they applied for.
Clarify that there are no right or wrong answers — evaluation is on language fluency
(comprehension, speaking, writing) and not on technical knowledge.
Then ask the first oral question immediately (do not wait for a reply to the intro).

══════════════════════════════════════════════════════════
PHASE 2 — ORAL QUESTIONS (exactly 5 questions, one per turn)
══════════════════════════════════════════════════════════
Ask the following 5 questions in order, one per candidate reply.
Adapt the phrasing naturally to the assessed language, but keep the intent identical.

Q1: In your perspective, what are the main tasks that are allocated to the position you applied for?
Q2: What skills do you believe are important for someone who will work in this department or area? Could you please provide some examples?
Q3: What challenges do you believe you will deal with in the daily tasks within this department or area? Please justify your answer.
Q4: Can you identify the values of our company? If not, can you identify some values that are important to you in a work environment?
Q5: Which of those values do you relate to the most, and why?

After the candidate answers Q5, move immediately to Phase 3.

══════════════════════════════════════════════════════════
PHASE 3 — WRITING TASK (exactly 1 turn to present, 1 candidate reply)
══════════════════════════════════════════════════════════
Instruct the candidate to type the following text exactly as shown in the chat.
Present the dictation text on a new line, verbatim — do not translate or alter it.
After the candidate submits their typed version, move immediately to Phase 4.

Dictation text to present:
{{WRITING_REFERENCE_TEXT}}

══════════════════════════════════════════════════════════
PHASE 4 — CLOSING (exactly 1 turn, then end)
══════════════════════════════════════════════════════════
Thank the candidate for their time.
Inform them that the Talent Acquisition team will review their application and get back to them
as soon as possible, and that they may contact the team if they have any questions.
Then append the end token: {END_INTERVIEW_SENTINEL}

══════════════════════════════════════════════════════════
INTERNAL TURN STATE (update each turn, do not reveal)
══════════════════════════════════════════════════════════
- phase: intro | oral_q1 | oral_q2 | oral_q3 | oral_q4 | oral_q5 | writing | closing
- oral_questions_asked: 0-5
- writing_submitted: false | true
- cefr_signal: A1/A2/B1/B2/C1/C2
"""


def normalize_skill_name(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized if normalized else None


def build_technical_system_prompt(candidate: CandidateProfile) -> str:
    focus = candidate.target_skill.strip() if candidate.target_skill else None
    normalized_focus = normalize_skill_name(focus)

    if normalized_focus:
        filtered_skills = [
            skill
            for skill in candidate.skills
            if normalize_skill_name(skill.name) == normalized_focus
        ]
        skills_block = "\n".join(
            [
                f"- {skill.name}" + (f" ({skill.category})" if skill.category else "")
                for skill in filtered_skills
            ]
        ) or f"- {focus} (selected target skill)"
    else:
        skills_block = "\n".join(
            [
                f"- {skill.name}" + (f" ({skill.category})" if skill.category else "")
                for skill in candidate.skills
            ]
        ) or "- None provided"

    off_topic_skills = (
        sorted(
            {
                skill_name
                for skill in candidate.skills
                if (skill_name := skill.name.strip())
                and normalize_skill_name(skill_name) != normalized_focus
            }
        )
        if normalized_focus
        else []
    )
    off_topic_block = ", ".join(off_topic_skills) if off_topic_skills else "None listed"
    projects_block = "\n".join(
        [
            f"- {project.title or 'Untitled'}: {project.description}"
            + (
                f" | Technologies: {', '.join(project.technologies)}"
                if project.technologies
                else ""
            )
            for project in candidate.projects
        ]
    ) or "- None provided"

    skill_type = _get_skill_type(normalized_focus)
    language_addendum = (
        "\n\n" + _build_language_scope_addendum(focus)
        if focus and skill_type == "language"
        else ""
    )

    scope_block = (
        f"""
Skill scope contract (MANDATORY):
- The only allowed interview topic is: {focus}
- Every question must directly assess {focus} implementation ability.
- Do NOT ask about unrelated tools/frameworks/cloud products, even if they appear in resume context.
- If the candidate answers with off-topic technologies, acknowledge briefly and immediately ask the next question strictly about {focus}.
- Off-topic skills you must avoid unless explicitly needed to explain {focus}: {off_topic_block}{language_addendum}
""".strip()
        if focus
        else """
Skill scope contract (MANDATORY):
- Keep each question tied to one concrete technical skill present in the candidate profile.
- Do not drift into unrelated domains.
""".strip()
    )

    focus_label = focus or "highest-signal technical skill in provided profile"
    return f"""
{INTERVIEWER_PERSONA_PROMPT}
{INTERVIEW_GUARDRAILS_PROMPT}
{INTERVIEW_FLOW_PROMPT}
{scope_block}

Candidate context:
- Candidate ID: {candidate.candidate_id}
- Candidate Name: {candidate.full_name or "Unknown"}
- Primary validation focus: {focus_label}

Extracted skills:
{skills_block}

Extracted projects:
{projects_block}
""".strip()


def build_language_system_prompt(candidate: CandidateProfile) -> str:
    name = candidate.full_name or "Candidate"
    language = candidate.target_language or "English"
    writing_text = get_writing_reference_text(language)
    flow = LANGUAGE_FLOW_PROMPT.replace("{{WRITING_REFERENCE_TEXT}}", writing_text)
    return f"""
{LANGUAGE_PERSONA_PROMPT}
{LANGUAGE_GUARDRAILS_PROMPT}
{flow}

Candidate context:
- Candidate ID: {candidate.candidate_id}
- Candidate Name: {name}
- Assessed language: {language}
- Assessment type: CEFR Language Proficiency (structured 4-phase script)
- Conduct all your messages in {language}.
- Do NOT ask about technical programming skills.
""".strip()


def build_dynamic_system_prompt(candidate: CandidateProfile) -> str:
    if candidate.mode == "LANGUAGE":
        return build_language_system_prompt(candidate)
    return build_technical_system_prompt(candidate)


class InterviewSessionManager:
    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url)
        self.model = settings.ai_model
        self.sessions: dict[str, dict[str, Any]] = {}

    async def start_session(self, candidate: CandidateProfile) -> tuple[str, str, str]:
        session_id = str(uuid4())
        system_prompt = build_dynamic_system_prompt(candidate)

        opening_instruction = (
            "Begin the language proficiency assessment now. Deliver Phase 1 (the intro) "
            "and immediately ask Oral Question 1 in the same message, as instructed."
            if candidate.mode == "LANGUAGE"
            else "Start the interview now with your first deeply technical question."
        )

        messages = [
            ChatMessage(role="system", content=system_prompt).model_dump(),
            ChatMessage(role="user", content=opening_instruction).model_dump(),
        ]
        first_question = await self._chat(messages)

        initial_turn_state: dict[str, Any] = (
            {
                "phase": "oral_q1",
                "oral_questions_asked": 0,
                "writing_submitted": False,
                "cefr_signal": "B1",
                # Budget: 5 oral answers + 1 writing submission + 1 closing = 7 minimum turns
                "remaining_question_budget": 7,
            }
            if candidate.mode == "LANGUAGE"
            else {
                "current_topic_or_project": (
                    candidate.projects[0].title if candidate.projects else None
                ),
                "depth_level": 1,
                "evidence_confidence": 0.1,
                "remaining_question_budget": 10,
            }
        )

        self.sessions[session_id] = {
            "candidate": candidate.model_dump(),
            "mode": candidate.mode,
            "messages": messages
            + [ChatMessage(role="assistant", content=first_question).model_dump()],
            "lifecycle": "running",
            "turn_state": initial_turn_state,
        }
        return session_id, system_prompt, first_question

    async def process_turn(
        self, session_id: str, user_text: str, is_clarification: bool = False
    ) -> tuple[str, bool]:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        state = self.sessions[session_id]
        if state.get("lifecycle") != "running":
            raise ValueError("Session is not in running state")

        mode = state.get("mode", "TECHNICAL")
        state["messages"].append(ChatMessage(role="user", content=user_text).model_dump())
        turn_state = state.get("turn_state", {})
        remaining = int(turn_state.get("remaining_question_budget", 1))
        # Clarification turns do not consume the question budget
        if not is_clarification:
            turn_state["remaining_question_budget"] = max(remaining - 1, 0)

        if mode == "LANGUAGE":
            # Advance the phase state machine
            phase = turn_state.get("phase", "oral_q1")
            oral_asked = int(turn_state.get("oral_questions_asked", 0))
            writing_submitted = bool(turn_state.get("writing_submitted", False))

            if phase.startswith("oral_q"):
                oral_asked += 1
                turn_state["oral_questions_asked"] = oral_asked
                if oral_asked < 5:
                    turn_state["phase"] = f"oral_q{oral_asked + 1}"
                else:
                    turn_state["phase"] = "writing"
            elif phase == "writing" and not writing_submitted:
                turn_state["writing_submitted"] = True
                turn_state["phase"] = "closing"
        else:
            turn_state["depth_level"] = min(int(turn_state.get("depth_level", 1)) + 1, 5)
            turn_state["evidence_confidence"] = min(
                float(turn_state.get("evidence_confidence", 0.1)) + 0.08,
                0.9,
            )

        state["turn_state"] = turn_state
        assistant_reply = await self._chat(state["messages"])

        if (
            turn_state["remaining_question_budget"] <= 0
            and END_INTERVIEW_SENTINEL not in assistant_reply
        ):
            assistant_reply = f"{assistant_reply}\n{END_INTERVIEW_SENTINEL}"

        state["messages"].append(
            ChatMessage(role="assistant", content=assistant_reply).model_dump()
        )
        should_end = END_INTERVIEW_SENTINEL in assistant_reply
        if should_end:
            state["lifecycle"] = "ended"

        return assistant_reply.replace(END_INTERVIEW_SENTINEL, "").strip(), should_end

    def get_transcript(self, session_id: str) -> list[ChatMessage]:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        return [ChatMessage(**m) for m in self.sessions[session_id]["messages"]]

    def get_candidate(self, session_id: str) -> CandidateProfile:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        return CandidateProfile(**self.sessions[session_id]["candidate"])

    def get_mode(self, session_id: str) -> str:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        return str(self.sessions[session_id].get("mode", "TECHNICAL"))

    def close_session(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)

    def mark_evaluated(self, session_id: str) -> None:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        self.sessions[session_id]["lifecycle"] = "evaluated"

    def get_lifecycle_state(self, session_id: str) -> str:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
        return str(self.sessions[session_id].get("lifecycle", "created"))

    async def _chat(self, messages: list[dict[str, str]]) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,  # type: ignore[arg-type]
            temperature=0.2,
            max_tokens=600,
        )
        return response.choices[0].message.content or "Please continue."
