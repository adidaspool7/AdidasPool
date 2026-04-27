# DB Query Examples

## Query: Candidate experience rows with computed years

Handles all three date formats stored in `start_date` / `end_date` (`YYYY-MM-DD`, `YYYY-MM`, `YYYY`).

```sql
SELECT
  e.job_title,
  e.company,
  e.start_date,
  e.end_date,
  e.is_current,
  e.fields_of_work,
  ROUND(
    (
      COALESCE(
        CASE
          WHEN e.end_date ~ '^\d{4}-\d{2}-\d{2}' THEN e.end_date::date
          WHEN e.end_date ~ '^\d{4}-\d{2}$'      THEN (e.end_date || '-01')::date
          WHEN e.end_date ~ '^\d{4}$'             THEN (e.end_date || '-01-01')::date
        END,
        CURRENT_DATE
      ) -
      CASE
        WHEN e.start_date ~ '^\d{4}-\d{2}-\d{2}' THEN e.start_date::date
        WHEN e.start_date ~ '^\d{4}-\d{2}$'       THEN (e.start_date || '-01')::date
        WHEN e.start_date ~ '^\d{4}$'             THEN (e.start_date || '-01-01')::date
      END
    ) / 365.25
  , 1) AS years
FROM candidates c
JOIN experiences e ON e.candidate_id = c.id
WHERE (c.first_name || ' ' || c.last_name) ILIKE '%Fernando Ribeiro%'
ORDER BY e.start_date DESC;
```

### Example output (Fernando Ribeiro)

| job_title | company | start_date | end_date | is_current | fields_of_work | years |
|---|---|---|---|---|---|---|
| Customer Service Specialist for the Italian Market | ARROW ELECTRONICS | 2021-05 | 2025-09 | false | ["Sales"] | 4.3 |
| International Freight Forwarder for the Italian Market | FLASH / REDSPHER GROUP | 2017-09 | 2021-05 | false | ["Supply Chain & Sourcing","Sales"] | 3.7 |
| Quality Control of Electronic Devices | ANOVO | 2016-10 | 2017-05 | false | ["Product Development & Operations","Technology"] | 0.6 |
| Writer/Blogger | SPOTTED BY LOCALS | 2015-08 | 2024-12 | false | ["Digital","Sales"] | 9.3 |
| Co-Founder | DRONENG | 2014-07 | 2021 | false | ["Technology","Product Development & Operations"] | 6.5 |

### Notes

- `candidates` name is split across `first_name` + `last_name` (no `full_name` column).
- `experiences` uses `job_title` (not `title`).
- Dates are stored as `TEXT` in mixed formats — the `CASE` block normalises all three.
- `fields_of_work` is a `TEXT[]` array; the double-counting fix (`rawExperiences`) ensures a multi-field experience is only counted once per job match.
