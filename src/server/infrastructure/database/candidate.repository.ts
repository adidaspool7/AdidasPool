/**
 * Supabase Candidate Repository
 *
 * ONION LAYER: Infrastructure
 * REPLACES: PrismaCandidateRepository
 */

import db from "./supabase-client";
import { camelizeKeys, snakeifyKeys, generateId, assertNoError } from "./db-utils";
import type {
  ICandidateRepository,
  CandidateFilters,
  CandidateRelationsInput,
  PaginatedResult,
} from "@server/domain/ports/repositories";

const CANDIDATE_LIST_SELECT = `
  *,
  experiences(fields_of_work),
  languages:candidate_languages(*),
  tags:candidate_tags(*),
  applications:job_applications(id),
  assessments(id, status, type, result:assessment_results(overall_score, cefr_estimation, is_borderline)),
  interviews:interview_sessions(id, final_decision, interview_mode, status, evaluation_rationale),
  notes:candidate_notes(id)
` as const;

const CANDIDATE_FULL_SELECT = `
  *,
  experiences(*),
  education(*),
  languages:candidate_languages(*),
  skills(*),
  tags:candidate_tags(*),
  notes:candidate_notes(*),
  assessments(*, result:assessment_results(*), template:assessment_templates(*)),
  improvementTracks:improvement_tracks(*, progress:improvement_progress(*)),
  jobMatches:job_matches(*, job:jobs(*))
` as const;

export class SupabaseCandidateRepository implements ICandidateRepository {
  async findMany(filters: CandidateFilters): Promise<PaginatedResult<any>> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("candidates")
      .select(CANDIDATE_LIST_SELECT, { count: "exact" });

