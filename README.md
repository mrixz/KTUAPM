# KTU Activity Points AI Platform

> **An AI-assisted, scheme-aware KTU student activity-point management platform with deterministic rule execution and explainable calculation traces.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21-blue.svg)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini_API-2.5_Flash-orange.svg)](https://ai.google.dev)
[![Architecture](https://img.shields.io/badge/Architecture-3--Tier_Decoupled-purple.svg)](#system-architecture)

---

## 📌 Problem & Motivation

Under APJ Abdul Kalam Technological University (KTU) regulations, engineering students must earn **100 activity points** (or **75 points** for Lateral Entry students) across multiple categories to qualify for graduation. 

However, manual verification of activity certificates faces severe engineering and operational bottlenecks:
* **Complex Multi-Scheme Rules**: 2019 and 2024 regulations enforce distinct categories, point matrices, caps, and duration limits.
* **Manual Verification Friction**: Reviewing a single certificate manually takes **3–5 minutes**, causing heavy backlogs during semester graduation audits.
* **Arithmetic & Cap Overflow Errors**: Manual auditing frequently miscalculates category caps (e.g. max points allowed per activity head).
* **Duplicate Document Fraud**: Identical or repeated certificates often escape detection when submitted across different terms.

---

## 💡 The Solution: 3-Layer Decoupled Intelligence

**KTU Activity Points** solves this by strictly separating AI document interpretation from authoritative rule calculations:

1. **Layer 1: Academic Profile & Scheme Resolution**  
   Student registration attributes (admission year, entry type, program) automatically resolve the authoritative KTU scheme (2019 vs 2024) and point quotas (Regular: 100 pts, Lateral: 75 pts) server-side.
2. **Layer 2: AI Document Understanding**  
   Google Gemini 2.5 Flash acts strictly as a **document understanding engine**, extracting structured facts (title, category, subcategory, organizer, level, award, duration, dates, certificate number, confidence). **The LLM is strictly forbidden from assigning point values.**
3. **Layer 3: Deterministic Rule Engine**  
   A data-driven, versioned rule engine evaluates the extracted facts against official KTU point matrices, enforces real-time category caps, detects duplicates via SHA-256 and semantic analysis, and generates an **explainable 5-step calculation trace**.

---

## 🏛️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STUDENT BROWSER (REACT / VITE)                     │
│  - Modern Glassmorphism UI             - Real-Time Upload & Pipeline View   │
│  - Scheme-Aware Recharts Dashboard     - 5-Step Trace Rationale Inspector   │
│  - "How Can I Get More Points?"        - Benchmark Lab Suite                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API (JWT & Secure Cookies)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                           EXPRESS.JS BACKEND (JS / ESM)                     │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │ Layer 1: Profile &   │  │ Layer 2: AI Document │  │ Layer 3: Rule     │  │
│  │ Scheme Resolver      │  │ Understanding        │  │ Engine & Trace    │  │
│  │ - 2019 / 2024 Scheme │  │ - Gemini 2.5 Flash   │  │ - Versioned Rules │  │
│  │ - Regular / Lateral  │  │ - Fact Extraction    │  │ - Deterministic   │  │
│  │ - 100 / 75 Point Cap │  │ - Zero Point Bias    │  │ - Category Caps   │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └─────────┬─────────┘  │
│             │                         │                        │            │
│  ┌──────────▼───────────┐  ┌──────────▼───────────┐  ┌─────────▼─────────┐  │
│  │ Storage Abstraction  │  │ Duplicate Detector   │  │ Analytics Engine  │  │
│  │ - LocalStorage / S3  │  │ - SHA-256 Hash       │  │ - Scheme-Aware    │  │
│  │ - Original Files     │  │ - Semantic Matching  │  │ - Capacity Meters │  │
│  └──────────────────────┘  └──────────────────────┘  └───────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Telemetry & Evaluation Benchmark Suite (500+ Documents Benchmark)      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Mongoose ODM
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                           MONGODB DATABASE                                   │
│  - Users & StudentProfiles            - Certificates & Extraction Facts     │
│  - Telemetry Records                  - Evaluation Runs & Reports           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Measurable Engineering Targets & Benchmark Results

The platform was instrumented with end-to-end telemetry and evaluated across a benchmark dataset of **520 certificate documents**:

| Target Metric | Benchmark Goal | Measured Result | Status |
|---|---|---|---|
| **Document Evaluation Scale** | 500+ Documents | **520 Certificates Evaluated** | ✅ **PASSED** |
| **Automated Processing Rate** | ≥ 90.0% | **100.0%** (520 / 520 automated) | ✅ **PASSED** |
| **95th Percentile Latency (P95)**| < 10.00s (10,000ms) | **0.001s (1 ms local / < 1.5s live)** | ✅ **PASSED** |
| **AI Classification Accuracy** | > 80.0% | **82.5%** Ground-Truth Alignment | ✅ **PASSED** |
| **Manual Verification Speedup** | Measurable | **~190x - 275x Faster** (<1.5s vs 235s) | ✅ **PASSED** |

> *Full benchmark report: [`evaluation/reports/evaluation-report.md`](evaluation/reports/evaluation-report.md)*

---

## 🚀 Key Features

* **Automatic Scheme Resolution**: Automatically resolves KTU 2019 Scheme or KTU 2024 Scheme (NEP-aligned) based on admission year and entry type.
* **Regular vs. Lateral Entry Awareness**: Differentiates 100-point 4-year quotas from 75-point 3-year lateral quotas.
* **Certificate Storage Abstraction**: Pluggable storage architecture (`LocalStorageProvider` in dev, `CloudStorageProvider` ready for S3 / Cloudinary).
* **Gemini 2.5 Flash Document Extraction**: Fast factual analysis with structured JSON schema output and strict prompt safety guards.
* **Deterministic Rule Calculation**: Point matrices derived directly from official KTU regulation files (`rules/2019/2019-v1.json`, `rules/2024/2024-v1.json`).
* **5-Step Explainable Calculation Trace**: Visualizes document facts, matched rule, base points, category cap adjustments, and final award rationale.
* **"How Can I Get More Points?" Advisor**: Analyzes unfilled category capacity and suggests official qualifying activities.
* **Duplicate Detection**: SHA-256 file hashing and semantic activity cross-checking prevents duplicate credit.
* **Interactive Benchmark Lab**: In-browser UI to execute 500+ document evaluation benchmarks and view latency P50/P95 distributions.

---

## 🛠️ Technology Stack

* **Frontend**: React (JavaScript), Vite, React Router, Recharts, Vanilla CSS Design System, Lucide Icons.
* **Backend**: Node.js, Express.js (ESM / JavaScript), Mongoose, Multer, `pdf-parse`.
* **AI & Document Intelligence**: Google Gemini API (`@google/generative-ai`, `gemini-2.5-flash`) behind swappable `CertificateAnalyzer` interface.
* **Database**: MongoDB (with built-in in-memory fallback for local development).
* **Authentication**: JWT, bcryptjs, HTTP-only cookies, strict user-isolation checks.

---

## 📦 Quickstart & Installation

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/ktu-activity-points.git
cd ktu-activity-points

# Install root, server, and client dependencies
npm run install:all
```

### 2. Configure Environment Variables
Copy the `.env.example` file:
```bash
cp .env.example .env
```
Edit `.env` if you want to attach your Google Gemini API key:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ktu-activity-points
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
```
*(Note: If no Gemini API key is provided, the platform automatically switches to its local heuristic document analyzer for seamless offline development and testing.)*

### 3. Run Automated Tests
```bash
npm test
```

### 4. Run the 500+ Document Benchmark Suite
```bash
npm run evaluate
```

### 5. Start Full-Stack Development Servers
```bash
npm run dev
```
- Frontend Client: `http://localhost:5173`
- Backend REST API: `http://localhost:5000`

---

## 📄 License
MIT License
