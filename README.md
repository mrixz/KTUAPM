# 🎓 KTU Activity Points AI Platform

> **An AI-assisted, scheme-aware activity-point management platform for KTU students with intelligent document understanding, deterministic rule execution, evidence validation, duplicate detection, explainable calculations, and cloud-ready deployment.**

<p align="center">

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4.21-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Render](https://img.shields.io/badge/Deployed_on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)

</p>

---

## 🌐 Live Application

**KTU Activity Points AI Platform**

👉 https://ktuapm.onrender.com/

---

## 📌 Problem

Under **APJ Abdul Kalam Technological University (KTU)** regulations, students must earn activity points through approved academic, technical, social, cultural, entrepreneurial, sports, professional, and extracurricular activities.

The requirements vary depending on the applicable academic scheme and admission type.

Examples include:

| Scheme | Entry Type | Required Activity Points |
|---|---|---:|
| 2019 Scheme | Regular | 100 |
| 2019 Scheme | Lateral Entry | 75 |
| 2024 Scheme | Regular | 120 |
| 2024 Scheme | Lateral Entry | 90 |

Managing these points manually introduces several problems:

- 📄 Students must maintain large numbers of certificates.
- 🧮 Point calculations involve category-specific rules and limits.
- 🔁 Duplicate certificates may accidentally be submitted multiple times.
- 🧠 Different schemes contain different point matrices.
- 🔍 Certificates may contain ambiguous or incomplete information.
- 🚫 Posters, advertisements and unrelated documents must not be treated as valid evidence.
- 📊 Students often struggle to understand how many points they have earned and what remains.

---

# 💡 The Solution

KTU Activity Points uses a **three-layer architecture** that deliberately separates AI interpretation from authoritative activity-point calculation.

```text
Student Upload
      │
      ▼
┌─────────────────────────────┐
│ 1. Evidence Validation      │
│                             │
│ Is this actually evidence   │
│ of completed activity?      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 2. AI Document Understanding│
│                             │
│ Gemini extracts structured  │
│ facts from the document     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 3. Deterministic Rule Engine│
│                             │
│ Official KTU rules determine│
│ activity points             │
└──────────────┬──────────────┘
               │
               ▼
        Explainable Result
```

The core design principle is simple:

> **AI understands the document.  
> The rule engine decides the points.**

The AI model is **not allowed to invent or directly assign activity points**.

---

# 🧠 AI Document Understanding

Uploaded certificates are analysed using **Google Gemini 2.5 Flash**.

The AI layer extracts structured information such as:

- Activity title
- Activity category
- Subcategory
- Student participation
- Organizer
- Institution
- Event level
- Award / achievement
- Duration
- Start and end dates
- Certificate number
- Participation status
- Evidence type
- Confidence
- Supporting text

Example:

```json
{
  "documentType": "certificate",
  "activityTitle": "Web Development Workshop",
  "category": "technical",
  "subcategory": "workshop",
  "organizer": "IEEE Student Branch",
  "level": "college",
  "participation": true,
  "durationDays": 2,
  "confidence": 0.94
}
```

This structured output is then passed to the deterministic rule engine.

---

# 🛡️ Evidence Validation

A major design requirement is preventing arbitrary uploaded documents from receiving activity points.

The platform classifies uploaded evidence using three states:

```text
VALID_EVIDENCE
INVALID_EVIDENCE
INSUFFICIENT_EVIDENCE
```

## ✅ VALID_EVIDENCE

The uploaded document provides sufficient evidence that the student actually completed or participated in an activity.

Examples:

- Participation certificate
- Completion certificate
- Achievement certificate
- Internship certificate
- Workshop certificate
- Competition certificate
- MOOC / NPTEL certificate

Only **VALID_EVIDENCE** can proceed to activity classification and point calculation.

---

## ❌ INVALID_EVIDENCE

The document clearly does not prove completed student activity.

Examples:

- Posters
- Event advertisements
- Registration notices
- Political posters
- Student-organization posters
- Flyers
- Payment receipts
- Random screenshots
- Unrelated PDFs
- Certificates belonging clearly to another student

Result:

```text
Point Engine: NOT INVOKED
Points Awarded: 0
```

---

## ⚠️ INSUFFICIENT_EVIDENCE

The system cannot confidently determine whether the document proves completed activity.

Examples:

- Very blurry certificate
- Missing participant details
- Incomplete scan
- Extremely low-quality image
- Ambiguous document

Result:

```text
Points Awarded: 0
```

The system fails safely instead of guessing.

Because apparently giving university credits to random posters is not a feature worth preserving.

---

# 🧮 Deterministic KTU Rule Engine

Activity points are calculated by a **versioned deterministic rules engine**.

The engine evaluates:

```text
Student Scheme
      +
Entry Type
      +
Activity Category
      +
Activity Level
      +
Achievement
      +
Duration
      +
Existing Category Usage
      ↓
Final Activity Points
```

The AI model never decides the final point value.

This architecture improves:

- Predictability
- Explainability
- Testing
- Auditability
- Scheme compatibility
- Rule maintenance

---

# 🔎 Explainable Calculation Trace

Every accepted activity can produce a step-by-step explanation.

Example:

```text
Step 1
Scheme detected:
KTU 2019 Scheme

Step 2
Evidence validated:
VALID_EVIDENCE

Step 3
Activity identified:
Workshop

Step 4
KTU rule matched:
Technical Workshop → eligible activity

Step 5
Category limit checked:
Maximum category limit not exceeded

Final Result:
Activity Points Awarded
```

Students can therefore understand **why points were awarded**, rather than receiving a mysterious number from an equally mysterious machine.

---

# 🔁 Duplicate Detection

The platform prevents repeated certificate submissions using multiple checks.

### SHA-256 File Hash

```text
Uploaded File
     ↓
SHA-256 Hash
     ↓
Existing Hash Search
     ↓
Duplicate Detected
```

Identical files can therefore be rejected before activity points are calculated.

Additional document metadata can also be used to detect suspiciously similar submissions.

---

# 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         REACT + VITE CLIENT                         │
│                                                                     │
│  Authentication              Dashboard                             │
│  Certificate Upload          Activity Analytics                    │
│  Scheme Progress             Calculation Trace                     │
│  Rules Explorer              Upload History                        │
│  Responsive UI               Notifications                         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                         HTTPS REST API
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EXPRESS.JS SERVER                           │
│                                                                     │
│  ┌─────────────────────┐  ┌──────────────────────┐                 │
│  │ Authentication      │  │ Student Profile      │                 │
│  │                     │  │                      │                 │
│  │ JWT                 │  │ Scheme Resolution    │                 │
│  │ bcrypt              │  │ Entry Type           │                 │
│  └─────────────────────┘  └──────────────────────┘                 │
│                                                                     │
│  ┌─────────────────────┐  ┌──────────────────────┐                 │
│  │ Evidence Validator  │  │ AI Document Engine   │                 │
│  │                     │  │                      │                 │
│  │ VALID               │  │ Gemini 2.5 Flash     │                 │
│  │ INVALID             │  │ Fact Extraction      │                 │
│  │ INSUFFICIENT        │  │ Confidence Analysis  │                 │
│  └──────────┬──────────┘  └──────────┬───────────┘                 │
│             │                        │                             │
│             └────────────┬───────────┘                             │
│                          ▼                                         │
│              ┌──────────────────────┐                              │
│              │ KTU Rule Engine      │                              │
│              │                      │                              │
│              │ Scheme Rules         │                              │
│              │ Category Limits      │                              │
│              │ Activity Mapping     │                              │
│              │ Calculation Trace    │                              │
│              └──────────┬───────────┘                              │
│                         │                                          │
│        ┌────────────────┼────────────────┐                         │
│        ▼                ▼                ▼                         │
│  Duplicate Engine   Analytics       Storage Layer                 │
│                                                                     │
│  SHA-256            Progress        MongoDB GridFS                 │
│  Metadata Checks    Categories      Cloud Storage                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MONGODB ATLAS                               │
│                                                                     │
│ Users                                                               │
│ Student Profiles                                                    │
│ Certificates                                                        │
│ AI Extraction Results                                               │
│ Activity Point Records                                              │
│ Evaluation Data                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

# ✨ Features

## 👤 Student Authentication

- Student registration
- Secure login
- JWT authentication
- Password hashing using bcrypt
- Password change support
- Protected student routes
- Persistent sessions

---

## 🎓 Academic Profile

Students provide academic information including:

- Admission year
- Entry type
- Program
- Scheme-related details

The backend determines the applicable KTU activity-point scheme automatically.

---

## 📤 Certificate Upload

Students can upload activity evidence in supported formats such as:

```text
PDF
JPG
JPEG
PNG
```

The upload pipeline performs:

```text
Upload
  ↓
File Validation
  ↓
Duplicate Detection
  ↓
Evidence Validation
  ↓
AI Document Understanding
  ↓
KTU Rule Evaluation
  ↓
Point Calculation
  ↓
Dashboard Update
```

---

# 📊 Student Dashboard

The dashboard provides students with a visual overview of their progress.

Features include:

- Total points earned
- Required points
- Remaining points
- Scheme information
- Category-wise distribution
- Recent submissions
- Certificate processing status
- Activity history
- Progress indicators
- Rule-based recommendations

---

# 📚 Scheme-Aware Rule System

The rule engine supports different KTU regulations through structured rule definitions.

Example concept:

```javascript
{
  scheme: "2019",
  category: "technical",
  activity: "workshop",
  level: "college",
  points: 5,
  categoryLimit: 20
}
```

This allows rules to be:

- Updated
- Tested
- Versioned
- Audited

without embedding every rule directly into application logic.

---

# 📈 Analytics

The application provides activity-point analytics including:

- Overall progress
- Category utilization
- Remaining requirement
- Activity history
- Scheme-aware progress
- Recent certificate processing

Built using:

![Recharts](https://img.shields.io/badge/Recharts-Visualization-22B5BF?style=flat-square)

---

# 🧱 Technology Stack

## Frontend

```text
React 18
Vite
Tailwind CSS
Recharts
Axios
React Router
```

---

## Backend

```text
Node.js
Express.js
Mongoose
JWT
bcrypt
Multer
```

---

## AI

```text
Google Gemini 2.5 Flash
Structured Document Understanding
Evidence Validation
Activity Fact Extraction
Confidence Analysis
```

---

## Database

```text
MongoDB Atlas
Mongoose ODM
MongoDB GridFS
```

---

## Deployment

```text
Render Static Site
Render Web Service
MongoDB Atlas
```

---

# 📁 Project Structure

```text
KTUAPM/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.jsx
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── rules/
│   ├── utils/
│   └── server.js
│
├── evaluation/
│   ├── datasets/
│   ├── reports/
│   └── scripts/
│
├── package.json
├── .env.example
└── README.md
```

---

# 🚀 Local Development

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/KTUActivityPointManager.git
cd KTUActivityPointManager
```

---

## 2. Install Dependencies

```bash
npm run install:all
```

Or install individually:

```bash
cd server
npm install

cd ../client
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file for the backend.

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_development_jwt_secret

GEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL=gemini-2.5-flash

STORAGE_PROVIDER=local

FRONTEND_URL=http://localhost:5173
```

### Frontend

Create:

```text
client/.env
```

```env
VITE_API_URL=http://localhost:5000
```

> Never place database credentials, JWT secrets, Gemini keys or storage secrets inside `VITE_*` variables.

Anything exposed through Vite environment variables may be included in the browser build.

---

# ▶️ Run Development Servers

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

---

# ☁️ Production Deployment

The production architecture uses two Render services.

```text
Render
│
├── Static Site
│   └── React / Vite Frontend
│
└── Web Service
    └── Node.js / Express Backend
```

---

# 🖥️ Frontend Deployment

Create a **Render Static Site**.

### Configuration

```text
Root Directory:
client

Build Command:
npm install && npm run build

Publish Directory:
dist
```

### Environment Variable

```env
VITE_API_URL=https://YOUR-BACKEND.onrender.com
```

### SPA Rewrite

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

---

# ⚙️ Backend Deployment

Create a **Render Web Service**.

### Configuration

```text
Root Directory:
server

Build Command:
npm install

Start Command:
npm start

Health Check:
/health
```

### Required Environment Variables

```env
NODE_ENV=production

MONGODB_URI=your_mongodb_atlas_connection_string

JWT_SECRET=your_secure_random_secret

GEMINI_API_KEY=your_google_ai_api_key

GEMINI_MODEL=gemini-2.5-flash

FRONTEND_URL=https://ktuapm.onrender.com

STORAGE_PROVIDER=gridfs
```

Render automatically provides the runtime `PORT`.

---

# 💾 Persistent Certificate Storage

Render web-service filesystems should not be treated as permanent storage.

The application therefore supports persistent external storage.

## MongoDB GridFS

```env
STORAGE_PROVIDER=gridfs
```

Advantages:

- Integrated with MongoDB Atlas
- Persistent
- No separate storage provider required

---

## Cloudinary

```env
STORAGE_PROVIDER=cloudinary

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## S3-Compatible Storage

The architecture can also support object-storage systems such as:

```text
AWS S3
Cloudflare R2
Backblaze B2
DigitalOcean Spaces
```

---

# 🔐 Security

The application follows several security practices:

### 🔑 Secret Management

Sensitive values are stored through environment variables.

```text
MongoDB credentials
JWT secret
Gemini API key
Cloud storage credentials
```

These must never be committed to Git.

---

### 🔒 Password Security

Passwords are hashed using:

```text
bcrypt
```

Plain-text passwords are never stored.

---

### 🪪 Authentication

Protected API routes use authenticated access tokens.

---

### 🌍 CORS

Production API access is restricted to configured frontend origins.

Example:

```env
FRONTEND_URL=https://ktuapm.onrender.com
```

---

### 🧼 Error Sanitization

Production responses should avoid exposing:

- Internal stack traces
- Database credentials
- API keys
- File-system paths
- Infrastructure secrets

Detailed diagnostics remain server-side.

---

# 🧪 Testing

Run automated tests using:

```bash
npm test
```

Important validation scenarios include:

```text
✓ Valid activity certificate
✓ Valid workshop certificate
✓ Valid MOOC certificate
✓ Duplicate certificate
✓ Workshop advertisement poster
✓ Political/student-organization poster
✓ Unrelated image
✓ Blurry certificate
✓ Unsupported file
✓ Invalid authentication
✓ Category-limit enforcement
✓ Scheme-specific point calculation
```

---

# 🧠 AI Safety Principle

The application intentionally follows a conservative decision policy:

```text
UNCERTAIN DOCUMENT
        ↓
NO AUTOMATIC POSITIVE POINTS
```

A classification prediction alone is **not sufficient** to award activity points.

The system requires:

```text
Valid Evidence
      +
Structured Activity Facts
      +
Applicable KTU Rule
      +
Category Limit Validation
      =
Final Activity Points
```

This reduces false-positive point awards from posters, advertisements and unrelated uploads.

---

# 📊 Evaluation

The repository includes infrastructure for evaluating:

- Evidence-validation accuracy
- Activity classification accuracy
- Point-calculation correctness
- Duplicate detection
- Processing latency
- Automation rate
- Scheme correctness

Evaluation reports can be maintained under:

```text
evaluation/reports/
```

Only benchmark values generated from reproducible evaluation runs should be published as measured results.

Because adding a percentage sign to a number does not magically turn it into science.

---

# 🎯 Engineering Goals

| Metric | Target |
|---|---:|
| Valid-document classification accuracy | > 80% |
| Point-engine deterministic consistency | 100% |
| Duplicate detection for identical files | 100% |
| Invalid evidence positive-point rate | As close to 0% as possible |
| Production API availability | High |
| Automated document processing | ≥ 90% |
| Explainable rule execution | 100% of awarded activities |

---

# 🗺️ Future Improvements

Potential future development includes:

- Improved certificate authenticity detection
- Better document-quality analysis
- Advanced semantic duplicate detection
- Larger benchmark datasets
- Stronger AI evaluation datasets
- Additional KTU scheme versions
- Accessibility improvements
- Progressive Web App support
- Advanced activity recommendations
- Exportable activity-point reports

---

# 🚫 Product Scope

This repository represents the **student-only version** of the platform.

It intentionally does **not** include:

```text
Faculty Login
Faculty Registration
Faculty Dashboard
Admin Dashboard
Manual Faculty Verification
Role-Based Faculty Approval Workflow
```

The purpose of this version is to provide students with an independent system for:

- Tracking activity points
- Uploading certificates
- Understanding KTU rules
- Analysing progress
- Automatically interpreting activity evidence

---

# ❤️ Built For KTU Students

KTU Activity Points is designed to replace this:

```text
Certificate Folder
      +
Calculator
      +
KTU PDF
      +
Spreadsheet
      +
Confusion
```

with this:

```text
Upload Certificate
        ↓
Understand Activity
        ↓
Apply KTU Rules
        ↓
Explain Calculation
        ↓
Track Progress
```

---

## 📄 License

This project is licensed under the **MIT License**.

---

<p align="center">

### 🎓 KTU Activity Points AI Platform

**AI for understanding. Rules for decisions. Evidence before points.**

![Made with React](https://img.shields.io/badge/Made_with-React-61DAFB?style=flat-square&logo=react)
![Powered by Node](https://img.shields.io/badge/Powered_by-Node.js-339933?style=flat-square&logo=nodedotjs)
![AI Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash-4285F4?style=flat-square&logo=google)
![Database MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-47A248?style=flat-square&logo=mongodb)
![Hosted Render](https://img.shields.io/badge/Hosted_on-Render-46E3B7?style=flat-square&logo=render)

</p>