    // Search filter
    if (filters.search) {
      const s = filters.search.replace(/'/g, "''");
      query = query.or(
        `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`
      );
    }

    // Status
    if (filters.status) query = query.eq("status", filters.status);

    // Country
    if (filters.country)
      query = query.ilike("country", `%${filters.country}%`);

    // Location search
    if (filters.locationSearch) {
      const l = filters.locationSearch.replace(/'/g, "''");
      query = query.or(`location.ilike.%${l}%,country.ilike.%${l}%`);
    }

    // Source type
    if (filters.sourceType) {
      query = query.eq("source_type", filters.sourceType);
    }

    // Score range
    if (filters.minScore != null)
      query = query.gte("overall_cv_score", filters.minScore);
    if (filters.maxScore != null)
      query = query.lte("overall_cv_score", filters.maxScore);

    // Business area
    if (filters.businessArea)
      query = query.eq("primary_business_area", filters.businessArea);

    // Shortlisted
    if (filters.shortlisted !== undefined)
      query = query.eq("shortlisted", filters.shortlisted);

    // Needs review
    if (filters.needsReview !== undefined)
      query = query.eq("needs_review", filters.needsReview);

    // Hide unparsed (status=NEW) candidates when requested
    if (filters.excludeUnparsed) query = query.neq("status", "NEW");

    // Sort
    const sortCol = toSnakeCase(filters.sortBy ?? "createdAt");
    query = query
      .order(sortCol, { ascending: filters.sortOrder === "asc" })
      .range(from, to);

    const { data, error, count } = await query;
    assertNoError(error, "candidate.findMany");

    const rows = (data ?? []).map((row: Record<string, unknown>) => {
      const c = camelizeKeys<any>(row);
      // Compute _count from embedded arrays
      c._count = {
        assessments: Array.isArray(c.assessments) ? c.assessments.length : 0,
        notes: Array.isArray(c.notes) ? c.notes.length : 0,
      };
      // Derive unique business areas from experience fields_of_work
      const seen = new Set<string>();
      if (Array.isArray(c.experiences)) {
        for (const exp of c.experiences) {
          const fw = (exp as any).fieldsOfWork ?? (exp as any).fields_of_work;
          if (Array.isArray(fw)) {
            for (const f of fw) {
              if (typeof f === "string" && f.trim()) seen.add(f.trim());
            }
          }
        }
      }
      if (seen.size === 0 && c.primaryBusinessArea) seen.add(c.primaryBusinessArea);
      c.businessAreas = Array.from(seen);
      // Strip raw experiences — not needed on the list page
      delete c.experiences;
      return c;
    });

    const total = count ?? 0;
    return {
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    const { data, error } = await db
      .from("candidates")
      .select(CANDIDATE_FULL_SELECT)
      .eq("id", id)
      .single();
    assertNoError(error, "candidate.findById");
    if (!data) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  // Kept for backward compat — select is treated as a field list hint
  async findByIdWithSelect(id: string, _select: Record<string, boolean>) {
    return this.findById(id);
  }

  async update(id: string, data: Record<string, unknown>) {
    const { data: row, error } = await db
      .from("candidates")
      .update(snakeifyKeys(data))
      .eq("id", id)
      .select()
      .single();
    assertNoError(error, "candidate.update");
    return camelizeKeys<any>(row as Record<string, unknown>);
  }

  async updateWithSelect(
    id: string,
    data: Record<string, unknown>,
    _select: Record<string, boolean>
  ) {
    return this.update(id, data);
  }

  async findByUserId(userId: string) {
    const { data, error } = await db
      .from("candidates")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async findByEmail(email: string) {
    const { data, error } = await db
      .from("candidates")
      .select("*")
      .eq("email", email)
      .is("user_id", null)
      .limit(1)
      .single();
    if (error) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async findFirstByCreation(_select?: Record<string, boolean>) {
    const { data, error } = await db
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (error) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async createDefault(
    data: Record<string, unknown>,
    _select?: Record<string, boolean>
  ) {
    const payload = { id: generateId(), ...snakeifyKeys(data) };
    const { data: row, error } = await db
      .from("candidates")
      .insert(payload)
      .select()
      .single();
    assertNoError(error, "candidate.createDefault");
    return camelizeKeys<any>(row as Record<string, unknown>);
  }

  async addNote(candidateId: string, author: string, content: string) {
    const { data, error } = await db
      .from("candidate_notes")
      .insert({ id: generateId(), candidate_id: candidateId, author, content })
      .select()
      .single();
    assertNoError(error, "candidate.addNote");
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async updateStatus(candidateId: string, status: string) {
    const { error } = await db
      .from("candidates")
      .update({ status })
      .eq("id", candidateId);
    assertNoError(error, "candidate.updateStatus");
  }

  async findForMatching() {
    // Filter out status=NEW and hard duplicates. Tolerate is_duplicate=NULL
    // (rows imported from legacy sources may not have the default applied).
    const { data, error } = await db
      .from("candidates")
      .select(`*, languages:candidate_languages(*), education(*), skills(*), experiences(*)`)
      .neq("status", "NEW")
      .or("is_duplicate.is.null,is_duplicate.eq.false");
    assertNoError(error, "candidate.findForMatching");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async findByIdForMatching(candidateId: string) {
    const { data, error } = await db
      .from("candidates")
      .select(`*, languages:candidate_languages(*), education(*), skills(*), experiences(*)`)
      .eq("id", candidateId)
      .single();
    if (error) return null;
    return camelizeKeys<any>(data as Record<string, unknown>);
  }

  async findForNotifications() {
    const { data, error } = await db
      .from("candidates")
      .select(`id, country, education(field_of_study)`)
      .eq("is_duplicate", false);
    assertNoError(error, "candidate.findForNotifications");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async findInternshipCandidateIds(): Promise<Set<string>> {
    const { data, error } = await db
      .from("job_applications")
      .select("candidate_id, jobs!inner(type)")
      .eq("jobs.type", "INTERNSHIP");
    assertNoError(error, "candidate.findInternshipCandidateIds");
    const ids = new Set<string>();
    for (const row of data ?? []) {
      ids.add((row as any).candidate_id);
    }
    return ids;
  }

  async findForExport() {
    const { data, error } = await db
      .from("candidates")
      .select(`*, languages:candidate_languages(*), tags:candidate_tags(*)`)
      .order("overall_cv_score", { ascending: false });
    assertNoError(error, "candidate.findForExport");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async findForRescore() {
    const { data, error } = await db
      .from("candidates")
      .select(`
        id, years_of_experience, location, country,
        education(level),
        languages:candidate_languages(language, self_declared_level)
      `);
    assertNoError(error, "candidate.findForRescore");
    return (data ?? []).map((r: Record<string, unknown>) => camelizeKeys<any>(r));
  }

  async createWithRelations(
    data: Record<string, unknown>,
    relations: CandidateRelationsInput
  ) {
    const candidateId = generateId();
    const payload = { id: candidateId, ...snakeifyKeys(data) };

    const { data: row, error } = await db
      .from("candidates")
      .insert(payload)
      .select()
      .single();
    assertNoError(error, "candidate.createWithRelations");

    await this._insertRelations(candidateId, relations);

    return this.findById(candidateId);
  }

  async replaceRelatedRecords(
    candidateId: string,
    relations: CandidateRelationsInput
  ) {
    // Delete existing relations
    await Promise.all([
      db.from("experiences").delete().eq("candidate_id", candidateId),
      db.from("education").delete().eq("candidate_id", candidateId),
      db.from("candidate_languages").delete().eq("candidate_id", candidateId),
      db.from("skills").delete().eq("candidate_id", candidateId),
    ]);

    await this._insertRelations(candidateId, relations);
  }

  private async _insertRelations(
    candidateId: string,
    relations: CandidateRelationsInput
  ) {
    const ops: PromiseLike<unknown>[] = [];

    if (relations.experiences?.length) {
      ops.push(
        db.from("experiences").insert(
          relations.experiences.map((e) => ({
            id: generateId(),
            candidate_id: candidateId,
            ...snakeifyKeys(e as Record<string, unknown>),
          }))
        )
      );
    }

    if (relations.education?.length) {
      ops.push(
        db.from("education").insert(
          relations.education.map((e) => ({
            id: generateId(),
            candidate_id: candidateId,
            ...snakeifyKeys(e as Record<string, unknown>),
          }))
        )
      );
    }

    if (relations.languages?.length) {
      ops.push(
        db.from("candidate_languages").insert(
          relations.languages.map((l) => ({
            id: generateId(),
            candidate_id: candidateId,
            ...snakeifyKeys(l as Record<string, unknown>),
          }))
        )
      );
    }

    if (relations.skills?.length) {
      ops.push(
        db.from("skills").insert(
          relations.skills.map((s) => ({
            id: generateId(),
            candidate_id: candidateId,
            ...snakeifyKeys(s as Record<string, unknown>),
          }))
        )
      );
    }

    await Promise.all(ops);
  }

  async delete(id: string) {
    const { error } = await db.from("candidates").delete().eq("id", id);
    assertNoError(error, "candidate.delete");
  }

  async findExperienceVectorByField(candidateId: string): Promise<Record<string, number>> {
    const { data, error } = await db
      .from("experiences")
      .select("start_date, end_date, is_current, fields_of_work")
      .eq("candidate_id", candidateId);
    assertNoError(error, "candidate.findExperienceVectorByField");

    const vector: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{
      start_date: string | null;
      end_date: string | null;
      is_current: boolean;
      fields_of_work: string[] | null;
    }>) {
      const fields = Array.isArray(row.fields_of_work) ? row.fields_of_work : [];
      if (fields.length === 0) continue;
      const years = experienceDurationYears(row.start_date, row.end_date, row.is_current);
      if (years <= 0) continue;
      for (const field of fields) {
        vector[field] = (vector[field] ?? 0) + years;
      }
    }
    // Round each field to 1 decimal
    for (const k of Object.keys(vector)) {
      vector[k] = Math.round(vector[k] * 10) / 10;
    }
    return vector;
  }
}

function toSnakeCase(s: string): string {
  return s.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`);
}

/**
 * Phase 2: duration of a single experience in (fractional) years.
 * Accepts ISO-ish strings the CV parser emits ("YYYY-MM", "YYYY-MM-DD", "YYYY").
 * Returns 0 if dates are unusable.
 */
function experienceDurationYears(
  startDate: string | null,
  endDate: string | null,
  isCurrent: boolean
): number {
  const start = parseLooseDate(startDate);
  if (!start) return 0;
  const end = isCurrent || !endDate ? new Date() : parseLooseDate(endDate) ?? new Date();
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

function parseLooseDate(s: string | null): Date | null {
  if (!s) return null;
  const trimmed = s.trim();
  // YYYY
  if (/^\d{4}$/.test(trimmed)) return new Date(`${trimmed}-01-01`);
  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(trimmed)) return new Date(`${trimmed}-01`);
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}
