# TalentHub --- An Integrated HR Platform for Candidate Lifecycle Management --- Project Report

LaTeX source for the LEI-PROJ (PESTI) academic report.

- **Author:** Fernando Regalado Lobo Ribeiro (1060064)
- **Course:** Licenciatura em Engenharia Informática — ISEP
- **Academic year:** 2025/2026
- **Supervisor:** Nuno Escudeiro
- **Submission month:** June 2026
- **Page budget:** 70 pages **maximum** from the first page of Chapter 1
  (Introduction) to the last page of Chapter 7 (Conclusions). Bibliography
  and appendices are unlimited.

## Folder layout

```
latex-report/
├── main.tex                  # root document (entry point)
├── PESTI-style.cls           # ← COPY from latex-report-example/
├── mainbibliography.bib      # BibLaTeX entries
├── frontmatter/
│   ├── frontmatter.tex       # cover, abstract, ToC, ...
│   ├── glossary.tex          # \gls{...} entries
│   └── assets/               # ← COPY from latex-report-example/
├── chapters/
│   ├── ch1/chapter1.tex      # Introduction (drafted)
│   ├── ch2/chapter2.tex      # State of the Art (drafted)
│   ├── ch3/chapter3.tex      # Analysis & Methodology (drafted)
│   ├── ch4/chapter4.tex      # Solution Design (drafted)
│   ├── ch5/chapter5.tex      # Implementation (drafted)
│   ├── ch6/chapter6.tex      # Verification & Validation (drafted)
│   └── ch7/chapter7.tex      # Conclusions (drafted)
└── appendices/
    ├── appendixA.tex         # Detailed DB schema (drafted)
    ├── appendixB.tex         # API reference (drafted)
    └── appendixC.tex         # Survey & meeting evidence (drafted)
```

## One-time setup

This folder does **not** include the ISEP class file or its assets. Copy
them from the example folder once:

```powershell
# from the repository root
Copy-Item -Path "AppReport\latex-report-example\PESTI-style.cls"  -Destination "AppReport\latex-report\PESTI-style.cls"
Copy-Item -Path "AppReport\latex-report-example\frontmatter\assets" -Destination "AppReport\latex-report\frontmatter\assets" -Recurse
```

(They are not duplicated in version control here to avoid drifting from
the upstream template.)

## Compiling on Overleaf (recommended)

1. Zip the `latex-report/` folder **after** running the copy commands
   above (so `PESTI-style.cls` and `frontmatter/assets/` are inside).
2. Open Overleaf → **New Project** → **Upload Project** → select the zip.
3. Open Overleaf project menu → **Settings**:
   - **Compiler:** `pdfLaTeX`
   - **Main document:** `main.tex`
   - **TeX Live version:** latest
4. Recompile. Overleaf will run `pdflatex → biber → pdflatex × 2 →
   makeglossaries → pdflatex` automatically.

If Overleaf reports missing glossary output, run `makeglossaries` once
from the Overleaf logs panel (it is needed only on first compile).

## Compiling locally (Windows + MiKTeX or TeX Live)

```powershell
cd AppReport\latex-report
latexmk -pdf -interaction=nonstopmode main.tex
```

`latexmk` will resolve all auxiliary passes. To clean:

```powershell
latexmk -C
```

## Editing workflow

- Each chapter is a standalone `.tex` file inside `chapters/chN/`.
- Cross-references use `\ref{cap:...}` / `\ref{sec:...}` (labels are
  already defined in every skeleton).
- Glossary terms used in body text via `\gls{ats}`, `\gls{cefr}`, …
- Bibliography entries via `\parencite{key}` or `\textcite{key}`.
- Source code in body via `lstlisting`; algorithms via `algorithm`.

## Page-budget tracker

| Chapter | Target pages | Status |
|---|---|---|
| 1 — Introduction | 5 | drafted |
| 2 — State of the Art | 8 | drafted |
| 3 — Analysis & Methodology | 10 | drafted |
| 4 — Solution Design | 12 | drafted |
| 5 — Implementation | 14 | drafted |
| 6 — Verification & Validation | 8 | drafted |
| 7 — Conclusions | 4 | drafted |
| **Total** | **61** | **buffer: ~9 pages** |
