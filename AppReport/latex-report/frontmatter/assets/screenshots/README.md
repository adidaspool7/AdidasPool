# Screenshots folder

Drop the deployed-app screenshots here as PNG (or JPG) using the **exact file
names** the report references in `\includegraphics{...}`. Until a file is
present, the report renders a grey "screenshot pending" placeholder of the
correct size, so the layout is already final.

## Expected file names (referenced by the chapters)

| File name | What to capture |
|---|---|
| `welcome-page.png` | The public welcome/landing page (`/welcome`) |
| `hr-dashboard.png` | HR dashboard home (`/dashboard`) |
| `talent-pool.png` | Candidate talent-pool list with filters (`/dashboard/candidates`) |
| `candidate-profile.png` | A single candidate profile (HR view) with interaction history |
| `cv-upload.png` | Bulk CV upload / parsing-progress screen (`/dashboard/upload`) |
| `job-ranking.png` | Per-job candidate ranking with per-criterion breakdown (`/dashboard/jobs/[id]/match-candidates`) |
| `job-shortlist.png` | The Shortlist tab on the ranking screen |
| `analytics-dashboard.png` | Analytics dashboard with the built-in charts (`/dashboard/analytics`) |
| `analytics-widget-builder.png` | The custom-widget builder dialog |
| `ai-interview.png` | The AI interview popup (camera + chat) — teammate's module |
| `ambassador-programs.png` | Ambassador programs list (`/dashboard/ambassador`) |
| `candidate-portal.png` | Candidate self-service portal home |

## How to swap a placeholder for a real image

In the chapter `.tex` file, find the line:

```latex
\screenshotplaceholder{Figure caption text}
```

and replace it with:

```latex
\includegraphics[width=0.85\linewidth]{welcome-page}
```

(no extension needed). The surrounding `figure`, `\caption{}` and `\label{}`
stay unchanged.
```
