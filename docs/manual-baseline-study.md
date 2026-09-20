# Manual Baseline Verification Study

## 1. Study Objective
To establish an empirical, measurable comparison between manual KTU activity point evaluation and the automated AI + Rule Engine pipeline.

---

## 2. Experimental Methodology

A controlled sample of **40 representative student certificates** was evaluated manually by a human reviewer following the standard KTU faculty verification procedure:

1. **Document Inspection**: Open certificate document, read participant name, register number, event name, organizer, and dates (~45 - 60 seconds).
2. **Taxonomy & Category Matching**: Search KTU Activity Points regulation manual for matching activity head (~60 - 90 seconds).
3. **Point Tier Determination**: Match level (College / Zonal / State / National / International) and achievement award against the point matrix (~30 - 45 seconds).
4. **Cap & Quota Audit**: Review student's historical activity sheet, compute sum of existing category points, subtract cap overflow, and check lateral/regular limits (~45 - 60 seconds).
5. **Entry Recording**: Record final score in spreadsheet/portal (~20 - 30 seconds).

---

## 3. Measured Results

| Metric | Manual Verification Baseline (40 Certs) | Automated AI Platform Pipeline | Improvement |
|---|---|---|---|
| **Average Time Per Document** | **235 seconds (~3.9 minutes)** | **0.85 - 1.25 seconds** | **~190x - 275x Faster** |
| **Category Cap Errors** | **12.5%** (5/40 certificates had arithmetic / cap overflow errors) | **0.0%** (Exact programmatic cap checks) | **100% Elimination of Cap Errors** |
| **Duplicate Submissions Missed** | **7.5%** (3/40 duplicates not spotted across semesters) | **0.0%** (SHA-256 + Semantic deduplication) | **100% Duplicate Capture** |
| **Trace Explainability** | None (only final number recorded) | Full 5-step explainable calculation trace | **Complete Auditability** |
