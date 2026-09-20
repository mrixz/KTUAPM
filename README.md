# KTU Activity Points AI Platform

> **An AI-assisted, scheme-aware KTU student activity-point management platform with deterministic rule execution, explainable calculation traces, and production-ready cloud deployment.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21-blue.svg)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev)
[![Gemini](https://img.shields.io/badge/Gemini_API-2.5_Flash-orange.svg)](https://ai.google.dev)
[![Render](https://img.shields.io/badge/Deploy-Render_Ready-46e3b7.svg)](https://render.com)
[![Architecture](https://img.shields.io/badge/Architecture-3--Tier_Decoupled-purple.svg)](#system-architecture)

---

## 📌 Problem & Motivation

Under APJ Abdul Kalam Technological University (KTU) regulations, engineering students must earn **100 activity points** (or **75 points** for Lateral Entry students under 2019 Scheme, **120 / 90 points** under 2024 Scheme) across multiple categories to qualify for graduation. 

However, manual verification of activity certificates faces severe bottlenecks:
* **Complex Multi-Scheme Rules**: 2019 and 2024 regulations enforce distinct categories, point matrices, caps, and duration limits.
* **Manual Verification Friction**: Reviewing a single certificate manually takes **3–5 minutes**, causing heavy backlogs during semester graduation audits.
* **Arithmetic & Cap Overflow Errors**: Manual auditing frequently miscalculates category caps (e.g. max points allowed per activity head).
* **Duplicate Document Fraud**: Identical or repeated certificates often escape detection when submitted across different terms.

---

## 💡 The Solution: 3-Layer Decoupled Intelligence

**KTU Activity Points** solves this by strictly separating AI document interpretation from authoritative rule calculations:

1. **Layer 1: Academic Profile & Scheme Resolution**  
   Student registration attributes (admission year, entry type, program) automatically resolve the authoritative KTU scheme (2019 vs 2024) and point quotas (Regular: 100/120 pts, Lateral: 75/90 pts) server-side.
2. **Layer 2: AI Document Understanding**  
   Google Gemini 2.5 Flash acts strictly as a **document understanding engine**, extracting structured facts (title, category, subcategory, organizer, level, award, duration, dates, certificate number, confidence). **The LLM is strictly forbidden from assigning point values.**
3. **Layer 3: Deterministic Rule Engine**  
   A data-driven, versioned rule engine evaluates extracted facts against official KTU point matrices, enforces real-time category caps, detects duplicates via SHA-256 and semantic analysis, and generates an **explainable 5-step calculation trace**.

---

## 🏛️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CLIENT: REACT / VITE (Render Static Site)               │
│  - Modern Glassmorphism UI             - Real-Time Upload & Pipeline View   │
│  - Scheme-Aware Recharts Dashboard     - 5-Step Trace Rationale Inspector   │
│  - "How Can I Get More Points?"        - Benchmark Lab Suite                │
│  - Environment API URL (VITE_API_URL)  - Dynamic SPA Client Routing         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API (Bearer JWT & CORS)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     SERVER: EXPRESS.JS (Render Web Service)                 │
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
│  │ - MongoDB GridFS     │  │ - SHA-256 Hash       │  │ - Scheme-Aware    │  │
│  │ - Cloudinary / S3    │  │ - Semantic Matching  │  │ - Capacity Meters │  │
│  │ - LocalStorage (Dev) │  │                      │  │                   │  │
│  └──────────────────────┘  └──────────────────────┘  └───────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Health Check Endpoint (/health & /api/health)                         │  │
│  │ Telemetry & Evaluation Benchmark Suite (500+ Documents Benchmark)      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Mongoose ODM
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                           MONGODB ATLAS DATABASE                            │
│  - Users & StudentProfiles            - Certificates & Extraction Facts     │
│  - MongoDB GridFS Binary Buckets      - Evaluation Runs & Reports           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Production Deployment on Render

The platform is designed to be deployed cleanly onto **Render** with two distinct services:
1. **Frontend Static Site** (`client/` root directory)
2. **Backend Web Service** (`server/` root directory)

### A. Deploy Backend Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/) → **New +** → **Web Service**.
2. Connect your Git repository.
3. Configure the following settings:
   - **Name**: `ktuapm-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. In **Environment Variables**, add:

| Key | Example / Recommended Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations & sanitization |
| `PORT` | `10000` (or leave default) | Auto-injected by Render |
| `FRONTEND_URL` | `https://ktuapm.onrender.com` | URL of your deployed frontend (for CORS) |
| `MONGODB_URI` | `mongodb+srv://<user>:<pass>@cluster0.abcde.mongodb.net/ktu-activity-points?retryWrites=true&w=majority` | MongoDB Atlas connection string |
| `JWT_SECRET` | *(64-character random secret)* | Secure secret for JWT signing |
| `GEMINI_API_KEY` | *(Your Google AI Studio Key)* | Google Gemini API key for OCR/fact extraction |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `STORAGE_PROVIDER` | `gridfs` | **Recommended**: Persistent storage in MongoDB Atlas |

---

### B. Deploy Frontend Static Site on Render

1. Go to [Render Dashboard](https://dashboard.render.com/) → **New +** → **Static Site**.
2. Connect your Git repository.
3. Configure the following settings:
   - **Name**: `ktuapm`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. In **Redirects / Rewrites**, add the SPA rewrite rule:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
5. In **Environment Variables**, add:

| Key | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://ktuapm-api.onrender.com/api` | Direct URL to your Render Web Service API |

---

### C. Persistent Storage Configuration

Render Web Services feature ephemeral disks. To persist student certificate uploads:

1. **Option 1: MongoDB GridFS (Recommended / Zero Extra Config)**
   - Set `STORAGE_PROVIDER=gridfs`.
   - Files are stored in MongoDB Atlas automatically without needing extra accounts.
2. **Option 2: Cloudinary**
   - Set `STORAGE_PROVIDER=cloudinary`.
   - Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. **Option 3: AWS S3 / Compatible Object Storage**
   - Set `STORAGE_PROVIDER=s3`.
   - Add `AWS_BUCKET_NAME`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.

---

## 📦 Quickstart & Local Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/KTUAPM.git
cd KTUAPM

# Install root, server, and client dependencies
npm run install:all
```

### 2. Configure Local Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your local MongoDB URI (or MongoDB Atlas connection) and Gemini API key:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ktu-activity-points
JWT_SECRET=your_jwt_dev_secret_key_change_in_production
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
```

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
- **Frontend Client**: `http://localhost:5173` (with Vite dev proxy to backend)
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`

---

## 🎯 Measurable Engineering Targets & Benchmark Results

The platform was instrumented with end-to-end telemetry and evaluated across a benchmark dataset of **520 certificate documents**:

| Target Metric | Benchmark Goal | Measured Result | Status |
|---|---|---|---|
| **Document Evaluation Scale** | 500+ Documents | **520 Certificates Evaluated** | ✅ **PASSED** |
| **Automated Processing Rate** | ≥ 90.0% | **100.0%** (520 / 520 automated) | ✅ **PASSED** |
| **95th Percentile Latency (P95)**| < 10.00s (10,000ms) | **0.001s (local) / < 1.5s (live)** | ✅ **PASSED** |
| **AI Classification Accuracy** | > 80.0% | **82.5%** Ground-Truth Alignment | ✅ **PASSED** |
| **Manual Verification Speedup** | Measurable | **~190x - 275x Faster** (<1.5s vs 235s) | ✅ **PASSED** |

> *Full benchmark report: [`evaluation/reports/evaluation-report.md`](evaluation/reports/evaluation-report.md)*

---

## 🔒 Security & Best Practices

- **Zero Hardcoded Secrets**: All keys, secrets, and database URIs are provided via environment variables.
- **Cross-Domain JWT & Cookie Support**: Supports `Authorization: Bearer <token>` header, query token extraction for document previews, and `SameSite=None; Secure` cookies in production.
- **No Secret Leakage**: `VITE_*` prefixes are strictly limited to the public API URL. Backend secrets (MongoDB, Gemini, JWT, Cloudinary) are never exposed.
- **Production Error Sanitization**: Internal server errors and stack traces are suppressed in `production` mode while maintaining structured server-side logging.
- **CORS Protection**: Restricted to authorized origins (`FRONTEND_URL` and `ALLOWED_ORIGINS`).

---

## 📄 License
MIT License
