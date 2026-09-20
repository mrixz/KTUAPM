# KTU Activity Points AI Platform - System Architecture

## 1. Overview & Core Philosophy

The **KTU Activity Points Platform** is built with a strictly decoupled 3-tier intelligence architecture:

```
+-------------------------------------------------------------------------+
|                       LAYER 1: ACADEMIC PROFILE                         |
|  - Registration input: admissionYear, entryType, program, branch        |
|  - Derived server-side: scheme (2019/2024), ruleVersion, required/max   |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                   LAYER 2: AI DOCUMENT UNDERSTANDING                    |
|  - CertificateAnalyzer interface (Gemini 2.5 Flash implementation)      |
|  - Extracts ONLY verifiable facts: title, category, level, award, date  |
|  - STRICT CONSTRAINT: LLM NEVER assigns points                          |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                 LAYER 3: DETERMINISTIC RULE ENGINE                      |
|  - Data-driven versioned rules (2019-v1, 2024-v1)                       |
|  - Evaluates level achievement matrices, duration, and category caps    |
|  - Produces deterministic points and explainable 5-step trace           |
+-------------------------------------------------------------------------+
```

---

## 2. Layer Details

### Layer 1: Academic Profile & Scheme Resolution
- Implemented in `server/src/services/scheme/SchemeResolver.js`.
- Resolves official KTU Scheme (2019 vs 2024) and Entry Type (`regular` vs `lateral`).
- Enforces different point quotas (e.g. Regular = 100 points, Lateral = 75 points) without client tampering.

### Layer 2: AI Document Understanding Abstraction
- Defined by `CertificateAnalyzer` base class.
- Implemented in `GeminiCertificateAnalyzer` using `@google/generative-ai` (`gemini-2.5-flash`).
- Enforces strict JSON schema validation, confidence scoring (0.0 - 1.0), and semantic entity normalization.
- Extensible to self-hosted custom ML / LayoutLM models in Phase 2 via `CustomMLCertificateAnalyzer`.

### Layer 3: Versioned Rule Engine & Trace Generator
- Implemented in `RuleEngine.js` and `PointCalculationEngine.js`.
- Supports level-achievement matrices, duration-based scoring, and tiered structures.
- Evaluates existing student points in real-time to enforce category caps and maximum point limits.
- Generates 5-step explainable calculation traces for every certificate.

---

## 3. Storage Abstraction
- Abstract `StorageProvider` interface with concrete `LocalStorageProvider` (dev: `server/uploads/`) and `CloudStorageProvider` (production S3/Cloudinary/Supabase).
- Files stored with unique hash-based keys; MongoDB stores metadata references (`storageKey`, `fileHash`, `mimeType`).
