# KTUAPM — COMPLETE TECHNICAL REPOSITORY CONTEXT REPORT FOR CHATGPT

> **Document Purpose**: Comprehensive, authoritative technical architecture and implementation documentation for the **KTU Activity Point Manager (KTUAPM)** repository (`mrixz/KTUAPM`).
> **Primary Objective**: Provide an exhaustive context baseline for AI diagnosing production certificate-upload issues (specifically HTTP 400 Bad Request on `POST /api/certificates?sync=true` or cross-device upload anomalies) and advising further system enhancements.
> **Scope**: **STUDENT-ONLY** edition (no faculty/admin portal, no approval workflows, no role-based multi-tier auth).
> **Security Notice**: All sensitive secrets (MongoDB credentials, JWT secrets, Gemini API keys, Cloudinary credentials) have been verified and replaced with `<REDACTED>`.

---

## 1. REPOSITORY OVERVIEW

The repository is structured as a modern Node.js/Express backend and a React/Vite Single Page Application (SPA) client in a monorepo workspace.

```
KTUAPM/
├── package.json                          # Root scripts, dev orchestration, dependencies
├── render.yaml                           # Render Blueprint (Web API + Static Site)
├── .env.example                          # Environment variable template
├── rules/                                # KTU Activity Point Regulation Rulesets
│   ├── 2019/                             # KTU 2019 Scheme Activity Point Rules
│   │   └── 2019-v1.json
│   ├── 2024/                             # KTU 2024 Scheme (NEP) Activity Point Rules
│   │   └── 2024-v1.json
│   └── schema/
│       └── rule-schema.json              # JSON schema for rule definitions
├── client/                               # Frontend Single Page Application
│   ├── package.json                      # Client dependencies (React 18, Vite 6, Axios)
│   ├── vite.config.js                    # Vite dev server, proxies (/api, /uploads), manual chunks
│   ├── index.html                        # SPA shell, viewport, Google Fonts (Inter), path redirect
│   └── src/
│       ├── main.jsx                      # Entrypoint, StrictMode, ErrorBoundary mounting
│       ├── App.jsx                       # HashRouter, AuthProvider, NotificationProvider, Routes
│       ├── index.css                     # Pure Vanilla CSS design tokens & utilities (No Tailwind)
│       ├── components/
│       │   ├── certificates/             # UploadDropzone.jsx, CertTable.jsx, CalculationTraceModal.jsx
│       │   ├── common/                   # Badge.jsx, Button.jsx, StatCard.jsx, ErrorBoundary.jsx, etc.
│       │   └── layout/                   # AppLayout.jsx, Navbar.jsx, Sidebar.jsx, ProtectedRoute.jsx
│       ├── context/
│       │   ├── AuthContext.jsx           # Student auth state, session bootstrap, token refresh
│       │   └── NotificationContext.jsx   # Toast alerts (success, error, warning, info)
│       ├── pages/
│       │   ├── Dashboard.jsx             # Student points summary, category breakdown, progress
│       │   ├── Certificates.jsx          # Uploaded certificate listing, filters, search
│       │   ├── Upload.jsx                # Certificate submission workflow page
│       │   ├── CertificateDetail.jsx     # Detailed certificate metadata, trace, re-process
│       │   ├── Analytics.jsx             # Category distribution, radar charts, timelines
│       │   ├── Opportunities.jsx         # Scheme-tailored point earning recommendations
│       │   ├── Evaluation.jsx            # Pipeline accuracy benchmark & test runner UI
│       │   ├── Profile.jsx               # Student academic registration profile
│       │   ├── Login.jsx                 # Student sign-in
│       │   └── Register.jsx              # Student registration with automatic scheme derivation
│       └── services/
│           ├── api.js                    # Axios instance, baseURL resolution, token & FormData interceptors
│           ├── authService.js            # Auth & student profile HTTP client
│           ├── certService.js            # Certificate upload, query, delete, file download HTTP client
│           ├── analyticsService.js       # Analytics & evaluation benchmark HTTP client
│           └── rulesService.js           # Activity rules inspection HTTP client
├── server/                               # Backend REST API Service
│   ├── package.json                      # Server dependencies (Express, Mongoose, Multer, Gemini)
│   ├── src/
│   │   ├── server.js                     # Express app setup, CORS, security headers, route mounting, DB boot
│   │   ├── config/
│   │   │   ├── env.js                    # Centralized environment variable loader & validation
│   │   │   ├── db.js                     # Mongoose connection manager with DNS SRV resolver
│   │   │   └── constants.js              # Enums (SCHEMES, STATUSES, MIME types, 10MB limit)
│   │   ├── controllers/
│   │   │   ├── authController.js         # Register, login, logout, password reset, email verification
│   │   │   ├── certController.js         # uploadCertificate, getCertificates, deleteCertificate, reprocess
│   │   │   ├── profileController.js      # Student profile & dashboard points summary
│   │   │   ├── analyticsController.js    # Student analytics engine endpoints
│   │   │   ├── rulesController.js        # Scheme rules inspection
│   │   │   └── evalController.js         # Benchmark test runner endpoint
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js         # JWT auth (Cookie -> Bearer header -> query string token)
│   │   │   ├── uploadMiddleware.js       # Multer memoryStorage, fileFilter (.pdf,.png,.jpg,.jpeg), size limit
│   │   │   ├── errorHandler.js           # Central error handler (MulterError, ValidationError, 400/409/500)
│   │   │   └── rateLimit.js              # Rate limiters for auth and API operations
│   │   ├── models/
│   │   │   ├── User.js                   # Student auth model (name, email, passwordHash, tokenVersion)
│   │   │   ├── StudentProfile.js         # Academic profile (regNo, program, branch, scheme, requiredPoints)
│   │   │   ├── Certificate.js            # Certificate record, file metadata, AI facts, status, points, trace
│   │   │   ├── ProcessingTelemetry.js    # Latency and performance telemetry per upload
│   │   │   └── EvaluationRun.js          # Pipeline benchmark history
│   │   ├── routes/
│   │   │   ├── authRoutes.js             # /api/auth/*
│   │   │   ├── certRoutes.js             # /api/certificates/* (Protected)
│   │   │   ├── profileRoutes.js          # /api/student/* (Protected)
│   │   │   ├── analyticsRoutes.js        # /api/analytics/* (Protected)
│   │   │   ├── rulesRoutes.js            # /api/rules/* (Protected)
│   │   │   └── evalRoutes.js             # /api/evaluation/* (Protected)
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── CertificateAnalyzer.js          # Abstract analyzer interface
│   │   │   │   ├── GeminiCertificateAnalyzer.js    # Gemini 2.5 Flash / Vision multimodal extractor
│   │   │   │   └── CustomMLCertificateAnalyzer.js  # Phase 2 ML stub
│   │   │   ├── pipeline/
│   │   │   │   ├── CertificateProcessingPipeline.js # Multi-stage processing orchestrator
│   │   │   │   ├── textExtractor.js                # pdf-parse text extraction
│   │   │   │   ├── documentValidator.js            # Pre-classification document integrity gatekeeper
│   │   │   │   └── duplicateDetector.js            # SHA-256 exact & semantic duplicate detector
│   │   │   ├── points/
│   │   │   │   ├── PointCalculationEngine.js       # Deterministic KTU rule & category cap evaluator
│   │   │   │   └── traceGenerator.js               # Step-by-step audit explanation generator
│   │   │   ├── rules/
│   │   │   │   ├── RuleEngine.js                   # Rule evaluation & category limit enforcement
│   │   │   │   └── ruleLoader.js                   # Schema validator & JSON ruleset loader
│   │   │   ├── scheme/
│   │   │   │   └── SchemeResolver.js               # Automatic 2019/2024 Scheme & entry type resolver
│   │   │   ├── storage/
│   │   │   │   ├── CertificateStorageService.js    # Storage facade with automatic GridFS fallback
│   │   │   │   ├── StorageProvider.js              # Abstract storage interface
│   │   │   │   ├── GridFSStorageProvider.js        # MongoDB GridFS storage (zero external dependencies)
│   │   │   │   ├── CloudStorageProvider.js         # Cloudinary / AWS S3 cloud storage
│   │   │   │   └── LocalStorageProvider.js         # Local disk storage (dev environment)
│   │   │   ├── email/
│   │   │   │   └── emailService.js                 # Nodemailer transactional email service
│   │   │   └── telemetry/
│   │   │       └── TelemetryService.js             # Telemetry recording service
│   │   └── utils/
│   │       ├── fileHash.js                         # SHA-256 hash & text normalizer
│   │       └── logger.js                           # Standardized console logger
│   └── tests/                                      # Node.js built-in test suites (86 passing tests)
│       ├── uploadValidation.test.js
│       ├── auth.test.js
│       ├── documentValidationAndMLIntegrity.test.js
│       ├── duplicateDetector.test.js
│       ├── ruleEngine.test.js
│       ├── sampleCertificates.test.js
│       ├── schemeResolver.test.js
│       ├── regression4Way.test.js
│       ├── registrationAndPipeline.test.js
│       └── analyticsEngine.test.js
├── evaluation/                                     # Benchmark dataset & synthetic generator
│   ├── ground-truth/
│   ├── synthetic/
│   └── runner.js
├── scripts/
│   ├── dev.js                                      # Concurrent dev runner
│   ├── test-gemini.js                              # Gemini API probe
│   └── verify-api.js                               # API health check script
└── uploads/                                        # Local storage directory (gitignored)
```

---

## 2. EXACT TECHNOLOGY STACK

All versions verified directly from `package.json` and `package-lock.json`:

### Frontend
- **React**: `^18.3.1` (`react-dom`: `^18.3.1`)
- **Vite**: `^6.1.0` (dev dependency, resolves to `6.4.3` at build time) with `@vitejs/plugin-react: ^4.3.4`
- **Styling / CSS**: **Pure Vanilla CSS** (`client/src/index.css` with CSS custom properties, glassmorphism, responsive utility classes). **TailwindCSS is NOT installed or used.**
- **HTTP Client**: `axios: ^1.7.9` (plus native `fetch` in select browser API calls)
- **Routing**: `react-router-dom: ^7.1.5` configured with `HashRouter` (ensures routing integrity across static hosts like Render Static Sites)
- **Icons**: `lucide-react: ^0.475.0`
- **Charts / Visualizations**: `recharts: ^2.15.1`, `canvas-confetti: ^1.9.4`, `clsx: ^2.1.1`
- **State Management**: React Context API (`AuthContext.jsx`, `NotificationContext.jsx`) and local component state (`useState`, `useRef`). No Redux, Zustand, or MobX.
- **Upload Mechanism**: Native browser `FormData` sent through Axios `api.post('/certificates?sync=false', formData)`.

### Backend
- **Node Engine Expectation**: `>=18.0.0` (npm `>=9.0.0`)
- **Web Framework**: `express: ^4.21.2`
- **Database & ODM**: `mongoose: ^8.9.5` (MongoDB Atlas in production), `mongodb-memory-server: ^10.1.3` (available for offline unit tests)
- **Multipart Upload Engine**: `multer: ^1.4.5-lts.1` configured with `memoryStorage()`
- **Authentication**: `jsonwebtoken: ^9.0.2`, `bcryptjs: ^2.4.3`, `cookie-parser: ^1.4.7`
- **Cloud Storage**: `CloudStorageProvider.js` uses native Node.js / web standard `fetch` against Cloudinary's REST API endpoint (`https://api.cloudinary.com/v1_1/<cloudName>/<resourceType>/upload`). No separate npm `cloudinary` package is imported.
- **OCR / Document Extraction**:
  - `pdf-parse: ^1.1.1` for extracting text streams from digital PDF buffers.
  - `@google/generative-ai: ^0.24.0` (Gemini 2.5 Flash) for multimodal document understanding, text extraction from scanned images/PDFs, and structured fact extraction.
- **Hashing**: Native Node.js `crypto` (`crypto.createHash('sha256')`, `crypto.createHash('sha1')`, `crypto.randomBytes(32)`).
- **Email**: `nodemailer: ^10.0.10`
- **Logging & Security**: `morgan: ^1.10.0`, `cors: ^2.8.5`, `dotenv: ^16.4.7`, `express-rate-limit: ^8.7.0`
- **Test Framework**: Node.js built-in test runner (`node:test` and `node:assert`, executed via `node --test`).

---

## 3. IMPORTANT PACKAGE.JSON SCRIPTS

### Root `package.json` (Working Directory: `<workspace_root>`)
```json
{
  "dev": "node scripts/dev.js",
  "server": "npm --prefix server start",
  "client": "npm --prefix client run dev",
  "test": "npm --prefix server test",
  "evaluate": "node evaluation/runner.js",
  "build": "npm --prefix client run build",
  "install:all": "npm install && npm --prefix server install && npm --prefix client install"
}
```

### Client `client/package.json` (Working Directory: `client/`)
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

### Server `server/package.json` (Working Directory: `server/`)
```json
{
  "start": "node src/server.js",
  "dev": "node --watch src/server.js",
  "test": "node --test tests/**/*.test.js"
}
```

---

## 4. CURRENT GIT STATE

- **Current Branch**: `main`
- **Configured Remotes (credentials omitted)**:
  - `origin`: `https://github.com/mrixz/KTUAPM.git` (fetch)
  - `origin`: `https://github.com/mrixz/KTUAPM.git` (push)
- **Working Tree**: Clean (`nothing to commit, working tree clean`)
- **Latest 5 Commit Messages**:
  1. `d9de5ea` — *Enhance cross-device compatibility, add ErrorBoundary, and enforce document validation to reject posters and non-certificates*
  2. `8ea272b` — *Fix cross-device certificate uploads*
  3. `9036f03` — *Use asynchronous upload with polling to prevent mobile socket drops and fix error state*
  4. `b0429f9` — *Enhance storage resiliency with GridFS fallback and allow local network CORS*
  5. `eee0983` — *Fix production certificate uploads*
- **Modified / Untracked Files**: None.

---

## 5. FRONTEND ROUTES

All frontend routes are defined in `client/src/App.jsx` using `HashRouter`:

| Route URL | Component / File | Protected? | Description / Features |
|---|---|---|---|
| `#/auth/login` | [`Login.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/pages/Login.jsx) | Public | Student login with email & password |
| `#/auth/register` | [`Register.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/pages/Register.jsx) | Public | Student registration with automatic scheme resolution |
| `#/dashboard` | [`Dashboard.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/pages/Dashboard.jsx) | **Protected** | Overall points progress, category totals, recent uploads |
| `#/certificates` | [`Certificates.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/pages/Certificates.jsx) | **Protected** | Table of student's uploaded certificates with search & status filters |
| `#/upload` | [`Upload.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/pages/Upload.jsx) | **Protected** | Certificate upload page embedding `UploadDropzone.jsx` |
| `#/certificates/upload` | Redirect to `#/upload` | **Protected** | Alias redirect |
| `#/certificates/:id` | [`CertificateDetail.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/pages/CertificateDetail.jsx) | **Protected** | View extracted facts, calculation trace, re-process, delete certificate |
| `#/analytics` | [`Analytics.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/pages/Analytics.jsx) | **Protected** | Category radar charts, points velocity, graduation requirements audit |
| `#/opportunities` | [`Opportunities.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/pages/Opportunities.jsx) | **Protected** | Rule-tailored high-ROI activity recommendations |
| `#/evaluation` | [`Evaluation.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/pages/Evaluation.jsx) | **Protected** | Evaluation benchmark dashboard & live test runner |
| `#/profile` | [`Profile.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/pages/Profile.jsx) | **Protected** | Student academic details, scheme, entry type, password management |
| `#/` / `*` | Redirect to `#/dashboard` | Public/Catch-all | Default landing redirect |

---

## 6. FRONTEND API CONFIGURATION

The API client configuration resides entirely in [`client/src/services/api.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/services/api.js).

### API Base URL Selection Logic
```javascript
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || typeof envUrl !== 'string' || !envUrl.trim()) {
    return '/api';
  }
  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true // Send the httpOnly auth cookie on every request
});
```

### Request & Response Interceptors
```javascript
// Request interceptor: send Bearer token if available (supports cross-origin environments where 3rd-party cookies are blocked)
api.interceptors.request.use(
  (reqConfig) => {
    const token = localStorage.getItem('token');
    if (token && !reqConfig.headers.Authorization) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    // If sending FormData, delete Content-Type so browser/Axios sets multipart/form-data with the correct boundary
    if (typeof FormData !== 'undefined' && reqConfig.data instanceof FormData) {
      if (reqConfig.headers?.delete) {
        reqConfig.headers.delete('Content-Type');
      } else if (reqConfig.headers) {
        delete reqConfig.headers['Content-Type'];
      }
    }
    return reqConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthPage =
        window.location.hash.includes('/auth/') ||
        window.location.pathname.includes('/auth/');
      if (!isAuthPage) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.hash = '#/auth/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### How Production Resolves the Backend URL:
1. In Render, the static site build receives `VITE_API_URL` dynamically linked from the `ktuapm-api` Web Service (`https://ktuapm-api.onrender.com`).
2. At build time, Vite embeds `VITE_API_URL = "https://ktuapm-api.onrender.com"`.
3. At runtime, `getApiBaseUrl()` reads `import.meta.env.VITE_API_URL`, strips trailing slashes, appends `/api` if not already present, producing:
   `https://ktuapm-api.onrender.com/api`
4. If `VITE_API_URL` is omitted (e.g. local development with Vite dev server), it falls back to `'/api'`, which is proxied to `http://localhost:5000` via `vite.config.js`.

---

## 7. COMPLETE CERTIFICATE UPLOAD FRONTEND FLOW

### Step-by-Step Flow
1. **User Interaction**: Student accesses `#/upload` ([`Upload.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/pages/Upload.jsx)), which renders [`UploadDropzone.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/components/certificates/UploadDropzone.jsx).
2. **File Selection**: User drags a file into the drop area or clicks to open native file picker (`<input type="file" ref={inputRef} accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" style={{ display: 'none' }} onChange={handleFileChange} />`).
3. **Frontend Validation (`handleFileSelected`)**:
   - Checks `selectedFile.size === 0` (Rejects with error toast).
   - Checks for Apple HEIC format (`.heic`, `.heif`, `image/heic`, `image/heif`).
   - Checks allowed types (`.pdf`, `.png`, `.jpg`, `.jpeg` and `application/pdf`, `image/png`, `image/jpeg`). If both `file.type` and filename extension fail, rejects.
   - Checks `selectedFile.size > 10 * 1024 * 1024` (10 MB).
   - On passing, sets `file` React state and clears previous results.
4. **Initiating Upload**:
   - User clicks `"Analyse Certificate"` button (`triggerUpload()`).
   - `triggerUpload` asserts `isUploadingRef.current === false`, `!processing`, and `file instanceof File || file instanceof Blob`.
   - Sets `isUploadingRef.current = true`, `processing = true`, `currentStep = 1`.
5. **FormData Creation & HTTP Dispatch** ([`certService.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/services/certService.js)):
   ```javascript
   const formData = new FormData();
   const fileName = file.name || 'certificate.pdf';
   formData.append('certificate', file, fileName);
   const res = await api.post(`/certificates?sync=false`, formData);
   ```
6. **Backend Processing & Polling**:
   - `POST /api/certificates?sync=false` returns HTTP 202 Accepted with `{ success: true, certificate: { _id, processingStatus: 'PROCESSING' } }`.
   - `UploadDropzone.jsx` enters an asynchronous polling loop calling `certService.getCertificateById(cert._id)` every 1500ms (up to 35 attempts / ~50s max).
   - While polling, visual step progression advances across steps (1: Reading -> 2: Identifying -> 3: KTU Rules -> 4: Calculating points -> 5: Done).
7. **Result Display**:
   - Once `certificate.processingStatus !== 'PROCESSING'`, polling breaks.
   - If `COUNTED`: Shows success card with points awarded (`+X Activity Points!`), confetti animation, and expandable calculation trace explanation.
   - If `DUPLICATE`: Shows warning card stating the duplicate reason.
   - If `NOT_ELIGIBLE` & document was a poster/ad/flyer: Shows red warning card indicating document is an event poster or non-certificate.
   - If `INSUFFICIENT_RULE_DATA`: Shows amber card ("Certificate accepted — more information needed; event level required").
   - If `FAILED`: Shows failure message with "View details" and "Try another file".
8. **Error Handling**:
   - If the initial `POST` fails (e.g. 400 Bad Request, 401 Unauthorized, 422 Unprocessable), `currentStep` is reset to `0`, `processing` is reset to `false`, `isUploadingRef.current` is reset to `false`, and the exact server error message is displayed via toast.

---

## 8. EXACT MULTIPART REQUEST IMPLEMENTATION

### Frontend Request Code ([`certService.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/services/certService.js))
```javascript
export const certService = {
  async uploadCertificate(file, sync = false) {
    if (!file || (!(file instanceof File) && !(file instanceof Blob))) {
      throw new Error('Invalid file object. An actual File or Blob is required for upload.');
    }
    if (typeof file.size === 'number' && file.size === 0) {
      throw new Error('The selected certificate file is empty (0 bytes).');
    }

    const formData = new FormData();
    const fileName = file.name || 'certificate.pdf';
    formData.append('certificate', file, fileName);

    const res = await api.post(`/certificates?sync=${sync}`, formData);
    return res.data;
  }
};
```

### Direct Answers:
- **Endpoint**: `/api/certificates`
- **HTTP Method**: `POST`
- **Query Parameters**: `?sync=false` (in `UploadDropzone.jsx`). Can also be called with `?sync=true` for synchronous test/script invocations.
- **FormData Field Name**: `'certificate'`
- **Is `Content-Type: multipart/form-data` manually set?**: **NO.** It is intentionally deleted in [`api.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/services/api.js) request interceptor if present (`delete reqConfig.headers['Content-Type']`) so that the browser / Axios automatically sets `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...`.
- **Does Axios / Browser generate the multipart boundary?**: **YES.**
- **Does the field name match backend Multer?**: **YES.** Multer is configured with `.single('certificate')`.
- **Can upload function run more than once per user click?**: **NO.** It is double-guarded by `if (!file || processing || isUploadingRef.current) return;` using both a React `useState` (`processing`) and a synchronous React `useRef` (`isUploadingRef.current = true`).

---

## 9. FILE VALIDATION — FRONTEND

Implemented in [`UploadDropzone.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/components/certificates/UploadDropzone.jsx):

```javascript
const handleFileSelected = (selectedFile) => {
  if (!selectedFile) return;

  if (selectedFile.size === 0) {
    error('The selected certificate file is empty. Please choose a valid file.');
    return;
  }

  const fileName = selectedFile.name?.toLowerCase() || '';
  const isHeic =
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif') ||
    selectedFile.type === 'image/heic' ||
    selectedFile.type === 'image/heif';

  if (isHeic) {
    error('Apple HEIC image format is not supported directly. Please convert your photo to JPG, PNG, or PDF before uploading.');
    return;
  }

  const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));
  const hasValidMime = selectedFile.type && validTypes.includes(selectedFile.type.toLowerCase());

  if (!hasValidMime && !hasValidExtension) {
    error('Please upload a PDF, PNG, or JPG certificate.');
    return;
  }

  if (selectedFile.size > 10 * 1024 * 1024) {
    error('The file is larger than 10 MB. Please compress it and try again.');
    return;
  }

  setFile(selectedFile);
  setResult(null);
  setShowTrace(false);
};
```

### Specific Validation Specifications:
- **Allowed MIME Types**: `'application/pdf'`, `'image/png'`, `'image/jpeg'`, `'image/jpg'`
- **Allowed File Extensions**: `'.pdf'`, `'.png'`, `'.jpg'`, `'.jpeg'`
- **Maximum File Size**: `10 * 1024 * 1024` bytes (10 MB)
- **Minimum File Size**: `> 0` bytes (`selectedFile.size === 0` is rejected)
- **Is `file.type` mandatory?**: **NO.** Notice `if (!hasValidMime && !hasValidExtension)`. If `file.type` is blank (`""`) or unrecognized by the OS/browser, but `fileName` ends with `.pdf`, `.png`, `.jpg`, or `.jpeg`, the file passes validation.
- **What happens if `file.type === ""`?**: `hasValidMime` evaluates to `false`, but `hasValidExtension` evaluates to `true` (if extension is valid), so validation **succeeds**.
- **Difference between Drag/Drop vs File Picker**: None. Both `handleDrop` and `handleFileChange` pass `files[0]` into the identical `handleFileSelected` function.

---

## 10. FILE SIZE DISPLAY

Code from [`UploadDropzone.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/components/certificates/UploadDropzone.jsx):

```javascript
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
```

### Analysis:
- **Can a small non-zero file display as 0.00 MB?**: **NO.**
  - Files `< 1024` bytes display as `${bytes} B` (e.g. `520 B`).
  - Files `< 1 MB` display as `${(bytes / 1024).toFixed(1)} KB` (e.g. `12.4 KB`).
  - Files `>= 1 MB` display as `${(bytes / 1024 / 1024).toFixed(2)} MB`, where the minimum formatted value is `1.00 MB`.
- **Evidence of `File.size` becoming zero**: On certain mobile devices (iOS Safari with iCloud Photo Library or Android with Google Drive storage provider), if a user selects a cloud-backed file that has not yet finished local streaming/downloading, mobile OS file pickers can return an empty 0-byte File descriptor. This is explicitly intercepted on frontend (`selectedFile.size === 0`) and backend (`size === 0` or `buffer.length === 0`), returning HTTP 400 `EMPTY_FILE`.

---

## 11. DUPLICATE REQUEST INVESTIGATION

- **Code Review**:
  - `UploadDropzone.jsx` uses standard button `onClick={triggerUpload}` (no `<form onSubmit>`).
  - `triggerUpload` checks both `if (processing || isUploadingRef.current) return;` and immediately sets `isUploadingRef.current = true`.
  - Button element has `disabled={processing}`.
  - No `useEffect` initiates uploads on render or state change.
  - React 18 `StrictMode` wraps `<App />` in `main.jsx`, but only affects component mount lifecycle hooks, not user click event handlers.
  - Axios has no automatic retry interceptors configured.
- **Finding**: **No duplicate-trigger path found in code.**

---

## 12. BACKEND CERTIFICATE ROUTE

Defined in [`server/src/routes/certRoutes.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/routes/certRoutes.js):

```javascript
import express from 'express';
import {
  uploadCertificate,
  getCertificates,
  getCertificateById,
  deleteCertificate,
  reprocessCertificate,
  streamCertificateFile
} from '../controllers/certController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadSingle } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', uploadSingle, uploadCertificate);
router.get('/', getCertificates);
router.get('/:id', getCertificateById);
router.delete('/:id', deleteCertificate);
router.post('/:id/process', reprocessCertificate);
router.get('/:id/file', streamCertificateFile);

export default router;
```

### Complete Middleware Execution Sequence:
```
POST /api/certificates
  │
  ▼
1. protect (authMiddleware.js)            --> Verifies JWT, extracts req.user
  │
  ▼
2. uploadSingle (uploadMiddleware.js)      --> Multer memoryStorage, validates file & MIME
  │
  ▼
3. uploadCertificate (certController.js)   --> Hash buffer, save to storage, launch pipeline
```

---

## 13. MULTER / MULTIPART CONFIGURATION

Implementation in [`server/src/middleware/uploadMiddleware.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/middleware/uploadMiddleware.js):

```javascript
import multer from 'multer';
import path from 'path';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../config/constants.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(`Unsupported file extension "${ext}". Allowed: PDF, PNG, JPG, JPEG.`),
      false
    );
  }

  // Permissive check: accept standard MIME types, common browser aliases, or fallback if extension is valid
  const validMimes = [
    ...ALLOWED_MIME_TYPES,
    'application/x-pdf',
    'image/pjpeg',
    'image/x-png',
    'application/octet-stream',
    'binary/octet-stream'
  ];

  if (file.mimetype && !validMimes.includes(file.mimetype.toLowerCase())) {
    return cb(
      new Error(`Unsupported MIME type "${file.mimetype}". Allowed: PDF, PNG, JPG.`),
      false
    );
  }

  cb(null, true);
};

const _multerSingle = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES // 10MB (10 * 1024 * 1024)
  },
  fileFilter
}).single('certificate');

export const uploadSingle = (req, res, next) => {
  _multerSingle(req, res, (err) => {
    if (!err) return next();
    if (err.name !== 'MulterError') {
      err.name = 'MulterError';
    }
    return next(err);
  });
};
```

### Direct Answers:
- **Storage Engine**: `multer.memoryStorage()` (File buffer resides in RAM as `req.file.buffer`).
- **Expected Field Name**: `'certificate'` (`upload.single('certificate')`).
- **Accepted MIME Types**:
  `application/pdf`, `image/png`, `image/jpeg`, `image/jpg`, `application/x-pdf`, `image/pjpeg`, `image/x-png`, `application/octet-stream`, `binary/octet-stream`.
- **What happens if MIME type is blank / undefined?**: The check `if (file.mimetype && !validMimes.includes(...))` is skipped because `file.mimetype` is falsy. As long as the file extension is `.pdf`, `.png`, `.jpg`, or `.jpeg`, Multer **accepts** the file.
- **Status Code Returned for Rejected Files**: `HTTP 400 Bad Request` formatted by `errorHandler.js`.
- **What errors produce HTTP 400?**:
  1. `LIMIT_FILE_SIZE` (> 10 MB) -> `400 { success: false, error: 'FILE_TOO_LARGE', message: 'Certificate must be smaller than 10 MB.' }`
  2. Unsupported extension / MIME -> `400 { success: false, error: 'UNSUPPORTED_FILE_TYPE', message: 'PDF, JPG and PNG certificates are supported.' }`
  3. Wrong multipart field name -> `400 { success: false, error: 'UPLOAD_ERROR', message: 'File upload error: Unexpected field' }`

---

## 14. ALL HTTP 400 PATHS IN CERTIFICATE UPLOAD

Every condition in the codebase that can trigger `HTTP 400 Bad Request` during certificate upload:

| File Path | Code / Trigger Condition | Status Code | Error Code | Response Message / Body |
|---|---|---|---|---|
| `server/src/middleware/uploadMiddleware.js` + `server/src/middleware/errorHandler.js` | File extension is not `.pdf`, `.png`, `.jpg`, or `.jpeg` | `400` | `UNSUPPORTED_FILE_TYPE` | `{ success: false, error: "UNSUPPORTED_FILE_TYPE", message: "PDF, JPG and PNG certificates are supported." }` |
| `server/src/middleware/uploadMiddleware.js` + `server/src/middleware/errorHandler.js` | File MIME type is truthy and not in allowed/alias list | `400` | `UNSUPPORTED_FILE_TYPE` | `{ success: false, error: "UNSUPPORTED_FILE_TYPE", message: "PDF, JPG and PNG certificates are supported." }` |
| `server/src/middleware/uploadMiddleware.js` + `server/src/middleware/errorHandler.js` | Uploaded file size exceeds `10 MB` (`LIMIT_FILE_SIZE`) | `400` | `FILE_TOO_LARGE` | `{ success: false, error: "FILE_TOO_LARGE", message: "Certificate must be smaller than 10 MB." }` |
| `server/src/middleware/uploadMiddleware.js` + `server/src/middleware/errorHandler.js` | FormData field name is not `'certificate'` (e.g. `'file'`, `'doc'`) | `400` | `UPLOAD_ERROR` | `{ success: false, error: "UPLOAD_ERROR", message: "File upload error: Unexpected field" }` |
| `server/src/controllers/certController.js` | `!req.file` (No file attached or body was empty) | `400` | `NO_FILE` | `{ success: false, error: "NO_FILE", message: "Please attach a valid certificate file (PDF, PNG, JPG)." }` |
| `server/src/controllers/certController.js` | `!buffer \|\| buffer.length === 0 \|\| size === 0` | `400` | `EMPTY_FILE` | `{ success: false, error: "EMPTY_FILE", message: "The selected certificate file is empty." }` |
| `server/src/middleware/errorHandler.js` | Mongoose validation error on `Certificate.create()` | `400` | N/A | `{ success: false, message: err.message, errors: [...] }` |

*(Note: Auth failures return `401`, CORS rejections return `403`, document non-eligibility/failure during `?sync=true` returns `422`, and unexpected exceptions return `500`).*

---

## 15. AUTHENTICATION FLOW

- **Mechanism**: JSON Web Token (JWT) with session revocation tracking via `tokenVersion`.
- **Login Endpoint**: `POST /api/auth/login` (in [`authController.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/controllers/authController.js)).
- **JWT Creation**:
  ```javascript
  const generateToken = (userId, tokenVersion) => {
    return jwt.sign({ userId, tv: tokenVersion }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn // '7d'
    });
  };
  ```
- **Dual-Token Storage on Frontend**:
  - The server issues the token in an `httpOnly` cookie (`token`) AND in the JSON response body (`res.data.token`).
  - Frontend [`authService.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/services/authService.js) stores `res.data.token` into `localStorage.setItem('token', token)` and `localStorage.setItem('user', JSON.stringify(user))`.
- **How API Requests Retrieve and Transmit the Token**:
  - Axios request interceptor in [`api.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/services/api.js) reads `localStorage.getItem('token')` and attaches `Authorization: Bearer <token>`.
  - In addition, `withCredentials: true` ensures the browser sends the `httpOnly` cookie if supported.
- **Backend Authentication Verification ([`authMiddleware.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/middleware/authMiddleware.js))**:
  - Checks (1) `req.cookies.token`, then (2) `req.headers.authorization` (`Bearer <token>`), then (3) `req.query.token` (for direct file downloads).
  - Decodes token using `jwt.verify(token, config.jwtSecret)`.
  - Validates `decoded.tv === user.tokenVersion`.
- **Is the Same Client Used for Certificate Upload?**: **YES.** `certService.uploadCertificate` uses the configured `api` instance from `client/src/services/api.js`.

---

## 16. CORS CONFIGURATION

Implementation in [`server/src/server.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/server.js):

```javascript
const buildAllowedOrigins = () => {
  const origins = new Set([
    'https://ktuapm.onrender.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:5000'
  ]);

  const frontendEnv = process.env.FRONTEND_URL || config.frontendUrl;
  if (frontendEnv) {
    frontendEnv.split(',').forEach((url) => {
      const clean = url.trim().replace(/\/+$/, '');
      if (clean) origins.add(clean);
    });
  }

  const allowedEnv = process.env.ALLOWED_ORIGINS || config.allowedOrigins;
  if (allowedEnv) {
    allowedEnv.split(',').forEach((url) => {
      const clean = url.trim().replace(/\/+$/, '');
      if (clean) origins.add(clean);
    });
  }

  return Array.from(origins);
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server, health probes)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      const dynamicOrigins = buildAllowedOrigins();

      if (
        dynamicOrigins.includes(normalizedOrigin) ||
        (process.env.NODE_ENV || config.nodeEnv) !== 'production'
      ) {
        return callback(null, true);
      }

      // Check if matches Render frontend pattern
      if (
        normalizedOrigin === 'https://ktuapm.onrender.com' ||
        (normalizedOrigin.startsWith('https://') && normalizedOrigin.endsWith('.onrender.com'))
      ) {
        return callback(null, true);
      }

      // Allow local and private LAN origins (for testing from mobile devices / tablets on same local Wi-Fi)
      const isLocalNetwork = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(normalizedOrigin);
      if (isLocalNetwork) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);
```

### Direct Answers:
- **Environment Variables Used**: `FRONTEND_URL`, `ALLOWED_ORIGINS`, `NODE_ENV`.
- **Allowed Origins in Production**:
  - `https://ktuapm.onrender.com`
  - Any origin ending with `.onrender.com`
  - Any explicit origins listed in `FRONTEND_URL` / `ALLOWED_ORIGINS`
  - Any private local network IP (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`) for cross-device local Wi-Fi testing.
- **Allowed Methods**: `['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']`
- **Allowed Headers**: `['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']`
- **Credentials Setting**: `credentials: true`

---

## 17. DATABASE CONNECTION

Implementation in [`server/src/config/db.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/config/db.js):

- **Environment Variable Name**: `MONGODB_URI`
- **Startup Sequence**:
  1. `server.js` calls `await connectDB()`.
  2. `connectDB()` configures public DNS resolvers (`8.8.8.8`, `1.1.1.1`, `8.8.4.4`) to resolve `mongodb+srv://` SRV records reliably in cloud container environments.
  3. Connects via `mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })`.
  4. Strictly checks `mongoose.connection.readyState === 1`. If not ready, the process logs a fatal error and terminates (`process.exit(1)`). Server port binding is completely blocked without an active database.
  5. Fallback to in-memory databases is completely disabled in production.
- **Dependency**: Certificate upload strictly depends on MongoDB because it immediately creates a `Certificate` record and queries `StudentProfile`.

---

## 18. CERTIFICATE MODEL

Defined in [`server/src/models/Certificate.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/models/Certificate.js):

```javascript
const certificateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalFilename: { type: String, required: true },
    storageKey: { type: String, required: true },
    fileHash: { type: String, required: true, index: true },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, default: 0 },

    // AI-extracted structured information
    certificateTitle: { type: String, default: null },
    documentType: { type: String, default: 'certificate' },
    activityCategory: { type: String, default: null, index: true },
    subcategory: { type: String, default: null },
    eventName: { type: String, default: null },
    organizer: { type: String, default: null },
    achievement: { type: String, default: null },
    level: { type: String, default: null },
    position: { type: String, default: null },
    duration: { type: String, default: null },
    certificateDate: { type: Date, default: null },
    participantName: { type: String, default: null },
    certificateNumber: { type: String, default: null, index: true },
    relevantText: { type: String, default: null },

    // AI Metadata
    llmModel: { type: String, default: null },
    llmConfidence: { type: Number, min: 0, max: 1, default: 0 },
    extractedData: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Processing status
    processingStatus: {
      type: String,
      enum: ['PROCESSING', 'COUNTED', 'NOT_ELIGIBLE', 'INSUFFICIENT_EVIDENCE', 'DUPLICATE', 'FAILED'],
      default: 'PROCESSING',
      index: true
    },
    statusReason: { type: String, default: null },

    // Academic & Rule Context
    scheme: { type: String, default: null },
    entryType: { type: String, default: null },
    ruleVersion: { type: String, default: null },
    matchedRuleId: { type: String, default: null },

    // Deterministic Rule Engine Points
    basePoints: { type: Number, default: 0 },
    categoryAdjustment: { type: Number, default: 0 },
    overallAdjustment: { type: Number, default: 0 },
    finalPoints: { type: Number, default: 0 },

    // Calculation trace
    calculationTrace: { type: mongoose.Schema.Types.Mixed, default: [] },

    uploadedAt: { type: Date, default: Date.now, index: true },
    processedAt: { type: Date, default: null }
  },
  { timestamps: true }
);
```

---

## 19. STORAGE ARCHITECTURE

The storage architecture is managed by the [`CertificateStorageService.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/services/storage/CertificateStorageService.js) facade.

### Implemented Providers:
1. **`GridFSStorageProvider.js`**: Stores files directly inside MongoDB Atlas using `mongoose.mongo.GridFSBucket`. **This is the production default** because Render web services have ephemeral filesystems and GridFS requires zero third-party cloud credentials.
2. **`CloudStorageProvider.js`**: Supports Cloudinary and AWS S3 via REST API.
3. **`LocalStorageProvider.js`**: Stores files in `uploads/` directory on disk. Used by default in local development.

### Resiliency Fallback Architecture:
If the primary configured provider (e.g. Cloudinary or Local Storage) encounters an error or network timeout, `CertificateStorageService` automatically catches the exception and falls back to saving the file in **MongoDB GridFS**, ensuring that student uploads never fail due to external cloud storage credential issues.

---

## 20. CLOUDINARY IMPLEMENTATION

Implemented in [`server/src/services/storage/CloudStorageProvider.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/services/storage/CloudStorageProvider.js):

- **Upload Flow**:
  - Uses native web `fetch` to POST `multipart/form-data` to Cloudinary's upload API:
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`
  - Signed using SHA-1 signature (`crypto.createHash('sha1')`).
- **Resource Type Resolution**:
  - PDFs (`application/pdf`, `.pdf`) are assigned `resource_type: "raw"`.
  - Images (PNG, JPG, JPEG) are assigned `resource_type: "image"`.
- **Buffer / Stream**:
  - Converts file buffer into `new Blob([buffer], { type: blobType })` and appends to `FormData`.
- **Stored Values**:
  - `storageKey` is saved as `data.secure_url || data.url`.
  - `getFile(storageKey)` fetches the buffer directly from the stored HTTPS URL.

### Direct Answers:
- **Are PDFs supported?**: **YES** (routed as `raw` resource type).
- **Are JPG/JPEG/PNG supported?**: **YES** (routed as `image` resource type).
- **Is `resource_type: "auto"` used?**: **NO.** PDF vs image is explicitly routed (`raw` for PDF, `image` for images).
- **Is returned `secure_url` saved?**: **YES.**
- **Can certificate later be retrieved?**: **YES**, via `CloudStorageProvider.getFile(storageKey)` which fetches the URL.

---

## 21. LOCAL STORAGE IMPLEMENTATION

Implemented in [`server/src/services/storage/LocalStorageProvider.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/services/storage/LocalStorageProvider.js):

- **Directory**: `uploads/` (or `UPLOAD_DIR` env).
- **Filename**: `${userId}_${Date.now()}_${randomHex}.${ext}`.
- **Serving**: `server.js` serves local uploads via `app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))`.
- **Default Selection**: In development (`NODE_ENV !== 'production'`), local storage is selected unless `STORAGE_PROVIDER` is set. In production/Render, `gridfs` is the default.

---

## 22. OCR / TEXT EXTRACTION FLOW

1. **Extraction Step** ([`textExtractor.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/services/pipeline/textExtractor.js)):
   - **Text-based PDF**: `pdf-parse(buffer)` extracts digital text stream. If extracted text `< 20` characters, flagged as `isImageOnly: true`.
   - **Scanned PDF**: If `pdf-parse` fails or returns empty text, returns `{ text: '', numPages: 1, isImageOnly: true }`.
   - **Images (JPG, PNG)**: Returns `{ text: '', isImageOnly: true }`.
2. **AI Vision Understanding** ([`GeminiCertificateAnalyzer.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/services/ai/GeminiCertificateAnalyzer.js)):
   - If `text` has `> 30` characters, sends text to Gemini.
   - If `isImageOnly: true` (scanned document or PNG/JPG), encodes `buffer` to base64 and passes an `inlineData` image part directly to Gemini 2.5 Flash multimodal vision API. Gemini performs end-to-end OCR, visual structure comprehension, and fact extraction simultaneously.

---

## 23. GEMINI / AI PROCESSING

Implemented in [`GeminiCertificateAnalyzer.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/services/ai/GeminiCertificateAnalyzer.js):

- **Package**: `@google/generative-ai: ^0.24.0`
- **Default Model**: `gemini-2.5-flash` (configurable via `GEMINI_MODEL`).
- **Prompt Structure**:
  Enforces strict integrity guidelines:
  - Determines if document is a genuine personal certificate (`isCertificate: true`).
  - Identifies and rejects event posters, call-for-registration flyers, student union/political propaganda, advertisements (`isCertificate: false`).
  - Extracts title, event name, organizer, achievement level, position, duration, date, certificate number.
  - **Explicitly forbidden from calculating points** (prompt instruction: *"NEVER calculate, assign, or output any KTU activity points or scores"*).
- **Output Schema**: Structured JSON enforced via Gemini's `responseMimeType: 'application/json'`.
- **Fallback Behavior**:
  - If `gemini-2.5-flash` returns model migration/404, it retries `gemini-1.5-flash`.
  - If API key is missing or quota/network fails, it falls back to the deterministic local heuristic fact extractor `_heuristicAnalyze()`, ensuring the pipeline continues operating.

---

## 24. OTHER ML/OCR IMPLEMENTATIONS

- **FastAPI / Python ML Service**: **NONE.** There is no Python runtime, FastAPI server, PyPDF2, or scikit-learn service in the repository.
- **Tesseract.js**: **NONE.** Tesseract is not in `package.json` and is not called.
- **`CustomMLCertificateAnalyzer.js`**: This file is an abstract stub reserved for future custom model plug-ins.

---

## 25. CERTIFICATE PROCESSING PIPELINE

Implemented in [`server/src/services/pipeline/CertificateProcessingPipeline.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/services/pipeline/CertificateProcessingPipeline.js):

### Pipeline Stages:
```
1. Resolve Certificate Document (from DB)
   │
2. Fetch Student Profile (scheme, entryType, requiredPoints)
   │
3. Exact Duplicate Detection (SHA-256 hash lookup)
   │
4. Retrieve Document Buffer from StorageProvider (GridFS / Cloudinary / Local)
   │
5. Text Extraction (pdf-parse / Image prep)
   │
6. AI Fact Extraction (Gemini 2.5 Flash / Vision)
   │
7. Document Validity Gatekeeper (DocumentValidator: reject posters/ads/flyers)
   │
8. Semantic Duplicate Detection (Cert Number / Event check)
   │
9. Query Existing COUNTED Certificates (for category cap tracking)
   │
10. Deterministic Point Calculation (PointCalculationEngine & KTU Ruleset)
   │
11. Record Calculation Trace & Status (COUNTED, NOT_ELIGIBLE, DUPLICATE, etc.)
   │
12. Save Certificate to MongoDB
   │
13. Record Performance Telemetry (ProcessingTelemetry)
```

### Synchronous vs Asynchronous (`?sync=true` vs `?sync=false`):
- **`sync=false` (Default in `UploadDropzone.jsx`)**: The controller stores the file, saves the initial `Certificate` record with status `PROCESSING`, and returns `HTTP 202 Accepted` within ~1-2 seconds. It triggers the pipeline asynchronously in background `setImmediate()`. The client polls status every 1.5s until complete. This prevents mobile socket drops and browser timeouts.
- **`sync=true`**: The controller awaits `certificatePipeline.process(certificate)` directly before sending the response. If the pipeline succeeds, it returns `HTTP 201 Created`; if it fails, it returns `HTTP 422 Unprocessable Entity`.

---

## 26. DUPLICATE DETECTION

Implemented in [`server/src/services/pipeline/duplicateDetector.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/services/pipeline/duplicateDetector.js):

- **Exact File Duplicate**:
  - Hashing algorithm: SHA-256 (`crypto.createHash('sha256').update(buffer).digest('hex')`).
  - Hashed data: Raw bytes of the uploaded file buffer.
  - Query: `{ userId, fileHash, processingStatus: { $ne: 'FAILED' } }`.
  - Result if found: Status set to `DUPLICATE`, points set to `0`, reason notes upload date and previous points awarded.
  - Device dependence: **None.** SHA-256 of raw file bytes is completely independent of client OS, browser, or device.
- **Semantic Duplicate**:
  - Checks if `facts.certificateNumber` already exists in another `COUNTED` certificate for the same student.

---

## 27. CURRENT ENVIRONMENT VARIABLE NAMES

| Variable | Frontend / Backend | Required? | Purpose | Secret? |
|---|---|---|---|---|
| `PORT` | Backend | Optional | Port for Express server (default `5000`) | No |
| `NODE_ENV` | Backend | Optional | Runtime environment (`production` / `development` / `test`) | No |
| `FRONTEND_URL` | Backend | Required (Prod) | Production frontend URL for CORS origin check | No |
| `ALLOWED_ORIGINS` | Backend | Optional | Comma-separated extra allowed CORS origins | No |
| `MONGODB_URI` | Backend | **Required** | MongoDB connection string (Atlas / local) | **YES (`<REDACTED>`)** |
| `JWT_SECRET` | Backend | **Required** | Secret key for signing session tokens (64-char random string) | **YES (`<REDACTED>`)** |
| `JWT_EXPIRES_IN` | Backend | Optional | Token expiration duration (default `'7d'`) | No |
| `STORAGE_PROVIDER` | Backend | Optional | Storage provider: `gridfs` (prod default), `cloudinary`, `local` | No |
| `UPLOAD_DIR` | Backend | Optional | Local storage filesystem path (for `STORAGE_PROVIDER=local`) | No |
| `GEMINI_API_KEY` | Backend | **Required** | Google Gemini API key for multimodal document OCR | **YES (`<REDACTED>`)** |
| `GEMINI_MODEL` | Backend | Optional | Gemini model name (default `gemini-2.5-flash`) | No |
| `CONFIDENCE_THRESHOLD` | Backend | Optional | Minimum confidence threshold (default `0.70`) | No |
| `CLOUDINARY_CLOUD_NAME`| Backend | Optional | Cloudinary cloud name (if using Cloudinary storage) | No |
| `CLOUDINARY_API_KEY` | Backend | Optional | Cloudinary API Key | **YES (`<REDACTED>`)** |
| `CLOUDINARY_API_SECRET`| Backend | Optional | Cloudinary API Secret | **YES (`<REDACTED>`)** |
| `VITE_API_URL` | Frontend | **Required (Prod)**| Backend API base URL for Axios client | No |

---

## 28. EXPECTED RENDER CONFIGURATION

### Backend Web Service (`ktuapm-api`)
```
NODE_ENV=production
STORAGE_PROVIDER=gridfs
GEMINI_MODEL=gemini-2.5-flash
CONFIDENCE_THRESHOLD=0.75
JWT_SECRET=<REDACTED>
MONGODB_URI=<REDACTED>
GEMINI_API_KEY=<REDACTED>
FRONTEND_URL=https://ktuapm.onrender.com
APP_URL=https://ktuapm.onrender.com
```

### Frontend Static Site (`ktuapm`)
```
VITE_API_URL=https://ktuapm-api.onrender.com
```

---

## 29. ERROR HANDLING

### Backend Error Response Format
All errors sent by Express middleware or controllers follow this structure:
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable explanation."
}
```

### Frontend Axios Catch Mapping ([`UploadDropzone.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/components/certificates/UploadDropzone.jsx))
```javascript
} catch (err) {
  setCurrentStep(0);

  const serverCert = err?.response?.data?.certificate;
  if (err?.response?.status === 422 && serverCert) {
    setResult(serverCert);
    if (onUploadSuccess) onUploadSuccess(serverCert);
  } else {
    const serverMessage = err?.response?.data?.message;
    const status = err?.response?.status;
    if (status === 401) {
      error('Your session has expired. Please log in again.');
    } else if (serverMessage) {
      error(serverMessage);
    } else if (!err.response) {
      error('The server could not be reached. Please check your internet connection.');
    } else {
      error('We had trouble reading this certificate. Please check the file and try again.');
    }
  }
}
```

### Why HTTP 400 displays `"We had trouble reading this certificate"`:
If the server returns `HTTP 400` with `err.response.data.message`, the frontend displays that exact `serverMessage` (e.g. *"Please attach a valid certificate file (PDF, PNG, JPG)."* or *"Certificate must be smaller than 10 MB."*). If `err.response.data.message` is missing (for example, if a reverse proxy like Cloudflare or Render returns an HTML 400 error page or a raw text response), `serverMessage` is undefined, and the catch block falls back to the default message: `"We had trouble reading this certificate. Please check the file and try again."`.

---

## 30. PRODUCTION-SPECIFIC CODE

- **Storage Provider Selection** ([`env.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/config/env.js)): In production or when `RENDER === 'true'`, default storage provider is `'gridfs'` instead of `'local'`.
- **JWT Secret Startup Guard** ([`env.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/config/env.js)): If `NODE_ENV === 'production'` and `JWT_SECRET` is unset or matches default dev string, server aborts immediately with `process.exit(1)`.
- **CORS Strictness** ([`server.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/server.js)): In development, all origins are permitted. In production, only origins in `buildAllowedOrigins()` or matching `.onrender.com` or local LAN regex are allowed.
- **Cookie Security** ([`authController.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/controllers/authController.js)): `secure: true` and `sameSite: 'none'` are enforced in production for cross-site cookie transmission between `ktuapm.onrender.com` and `ktuapm-api.onrender.com`.
- **Security Headers** ([`server.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/server.js)): `Strict-Transport-Security: max-age=31536000; includeSubDomains` is appended in production.

---

## 31. TEST COVERAGE

The repository contains **10 automated test suites** with **86 unit and integration tests** in `server/tests/`:

1. [`uploadValidation.test.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/tests/uploadValidation.test.js):
   - Multer file extension validation (`.pdf`, `.png`, `.jpg`, `.jpeg`).
   - MIME type alias acceptance (`application/x-pdf`, `application/octet-stream`).
   - Rejection of invalid extensions (`.exe`, `.txt`, `.docx`) and unsupported MIME types.
   - HTTP 400 responses for `NO_FILE` and `EMPTY_FILE`.
   - File size limits (10 MB) and `MulterError` error handling.
   - Multi-source token resolution (Bearer header vs URL query string).
   - SHA-256 duplicate detection integrity.
   - Cloudinary `raw` (PDF) vs `image` (PNG/JPG) resource type routing.
2. [`auth.test.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/tests/auth.test.js): Token signing, verification, cookie options.
3. [`documentValidationAndMLIntegrity.test.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/tests/documentValidationAndMLIntegrity.test.js): Event posters, flyers, call-for-registration notices, political propaganda filtering.
4. [`duplicateDetector.test.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/tests/duplicateDetector.test.js): Exact SHA-256 and semantic certificate number duplicate handling.
5. [`ruleEngine.test.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/tests/ruleEngine.test.js): Comprehensive KTU point calculations and category caps for 2019 and 2024 schemes.
6. [`sampleCertificates.test.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/tests/sampleCertificates.test.js): Real-world certificate audits (NSS, Hackathons, Internships, Workshops).
7. [`schemeResolver.test.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/tests/schemeResolver.test.js): Automatic 2019 vs 2024 scheme and Regular vs Lateral entry point derivation.
8. [`regression4Way.test.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/tests/regression4Way.test.js): Four-way isolation testing across (2019 Regular, 2019 Lateral, 2024 Regular, 2024 Lateral).
9. [`registrationAndPipeline.test.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/tests/registrationAndPipeline.test.js): End-to-end registration and document processing lifecycle.
10. [`analyticsEngine.test.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/tests/analyticsEngine.test.js): Student point analytics and graduation readiness calculations.

---

## 32. BUILD / TEST RESULTS

Direct execution in the workspace:

### Frontend Build
- **Command**: `npm.cmd --prefix client run build`
- **Result**: **SUCCESS** (`built in 6.22s`)
- **Errors**: `None`
- **Output**: 
  - `dist/index.html` (1.79 kB)
  - `dist/assets/index-ZNwmnevi.css` (11.22 kB)
  - `dist/assets/vendor-lucide-DAsyMLhQ.js` (16.96 kB)
  - `dist/assets/vendor-axios-BCn5QfZZ.js` (51.44 kB)
  - `dist/assets/vendor-router-mOg3p3is.js` (181.42 kB)
  - `dist/assets/index-DklJ_iK1.js` (570.09 kB)

### Backend Tests
- **Command**: `npm.cmd --prefix server test`
- **Result**: **SUCCESS** (`86 passed, 0 failed across 29 suites in 7.4s`)
- **Errors**: `None`

---

## 33. LIKELY DEVICE-DEPENDENT RISK POINTS

Specific code-supported areas where cross-device behavior could differ:

### 1. Mobile Camera / Photo Library File Picker with Generic or Empty MIME Type
- **Code Involved**: [`client/src/components/certificates/UploadDropzone.jsx:83-88`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/components/certificates/UploadDropzone.jsx#L83-L88) and [`server/src/middleware/uploadMiddleware.js:28-33`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/middleware/uploadMiddleware.js#L28-L33)
- **Why it differs**: iOS Safari and some Android gallery pickers return files with `file.type === ""` or `application/octet-stream` (or `image/pjpeg`, `image/x-png`).
- **Current Status**: **Protected.** Both frontend and backend check file extension as fallback if MIME type is missing or generic.

### 2. Apple HEIC / HEIF Images from iOS Camera
- **Code Involved**: [`client/src/components/certificates/UploadDropzone.jsx:72-81`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/components/certificates/UploadDropzone.jsx#L72-L81)
- **Why it differs**: iPhones taking direct certificate photos capture in Apple HEIC format. If uploaded without conversion, Multer rejects with HTTP 400 `UNSUPPORTED_FILE_TYPE`.
- **Current Status**: **Protected.** Frontend intercepts `.heic` and `.heif` with a clear explanation instructing the student to export as JPG/PNG/PDF.

### 3. Cloud-Stored Zero-Byte File Descriptors on Mobile
- **Code Involved**: [`client/src/components/certificates/UploadDropzone.jsx:66-69`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/components/certificates/UploadDropzone.jsx#L66-L69) and [`server/src/controllers/certController.js:21-27`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/controllers/certController.js#L21-L27)
- **Why it differs**: If a mobile user chooses a file stored on iCloud Drive or Google Drive that is not locally synced, the browser file picker can yield a 0-byte File reference.
- **Current Status**: **Protected.** Explicitly caught on frontend and backend (`EMPTY_FILE`).

### 4. Third-Party Cookie Blocking on Mobile Browsers (iOS Safari ITP)
- **Code Involved**: [`client/src/services/api.js:22-28`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/services/api.js#L22-L28) and [`server/src/middleware/authMiddleware.js:8-16`](file:///c:/Users/tsmri/Documents/project/KTUAPM/server/src/middleware/authMiddleware.js#L8-L16)
- **Why it differs**: iOS Safari Intelligent Tracking Prevention blocks third-party cross-site cookies between `ktuapm.onrender.com` and `ktuapm-api.onrender.com`.
- **Current Status**: **Protected.** The app uses dual authentication: the token is saved in `localStorage` and sent via `Authorization: Bearer <token>` in Axios request headers, bypassing cookie blocking.

### 5. Previous Synchronous Upload Timeout on Slow Mobile Networks
- **Code Involved**: Historical commits had `POST /api/certificates?sync=true`.
- **Why it differed**: On mobile 3G/4G connections, a synchronous request awaiting Gemini AI processing (15-20s) frequently triggered socket timeouts or TCP drops.
- **Current Status**: **Fixed in commit `9036f03`.** `UploadDropzone.jsx` now uses `POST /api/certificates?sync=false` which completes the HTTP upload in < 2 seconds, followed by client polling.

---

## 34. CURRENT UPLOAD ARCHITECTURE DIAGRAM

```
+-------------------------------------------------------------------------------+
|                                BROWSER / CLIENT                               |
|                                                                               |
|  [ Student selects PDF / JPG / PNG ]                                          |
|                │                                                              |
|                ▼                                                              |
|  UploadDropzone.jsx  ──(handleFileSelected: validates extension, size, HEIC)  |
|                │                                                              |
|                ▼                                                              |
|  certService.uploadCertificate(file, sync = false)                            |
|                │                                                              |
|                ▼                                                              |
|  api.js (Axios Instance)                                                      |
|    - Attaches Authorization: Bearer <token>                                   |
|    - Strips explicit Content-Type (allows browser boundary generation)        |
+---------------------------------------┬---------------------------------------+
                                        │ HTTP POST /api/certificates?sync=false
                                        │ (Multipart FormData: 'certificate')
                                        ▼
+-------------------------------------------------------------------------------+
|                             EXPRESS BACKEND API                               |
|                                                                               |
|  1. authMiddleware.js (protect)                                               |
|     - Verifies JWT (Cookie or Bearer Header)                                  |
|     - Populates req.user                                                      |
|                │                                                              |
|                ▼                                                              |
|  2. uploadMiddleware.js (Multer)                                              |
|     - multer.memoryStorage()                                                  |
|     - Validates extension (.pdf,.png,.jpg,.jpeg) & MIME                       |
|     - Enforces 10MB limit -> req.file.buffer                                  |
|                │                                                              |
|                ▼                                                              |
|  3. certController.js (uploadCertificate)                                     |
|     - Validates non-empty buffer                                              |
|     - Calculates SHA-256 fileHash                                             |
|     - Saves buffer to StorageProvider (GridFS / Cloudinary / Local)           |
|     - Creates initial Certificate record (Status: PROCESSING)                 |
|     - Returns HTTP 202 Accepted immediately                                   |
|                │                                                              |
|                ▼                                                              |
|  4. CertificateProcessingPipeline.js (Asynchronous setImmediate)              |
|     ├─► Exact Duplicate Check (SHA-256 lookup in MongoDB)                    |
|     ├─► Document Buffer Fetch (CertificateStorageService)                    |
|     ├─► Text Extraction (pdf-parse / Image prep)                             |
|     ├─► AI Document Understanding (Gemini 2.5 Flash / Vision)                |
|     ├─► DocumentValidator Gatekeeper (Filters event posters / non-certs)     |
|     ├─► Semantic Duplicate Check (Certificate Number / Event Name)           |
|     ├─► Query Existing COUNTED Certs (for Category Cap tracking)             |
|     ├─► PointCalculationEngine (KTU 2019 / 2024 Rule Evaluation)             |
|     ├─► Update Certificate Record (Status: COUNTED, DUPLICATE, etc.)         |
|     └─► Save to MongoDB & Record ProcessingTelemetry                         |
+---------------------------------------┬---------------------------------------+
                                        │
                                        │ HTTP GET /api/certificates/:id (Polling)
                                        ▼
+-------------------------------------------------------------------------------+
|                            CLIENT RESULT RENDERING                            |
|                                                                               |
|  UploadDropzone.jsx receives updated Certificate record:                      |
|  - COUNTED       ──► Green Card (+Points), Confetti, Calculation Trace        |
|  - DUPLICATE     ──► Yellow Warning Card (Original date & points)             |
|  - NOT_ELIGIBLE  ──► Poster / Announcement Rejection Card (0 Points)          |
|  - INSUFFICIENT_RULE_DATA ──► Amber Card (Accepted, more info needed)        |
|  - FAILED        ──► Failure Card ("View details" & "Try another file")      |
+-------------------------------------------------------------------------------+
```

---

## 35. RELEVANT SOURCE CODE APPENDIX

### Appendix A: Frontend API & Auth Services

#### `client/src/services/api.js`
```javascript
import axios from 'axios';

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || typeof envUrl !== 'string' || !envUrl.trim()) {
    return '/api';
  }
  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true
});

api.interceptors.request.use(
  (reqConfig) => {
    const token = localStorage.getItem('token');
    if (token && !reqConfig.headers.Authorization) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && reqConfig.data instanceof FormData) {
      if (reqConfig.headers?.delete) {
        reqConfig.headers.delete('Content-Type');
      } else if (reqConfig.headers) {
        delete reqConfig.headers['Content-Type'];
      }
    }
    return reqConfig;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthPage =
        window.location.hash.includes('/auth/') ||
        window.location.pathname.includes('/auth/');
      if (!isAuthPage) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.hash = '#/auth/login';
      }
    }
    return Promise.reject(error);
  }
);
```

#### `client/src/services/certService.js`
```javascript
import { api, getApiBaseUrl } from './api';

export const certService = {
  async uploadCertificate(file, sync = false) {
    if (!file || (!(file instanceof File) && !(file instanceof Blob))) {
      throw new Error('Invalid file object. An actual File or Blob is required for upload.');
    }
    if (typeof file.size === 'number' && file.size === 0) {
      throw new Error('The selected certificate file is empty (0 bytes).');
    }

    const formData = new FormData();
    const fileName = file.name || 'certificate.pdf';
    formData.append('certificate', file, fileName);

    const res = await api.post(`/certificates?sync=${sync}`, formData);
    return res.data;
  },

  async getCertificates(params = {}) {
    const res = await api.get('/certificates', { params });
    return res.data;
  },

  async getCertificateById(id) {
    const res = await api.get(`/certificates/${id}`);
    return res.data;
  },

  async deleteCertificate(id) {
    const res = await api.delete(`/certificates/${id}`);
    return res.data;
  },

  async reprocessCertificate(id) {
    const res = await api.post(`/certificates/${id}/process`);
    return res.data;
  },

  getFileUrl(id) {
    const base = getApiBaseUrl();
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const authQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${base}/certificates/${id}/file${authQuery}`;
  }
};
```

---

### Appendix B: Backend Upload & Controller Logic

#### `server/src/middleware/uploadMiddleware.js`
```javascript
import multer from 'multer';
import path from 'path';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../config/constants.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(`Unsupported file extension "${ext}". Allowed: PDF, PNG, JPG, JPEG.`),
      false
    );
  }

  const validMimes = [
    ...ALLOWED_MIME_TYPES,
    'application/x-pdf',
    'image/pjpeg',
    'image/x-png',
    'application/octet-stream',
    'binary/octet-stream'
  ];

  if (file.mimetype && !validMimes.includes(file.mimetype.toLowerCase())) {
    return cb(
      new Error(`Unsupported MIME type "${file.mimetype}". Allowed: PDF, PNG, JPG.`),
      false
    );
  }

  cb(null, true);
};

const _multerSingle = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter
}).single('certificate');

export const uploadSingle = (req, res, next) => {
  _multerSingle(req, res, (err) => {
    if (!err) return next();
    if (err.name !== 'MulterError') {
      err.name = 'MulterError';
    }
    return next(err);
  });
};
```

#### `server/src/controllers/certController.js` (Upload Section)
```javascript
export const uploadCertificate = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'NO_FILE',
        message: 'Please attach a valid certificate file (PDF, PNG, JPG).'
      });
    }

    let { buffer, originalname, mimetype, size } = req.file;
    const userId = req.user._id;

    if (!buffer || buffer.length === 0 || size === 0) {
      return res.status(400).json({
        success: false,
        error: 'EMPTY_FILE',
        message: 'The selected certificate file is empty.'
      });
    }

    const ext = path.extname(originalname).toLowerCase();
    if (!mimetype || mimetype === 'application/octet-stream' || mimetype === 'binary/octet-stream') {
      if (ext === '.pdf') mimetype = 'application/pdf';
      else if (ext === '.png') mimetype = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimetype = 'image/jpeg';
    }

    const fileHash = calculateFileHash(buffer);

    const { storageKey } = await certificateStorage.saveCertificate({
      buffer,
      filename: originalname,
      mimeType: mimetype,
      userId: userId.toString()
    });

    const certificate = await Certificate.create({
      userId,
      originalFilename: originalname,
      storageKey,
      fileHash,
      mimeType: mimetype,
      fileSizeBytes: size,
      processingStatus: PROCESSING_STATUS.PROCESSING,
      statusReason: 'Document uploaded. Pipeline processing started.'
    });

    const isAsync = req.query.sync !== 'true';

    if (isAsync) {
      setImmediate(async () => {
        try {
          await certificatePipeline.process(certificate);
        } catch (err) {
          console.error(`Background processing error: ${err.message}`);
        }
      });

      return res.status(202).json({
        success: true,
        message: 'Certificate uploaded and queued for AI analysis.',
        certificate
      });
    } else {
      const processedCert = await certificatePipeline.process(certificate);
      const isFailed = processedCert.processingStatus === PROCESSING_STATUS.FAILED;
      return res.status(isFailed ? 422 : 201).json({
        success: !isFailed,
        message: isFailed
          ? `Certificate processing completed with issues: ${processedCert.statusReason}`
          : 'Certificate processed successfully.',
        certificate: processedCert
      });
    }
  } catch (err) {
    next(err);
  }
};
```

---

### Appendix C: Storage Service & GridFS Provider

#### `server/src/services/storage/CertificateStorageService.js`
```javascript
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { CloudStorageProvider } from './CloudStorageProvider.js';
import { GridFSStorageProvider } from './GridFSStorageProvider.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

class CertificateStorageService {
  constructor() {
    this.providerType = (config.storageProvider || 'local').trim().toLowerCase();

    if (this.providerType === 'gridfs' || this.providerType === 'mongodb' || this.providerType === 'mongo') {
      this.provider = new GridFSStorageProvider();
    } else if (
      this.providerType === 'cloud' ||
      this.providerType === 'cloudinary' ||
      this.providerType === 's3' ||
      this.providerType === 'aws'
    ) {
      this.provider = new CloudStorageProvider();
    } else {
      this.provider = new LocalStorageProvider(config.uploadDir);
    }
  }

  async saveCertificate({ buffer, filename, mimeType, userId }) {
    try {
      return await this.provider.saveFile({ buffer, filename, mimeType, userId });
    } catch (err) {
      if (!(this.provider instanceof GridFSStorageProvider)) {
        logger.warn(`Primary storage (${this.providerType}) failed: ${err.message}. Falling back to GridFS.`);
        if (!this._gridfsFallback) {
          this._gridfsFallback = new GridFSStorageProvider();
        }
        return await this._gridfsFallback.saveFile({ buffer, filename, mimeType, userId });
      }
      throw err;
    }
  }

  async getCertificate(storageKey) {
    try {
      return await this.provider.getFile(storageKey);
    } catch (err) {
      if (storageKey && /^[0-9a-fA-F]{24}$/.test(storageKey)) {
        try {
          const gridfs = new GridFSStorageProvider();
          return await gridfs.getFile(storageKey);
        } catch (_) {}
      }
      try {
        const local = new LocalStorageProvider(config.uploadDir);
        return await local.getFile(storageKey);
      } catch (_) {}
      if (this._gridfsFallback) {
        try {
          return await this._gridfsFallback.getFile(storageKey);
        } catch (_) {}
      }
      throw err;
    }
  }

  async deleteCertificate(storageKey) {
    try {
      return await this.provider.deleteFile(storageKey);
    } catch (_) {
      return true;
    }
  }

  getCertificateUrl(storageKey) {
    return this.provider.getUrl(storageKey);
  }

  getFilePath(storageKey) {
    if (typeof this.provider.getFilePath === 'function') {
      return this.provider.getFilePath(storageKey);
    }
    return null;
  }
}

export const certificateStorage = new CertificateStorageService();
```

---

## 36. DIRECT ANSWERS

1. **What frontend file performs the certificate upload?**
   [`client/src/services/certService.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/services/certService.js) (called from [`client/src/components/certificates/UploadDropzone.jsx`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/components/certificates/UploadDropzone.jsx)).
2. **What exact endpoint does it call?**
   `POST /api/certificates?sync=false` (or `?sync=true` for synchronous calls).
3. **What FormData field name is used?**
   `'certificate'` (`formData.append('certificate', file, fileName)`).
4. **What field name does backend Multer expect?**
   `'certificate'` (`multer(...).single('certificate')`).
5. **Is multipart Content-Type manually set?**
   **No.** It is deleted from the headers in [`api.js`](file:///c:/Users/tsmri/Documents/project/KTUAPM/client/src/services/api.js) so Axios and the browser generate `multipart/form-data; boundary=...`.
6. **What file MIME types are accepted on frontend?**
   `application/pdf`, `image/png`, `image/jpeg`, `image/jpg` (plus any file with extensions `.pdf`, `.png`, `.jpg`, `.jpeg`).
7. **What MIME types are accepted on backend?**
   `application/pdf`, `image/png`, `image/jpeg`, `image/jpg`, `application/x-pdf`, `image/pjpeg`, `image/x-png`, `application/octet-stream`, `binary/octet-stream` (plus blank/empty MIME if extension is valid).
8. **What happens if browser reports an empty MIME type?**
   Validation passes on frontend and backend based on file extension fallback (`.pdf`, `.png`, `.jpg`, `.jpeg`), and `certController.js` normalizes the MIME type based on the file extension.
9. **What is the maximum upload size?**
   `10 MB` (`10 * 1024 * 1024` bytes / `10485760` bytes).
10. **Can a non-empty small file display as 0.00 MB?**
    **No.** Files `< 1024 B` display in bytes (`B`), files `< 1 MB` display in kilobytes (`KB`), and only files `>= 1 MB` display in megabytes (`MB`).
11. **Can one click currently trigger more than one POST?**
    **No.** Protected by React state `processing` and mutable ref `isUploadingRef.current = true`.
12. **What exact conditions produce HTTP 400?**
    - Missing file (`req.file` missing) -> `400 NO_FILE`
    - Empty file (0 bytes) -> `400 EMPTY_FILE`
    - Unsupported file extension (not `.pdf`, `.png`, `.jpg`, `.jpeg`) -> `400 UNSUPPORTED_FILE_TYPE`
    - Unsupported MIME type -> `400 UNSUPPORTED_FILE_TYPE`
    - File size > 10 MB (`LIMIT_FILE_SIZE`) -> `400 FILE_TOO_LARGE`
    - Wrong field name (e.g. `'file'` instead of `'certificate'`) -> `400 UPLOAD_ERROR`
    - Mongoose validation error on `Certificate.create()` -> `400 ValidationError`
13. **Does upload use the authenticated Axios client?**
    **Yes.** It calls `api.post(...)` from `client/src/services/api.js`, which attaches `Authorization: Bearer <token>` and `withCredentials: true`.
14. **What CORS origins are accepted in production?**
    `https://ktuapm.onrender.com`, all `*.onrender.com` subdomains, any explicit origins configured in `FRONTEND_URL` / `ALLOWED_ORIGINS`, and private local network IP ranges.
15. **Which storage provider is currently the code default?**
    In production (`NODE_ENV === 'production'` or `RENDER === 'true'`), **`gridfs`** is the default. In development, **`local`** is the default.
16. **Is Cloudinary provider fully implemented?**
    **Yes**, in `CloudStorageProvider.js` using REST upload with SHA-1 signing and fetch.
17. **Does Cloudinary implementation handle PDFs?**
    **Yes.** PDFs are routed to `resource_type: "raw"`, while images use `resource_type: "image"`.
18. **Is Cloudinary secure_url saved?**
    **Yes**, saved into `storageKey` and `url`.
19. **What does `?sync=true` do?**
    Forces the backend to execute the entire AI & rule calculation pipeline synchronously before returning the response (returning `201` on success, `422` on processing issue). When `?sync=false` (or omitted), it returns `202 Accepted` immediately and processes in the background while the frontend polls.
20. **What happens when OCR fails?**
    `textExtractor.js` falls back to returning `{ text: '', isImageOnly: true }`, which instructs `GeminiCertificateAnalyzer` to pass the raw buffer as an image directly to Gemini multimodal vision for visual OCR.
21. **What happens when Gemini fails?**
    It retries `gemini-1.5-flash`, and if that fails, falls back to the deterministic local heuristic fact extractor `_heuristicAnalyze()`, ensuring processing completes.
22. **What happens when Cloudinary upload fails?**
    `CertificateStorageService` catches the error and automatically falls back to saving the certificate in **MongoDB GridFS**.
23. **What happens when a duplicate certificate is detected?**
    Status is set to `DUPLICATE`, points are set to `0`, reason notes the previous upload date/points, and the result is saved to the database.
24. **Is the actual file saved before OCR starts?**
    **Yes.** The file buffer is saved to `StorageProvider` (GridFS / Cloudinary / Local) and the `Certificate` record is created in MongoDB before pipeline extraction begins.
25. **Does anything depend on a local filesystem path after Cloudinary upload?**
    **No.** Cloud files are fetched by HTTPS URL buffer streaming via `CloudStorageProvider.getFile(storageKey)`.
26. **Are there any localhost URLs that can affect production?**
    **No.** Localhost URLs in CORS and API base URL resolution are strictly fallbacks for local dev when `FRONTEND_URL` or `VITE_API_URL` are not set.
27. **What frontend environment variable controls API URL?**
    `VITE_API_URL`
28. **What Render environment variables are actually required by the code?**
    - Backend: `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, `GEMINI_API_KEY` (and `STORAGE_PROVIDER=gridfs`).
    - Frontend: `VITE_API_URL`.
29. **What are the three most plausible CODE-SUPPORTED causes of "works on my devices but not others"?**
    1. **Mobile Browser File Picker Empty File / Cloud File Streaming**: Selecting a file on iOS Safari (from iCloud Photos or Files app) or Android (Google Drive) before the mobile OS downloads the file bytes returns a 0-byte File descriptor, triggering `400 EMPTY_FILE`.
    2. **Direct Apple HEIC Photo Uploads**: iOS users taking a camera photo of their certificate will produce a `.heic` file. If uploaded via a browser or third-party client that does not transcode HEIC to JPG, backend Multer rejects with `400 UNSUPPORTED_FILE_TYPE`.
    3. **Historical Synchronous Request (`POST /api/certificates?sync=true`) Socket Drops**: Previous client code sent `?sync=true`, which kept the mobile HTTP socket open for 15-20s during AI processing, causing mobile carrier proxies / NAT firewalls to reset the connection or return a 400/502/504 bad request gateway response.
30. **What additional runtime evidence would be required to conclusively identify the HTTP 400 root cause?**
    - The exact JSON response body returned with the HTTP 400 (specifically whether `error` was `NO_FILE`, `EMPTY_FILE`, `UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`, or `UPLOAD_ERROR`).
    - The client device OS (iOS vs Android vs Windows/macOS), browser version, and file format (`.pdf` vs `.heic` vs `.jpg`).
    - Server console logs from Render at the exact timestamp of the failed request.

---

## 17. PRODUCTION OCR-FIRST ARCHITECTURE & EVIDENCE VALIDATION (IMPLEMENTED)

### 17.1 Root Cause of Previous Production Misclassifications
In earlier versions, image uploads and scanned PDFs bypassed dedicated OCR extraction. The raw document buffer was passed directly to Gemini multimodal vision (`gemini-2.5-flash`), which acted simultaneously as an image reader, semantic interpreter, and categorizer.
When a non-certificate document (such as an SFI student union political campaign poster or event flyer) was uploaded:
1. Gemini recognized words related to events, dates, or youth/student activities.
2. The system lacked an affirmative **Evidence Validation Gatekeeper** establishing what the document proves before proceeding to point calculation.
3. As a result, promotional materials were mapped to workshop/activity rules and erroneously awarded activity points.

### 17.2 Core Architectural Invariant
```
NO VALID EVIDENCE = NO POINT CALCULATION
evidenceStatus !== 'VALID_EVIDENCE' => PointCalculationEngine MUST NOT RUN (points = 0)
```
The architecture strictly enforces separation of concerns:
- **OCR / PDF Parser**: Reads the document and extracts raw text.
- **Evidence Validator**: Determines what the document proves (completed activity vs. poster/flyer/ticket/notes).
- **Student Attribution**: Validates that the certificate recipient identity matches the logged-in student.
- **Gemini**: Interprets and classifies extracted facts (event name, organizer, dates, duration, level). Gemini **NEVER** decides activity points.
- **KTU Deterministic Rule Engine**: Sole authority that calculates points based on the active KTU regulation (2019 Scheme or 2024 Scheme) and enforces category/activity caps.

### 17.3 Production Pipeline Flow
```
Student Upload (JPG/PNG/PDF <= 10MB)
    ↓
File Validation & Multer Memory Storage
    ↓
SHA-256 Hash & Duplicate Detection
    ↓
Persistent Storage (GridFS / Cloudinary / Local)
    ↓
202 Accepted Response (Client polls for status)
    ↓
Text Extraction (TextExtractionService)
    ├── Text PDF: Uses embedded digital text via pdf-parse. (Zero OCR overhead)
    ├── Scanned PDF: Extracts embedded JPEG streams and executes Tesseract OCR
    └── Images (PNG/JPG): Executes Tesseract OCR directly
    ↓
Extraction Quality Assessment (usable characters, word count, alpha ratio, noise ratio)
    ↓
Technical Failure Check (TEXT_EXTRACTION_FAILED -> stops, no points)
    ↓
Evidence Validation (EvidenceValidator)
    ├── Checks affirmative completed activity declaratives ("This is to certify", "Certificate of Participation/Merit", "successfully completed")
    ├── Rejects promotional flyers, posters, and campaign materials (organization-neutral)
    ├── Rejects pre-event registrations, hall tickets, admit cards, and payment receipts
    ├── Rejects academic lecture notes, resumes, and college timetables
    ├── Rejects certificate templates and blanks ("[Participant Name Here]")
    └── Generalizes to unknown documents: documents lacking affirmative completed activity proof are rejected
    ↓
Student Identity Attribution (StudentAttribution)
    ├── Matches variations (e.g., "T S Mridul Narayanan" vs "T.S. MRIDUL NARAYANAN" vs "Mridul Narayanan")
    ├── Matches KTU Register Number (e.g., "TRV21CS045")
    └── Rejects certificates issued to a different person (CLEAR_MISMATCH -> STUDENT_MISMATCH)
    ↓
Evidence Gate:
    ├── If INVALID_EVIDENCE -> Stop. Set NOT_ELIGIBLE, points = 0. PointCalculationEngine NOT called.
    ├── If INSUFFICIENT_EVIDENCE -> Stop. Set INSUFFICIENT_EVIDENCE, points = 0. PointCalculationEngine NOT called.
    └── If VALID_EVIDENCE -> Continue to AI Structured Extraction.
    ↓
Structured Gemini Interpretation (GeminiCertificateAnalyzer)
    └── Interprets extracted text facts. Multimodal vision fallback used only if extraction source was flagged as VISION_FALLBACK.
    ↓
Deterministic KTU Rule Engine (PointCalculationEngine)
    ├── SchemeResolver selects ruleset (2019 Scheme 100/75 pts vs 2024 Scheme 120/90 pts)
    ├── Evaluates duration, level, organizer, and date constraints
    ├── Applies category caps and overall student caps
    └── Distinguishes VALID_EVIDENCE with 0 KTU points (not eligible under scheme) from INVALID_EVIDENCE
    ↓
Persistence & Audit Trace
    └── Saves final Certificate document with evidenceStatus, documentPurpose, evidenceReasonCode, and calculation trace.
```

### 17.4 OCR Engine & Dependency Selection
- **Selected Library**: `tesseract.js@^7.0.0`
- **Rationale**: Executes via WebAssembly and Node worker threads. Requires **zero native OS binaries** (unlike system `tesseract-ocr` or `pdftoppm`), ensuring 100% compatibility with Render's standard Linux container runtime without custom Dockerfiles or buildpacks.
- **Scanned PDF Handling without Native Tools**: Scanner apps (Adobe Scan, CamScanner, mobile cameras) embed scanned pages as raw DCTDecode JPEG streams (`0xFFD8FF` ... `0xFFD9`). `TextExtractionService.extractJpegsFromPdf` extracts these image buffers in pure Node.js memory and feeds them to Tesseract without writing to disk or requiring external binaries.
- **Resource Protections**: Concurrency-safe singleton worker with lazy initialization, max page limits (default: 5 pages), and 10 MB upload limits to prevent pathological OCR workloads.

### 17.5 Evidence States & Reason Codes
| State | Meaning | Point Engine Status |
| :--- | :--- | :--- |
| `VALID_EVIDENCE` | Document provides sufficient affirmative proof of completed activity attributable to the student. | **Invoked** (May award points or 0 points depending on KTU rules) |
| `INVALID_EVIDENCE` | Document is confirmed not to prove completed student activity (poster, flyer, campaign material, ticket, receipt, notes, template, other person's certificate). | **NEVER Invoked** (Points = 0) |
| `INSUFFICIENT_EVIDENCE` | Document may be a certificate, but is too blurry, cropped, incomplete, or unreadable to establish facts. | **NEVER Invoked** (Points = 0) |

Key Reason Codes:
- `VERIFIED_ACTIVITY_EVIDENCE`: Valid completed activity proof confirmed.
- `PROMOTIONAL_MATERIAL`: Event poster, workshop announcement, or flyer.
- `CAMPAIGN_MATERIAL`: Student union election or political campaign material.
- `PRE_EVENT_DOCUMENT`: Registration receipt, exam hall ticket, or seat confirmation.
- `ACADEMIC_NOTES`: Lecture notes, question bank, or curriculum syllabus.
- `CERTIFICATE_TEMPLATE`: Unfilled blank template with placeholders.
- `STUDENT_MISMATCH`: Certificate belongs to a different student.
- `NO_COMPLETED_ACTIVITY_EVIDENCE`: General fallback for novel/unknown documents lacking affirmative completed activity proof.
- `BLURRY_OR_LOW_QUALITY`: OCR output has insufficient alphanumeric characters or high noise ratio.
- `TEXT_EXTRACTION_FAILED`: Technical worker failure during OCR.

### 17.6 Student Identity Attribution
- Compares extracted participant name against logged-in student user profile.
- Tokenizes names, removes Indian honorifics (`Mr`, `Ms`, `Dr`, `Er`, `Shri`), and handles:
  - Initials expansion: `T S Mridul Narayanan` vs `T.S. MRIDUL NARAYANAN`
  - Name permutations: `Mridul Narayanan T S` vs `T S Mridul Narayanan`
  - Register number fallback: Verifies presence of student's KTU register number (e.g., `TRV21CS045`).
- Rejects clear mismatches (e.g., certificate awarded to "Ananya Sharma" when user is "Mridul Narayanan") with `STUDENT_MISMATCH` and 0 points.

### 17.7 Frontend UI Enhancements
Updated `client/src/components/certificates/UploadDropzone.jsx` to differentiate outcomes without implying non-existent faculty review workflows:
- **`INVALID_EVIDENCE`**: "This document does not prove a completed student activity (detected as an event poster, flyer, registration receipt, or non-certificate document). Points default to 0."
- **`INSUFFICIENT_EVIDENCE`**: "We couldn't confirm that this upload proves completed participation or achievement. Please upload a clearer or more complete certificate."
- **`VALID_EVIDENCE` with 0 Points**: "Your document was verified as authentic evidence, but this activity does not qualify for points under the applicable KTU regulations."
- **`TEXT_EXTRACTION_FAILED`**: "Unable to read this file. Please ensure the document is clear and legible, or upload a PDF/JPEG/PNG copy."

### 17.8 Verification & Test Metrics
- **Backend Test Suite**: Passed **115 tests across 39 suites** (0 failures).
  - Included all 86 original regression tests.
  - Added 29 comprehensive new tests in `server/tests/evidenceAndOcrPipeline.test.js` covering parts X1 through X9 (embedded vs OCR PDF extraction, image OCR, OCR crash isolation, valid certificates, promotional posters, campaign materials, pre-event tickets, academic notes, unknown document generalization, certificate templates, student attribution variations and mismatches, and pipeline boundary invariants).
- **Frontend Production Build**: `npm.cmd --prefix client run build` built successfully in 6.29s (2309 modules transformed, zero lint or bundling errors).

---

## 18. PRODUCTION HARDENING: CERTIFICATE PIPELINE, RULE ENGINE ISOLATION, NPTEL/MOOC & UX REDESIGN

### 18.1 Root Causes Identified and Fixed

#### 1. Real Root Causes of the 2019 NPTEL/MOOC 0-Points Bug
- **Cross-Scheme Rule Leakage**: `PointCalculationEngine.js` previously executed a global check: *"Participation points cannot be combined with winning points for the same event under KTU 2024 regulations (General Rule 1)"*. This rule is exclusive to the **KTU 2024 Scheme Handbook** and never applied to KTU 2019 (where competitive winning points were explicitly additive to participation, and MOOCs are non-competitive academic completions).
- **Fabricated Event Placeholders**: `GeminiCertificateAnalyzer._heuristicAnalyze` previously generated synthetic fallback values like `eventName: subcategory + ' Event'` (which produced `"MOOC Event"`). When any second MOOC was uploaded or re-processed, this generic name matched the prior submission, triggering the 2024 winning vs. participation check!
- **Destructive Base Point Zeroing**: When an activity-specific cap (such as the 50-point cap on 2019 MOOCs) was reached, `PointCalculationEngine.js` previously assigned `basePoints = remainingRuleCapacity` (setting `basePoints = 0`). This destroyed the intrinsic value representation and calculation trace.

#### 2. Root Cause of Promotional Poster Receiving Points
- Previous pipeline relied too heavily on LLM structured extraction, which hallucinated category classifications on non-evidence documents containing words like "workshop" or "hackathon". Fixed with the strict, multi-stage **Evidence-First Document Validation** boundary (`DocumentValidator` and `EvidenceValidator`).

#### 3. Root Cause of Developer Internals in Student UI
- The certificate detail page and calculation trace modal directly exposed internal variables (`matchedRuleId`, `currentCategoryPoints`, `postCalculationCategoryTotal`, `confidenceScore`, SHA-256 hashes, and raw status enums like `NOT_ELIGIBLE`).

---

### 18.2 Architectural Boundary & Scheme Isolation

```
Uploaded File (PDF / Image)
      │
      ▼
Text Extraction Service (TextExtractionService.js)
  ├── Text PDF: Embedded text extracted via pdf-parse
  ├── Scanned PDF: Rendered page image fallback with Tesseract.js OCR
  └── Image (JPG/PNG): Direct Tesseract.js OCR
      │
      ▼
Evidence Validation (EvidenceValidator.js)
  ├── Checks: Positive completed student activity proof
  ├── Rejects: Promotional posters, campaign flyers, tickets, receipts, notes
  ├── Attributions: Verifies participant matches logged-in student (StudentAttribution.js)
  └── Boundary: If not VALID_EVIDENCE, PointCalculationEngine is NEVER invoked!
      │
      ▼
Structured Fact Understanding (GeminiCertificateAnalyzer.js)
  ├── Primary Ground Truth: Normalized OCR/PDF text
  ├── Strict Anti-Hallucination: Returns null for missing fields (NO "MOOC Event", NO "KTU Student")
  └── Certificate Number Validation: Rejects stop words ("is", "of", "the", "a", "no")
      │
      ▼
Deterministic KTU Scheme Rule Engine (RuleEngine.js)
  ├── 2019 Scheme (`rules/2019/2019-v1.json`): Isolated 6 segments; MOOC Rule `2019-PRO-MOOC-01`
  ├── 2024 Scheme (`rules/2024/2024-v1.json`): Isolated Groups I, II, III; Skilling Rule `2024-G3-3.17`
  └── General Rule 1 (Participation vs Winning): Strictly isolated to 2024 competitive events
      │
      ▼
Cap & Duplicate Constraints Engine (PointCalculationEngine.js)
  ├── Preserves Base Points: basePoints = intrinsic value (e.g. 50 pts)
  ├── Activity Cap Adjustment: Dedicated adjustment recorded (e.g. ruleCapAdjustment = -50 pts)
  └── Duplicate vs Cap Distinction: Exact duplicate vs valid activity with exhausted cap
      │
      ▼
Student UI & Explainability (CertificateDetail.jsx & CalculationTraceModal.jsx)
  ├── Plain-English "Why did I get these points?" (What we found, KTU Rule, Base Points, Adjustment, Final Points)
  ├── Human-readable labels (no developer variables)
  └── Progressive Disclosure: SHA-256 hash and engine IDs hidden in audit accordion
```

---

### 18.3 KTU 2019 MOOC vs. KTU 2024 Skilling Semantics

| Dimension | KTU 2019 MOOC (`2019-PRO-MOOC-01`) | KTU 2024 Skilling Certificate (`2024-G3-3.17`) |
| :--- | :--- | :--- |
| **Category** | Professional Self Initiatives (Segment 4) | Group III: Leadership, Management & Professional Initiatives |
| **Authoritative Rule Source** | KTU 2019 Activity Points Regulation, Sl. No. 11 | KTU 2024 Activity Handbook, Group III, Subactivity 3.17 |
| **Course Requirements** | MOOC with final assessment certificate | Approved course (SWAYAM, NPTEL, Spoken Tutorial, K-DISC) |
| **Scoring Type** | Fixed points: **50 points** | Rate per hour: **1 point per course hour** |
| **Activity Maximum** | **50 points** (Programme/Lifetime cap) | **40 points** (Category cap for Subactivity 3.17) |
| **Scope of Cap** | Across programme (authoritative source does NOT specify annual limitation) | Across degree programme |
| **First Submission** | `basePoints: 50, adjustment: 0, finalPoints: 50, status: 'COUNTED'` | Calculated based on course hours up to 40 max points |
| **Subsequent Submission (Cap Reached)** | `basePoints: 50, ruleCapAdjustment: -50, finalPoints: 0, status: 'COUNTED'` | `basePoints: hours, ruleCapAdjustment: -(hours - remaining), finalPoints: remaining` |
| **Duplicate Submission** | `status: 'DUPLICATE', finalPoints: 0` (Identified via SHA-256/cert number) | `status: 'DUPLICATE', finalPoints: 0` |

---

### 18.4 Truthful Zero-Point Reason Integrity

| Scenario | Processing Status | Evidence Status | Reason Displayed to Student |
| :--- | :--- | :--- | :--- |
| **Exact Duplicate** | `DUPLICATE` | `VALID_EVIDENCE` | *"This certificate has already been submitted and counted previously."* |
| **2019 MOOC Cap Reached** | `COUNTED` | `VALID_EVIDENCE` | *"Certificate accepted. This NPTEL/MOOC certificate is eligible under KTU 2019 rules (50 base points), but you have already reached the maximum MOOC points allowed by this rule (50 points). 0 additional points added."* |
| **Category Allowance Reached** | `COUNTED` | `VALID_EVIDENCE` | *"Certificate accepted. This activity is eligible under KTU rules, but the maximum point limit for this category has already been reached. 0 additional points added."* |
| **Activity Not Eligible Under Scheme** | `NOT_ELIGIBLE` | `VALID_EVIDENCE` | *"Zero points awarded: activity is not eligible for points under the applicable KTU regulations."* |
| **Promotional Poster / Flyer** | `NOT_ELIGIBLE` | `INVALID_EVIDENCE` | *"This document does not prove a completed student activity (detected as an event poster, flyer, or promotional material). Points default to 0."* |
| **Participant Identity Mismatch** | `NOT_ELIGIBLE` | `INVALID_EVIDENCE` | *"Certificate was issued to a different person and cannot be credited to your account."* |
| **Blurry / Low Quality Document** | `INSUFFICIENT_EVIDENCE`| `INSUFFICIENT_EVIDENCE` | *"We couldn't confirm that this upload proves completed participation or achievement. Please upload a clearer or more complete certificate."* |
| **Pre-Programme Activity** | `NOT_ELIGIBLE` | `VALID_EVIDENCE` | *"Activities completed before joining the programme are not eligible for KTU activity points."* |

---

### 18.5 Redesigned Student UX & Progressive Disclosure
- **Human-Readable Labels**: Replaced raw variables with `Activity category`, `Activity type`, `Course / Event`, `Issued by`, `Achievement`, `Duration`, `Certificate date`, `Participant`, `Certificate number`, `Points awarded`, `Reason`.
- **Friendly Status Badges**:
  - `COUNTED` / `VALID_EVIDENCE` $\to$ **Certificate Accepted**
  - `NOT_ELIGIBLE` $\to$ **No Points Awarded**
  - `INVALID_EVIDENCE` $\to$ **Invalid Document**
  - `INSUFFICIENT_EVIDENCE` $\to$ **Unconfirmed Document**
  - `DUPLICATE` $\to$ **Already Counted**
  - `PROCESSING` $\to$ **Checking Certificate**
- **Plain-English Explainer Card ("Why did I get these points?")**:
  1. *What we found*: Document course title, duration, organizer, achievement.
  2. *Applicable KTU Rule*: Rule description & KTU scheme.
  3. *Points for this activity*: Standard base points (e.g. `50 points`).
  4. *Adjustment*: Highlighted banner displayed **ONLY** if an adjustment was actually applied.
  5. *Final Result*: Large bold summary (e.g. `+50 pts` or `0 points added`).
- **Collapsible Audit Details**: SHA-256 hash, matchedRuleId, and internal engine step traces are collapsed inside `<details>` to prevent cognitive overload while maintaining complete audit transparency.

---

### 18.6 Complete Test & Build Verification
- **Total Backend Tests**: **135 passed across 46 suites** (0 failures, 100% passing).
  - Executed via: `npm.cmd --prefix server test`
  - Baseline: 115 passing tests across 39 suites.
  - New Test Suite: `server/tests/nptelAndMoocRules.test.js` added 20 rigorous tests covering 2019 MOOC, 2024 Skilling, cap adjustments, cross-scheme isolation, competitive winning deltas, non-evidence rejection, OCR flow, and reason integrity.
- **Frontend Production Build**: `npm.cmd --prefix client run build` succeeded in **11.39s** with 2309 modules transformed, 0 errors.

---

## 19. REAL-WORLD CERTIFICATE CLASSIFICATION, EVENT LEVEL ANTI-HALLUCINATION, EVIDENCE GENERALIZATION, LOGOUT HARDENING & STUDENT STATUS UX

### 19.1 Strict Architectural Separation of Concerns
The pipeline enforces rigid separation between distinct diagnostic questions, ensuring that an issue in one stage never silently mutates or corrupts another:

```text
1. Can we read the document?
   ├── YES: Extracted OCR / PDF text
   └── NO: TEXT_EXTRACTION_FAILED

2. Does the document genuinely provide evidence of completed participation/achievement?
   ├── Multi-signal semantic evaluation (Header + Recipient + Participation phrase + Activity)
   ├── YES: VALID_EVIDENCE
   └── NO: INVALID_EVIDENCE or INSUFFICIENT_EVIDENCE (e.g. promotional poster, admit card)

3. What activity actually occurred?
   ├── Semantic taxonomy (Tech Quiz, Technical Competition, Workshop, Conference, etc.)
   └── Exact names preserved (e.g., "Luminis Quiz", "Formula Bharat 2026", "IoT Workshop")

4. What was the competition / activity level?
   ├── Explicit competition scope ONLY (e.g., "National-level competition")
   └── Anti-hallucination: Never infer level from occasions ("National Space Day"), orgs ("NSS", "NIT"), or hosts

5. Which KTU scheme/rule applies?
   ├── Deterministic rule specificity (e.g., IEEE Quiz -> Sl. 10 Professional Societies; Fest Quiz -> Sl. 8 Tech Fest)
   └── Valid evidence with no matching point rule -> NOT_ELIGIBLE (0 points, clear scheme explanation)

6. How many points does that rule award?
   ├── Missing level required for points -> INSUFFICIENT_RULE_DATA (0 points, Certificate Accepted, prompt student)
   └── Eligible rule -> basePoints evaluated

7. Do any caps/duplicate constraints reduce those points?
   ├── Duplicate -> DUPLICATE (0 points)
   └── Category/Activity Cap -> ruleCapAdjustment recorded
```

---

### 19.2 Real-World Failure Cases & Architectural Root Causes

#### Case 1: Quiz Misclassified as Conference & Hallucinated National Level
- **Observed Behavior**: Certificate for `'Luminis' Quiz` hosted at GCE Kannur as part of `'Luminis-24' National Space Day` celebrations was classified as `Conference`, `Presentation`, `National` level, awarding 20 points.
- **Root Causes**:
  1. *Subcategory bleeding*: Incidental presence of substrings or IEEE affiliations triggered generic Conference classification.
  2. *Achievement hallucination*: Regex matched `presented to` as evidence of a paper presentation instead of a certificate presentation.
  3. *Level hallucination*: The word `"National"` inside the occasion name `"National Space Day celebrations"` was erroneously parsed as `eventLevel = National`.
  4. *Rule misapplication*: 2019 Sl. 11 (Conference at IITs/NITs) was selected because subcategory became Conference.
- **Resolution**:
  - Semantic classification recognizes Quizzes as `Tech Quiz` under `Professional Self-Initiatives`.
  - Anti-hallucination filter actively strips occasion tokens (`National Space Day`, `National Science Day`, `World Environment Day`, `National Service Scheme`, `National Institute of Technology`, `State Bank of India`) and host college mentions prior to level detection.
  - Quizzes without competition scope remain `level = null`, correctly triggering `INSUFFICIENT_RULE_DATA` under 2019 Scheme without demoting evidence validity.

#### Case 2: Clear IEEE Workshop Not Classified / 0 Points Eligibility
- **Observed Behavior**: IoT Workshop certificate organized by `IEEE SIGHT GCEK` was rejected or unclassified.
- **Root Cause**: The pipeline collapsed valid evidence with point eligibility. Under KTU 2019 Regulation Sl. No. 11, workshops/conferences are only eligible for points if conducted at **IITs/NITs**. Because GCE Kannur is not an IIT/NIT, previous logic failed classification or labeled the document invalid.
- **Resolution**:
  - The document is affirmatively validated as `VALID_EVIDENCE`.
  - Analyzer accurately extracts `activityType = WORKSHOP`, `achievement = PARTICIPATION`, `eventName = 'IoT Workshop'`, `organizer = 'IEEE SIGHT GCEK'`.
  - `PointCalculationEngine` evaluates the scheme rule: 0 points awarded with transparent explanation: *"Under KTU 2019 Scheme (Sl. No. 11), workshops and short-term training programs are eligible for activity points only when conducted at IITs/NITs. 0 points added."*

#### Case 3: Valid Participation Text Rejected by Validator
- **Observed Behavior**: Certificate stating *"This certificate is being presented to <participant> for their participation in the Formula Bharat 2026 competition"* was rejected as lacking affirmative evidence.
- **Root Cause**: `EvidenceValidator.js` relied on rigid regexes requiring phrases like `"This is to certify that"`.
- **Resolution**:
  - Implemented multi-signal evidence evaluation combining certificate headers, recipient markers (`"presented to"`, `"awarded to"`), affirmative participation verbs (`"for their participation in"`, `"for participating in"`), and event entities.
  - Preserved exact event name: `Formula Bharat 2026`.

#### Case 4: Explicit Workshop Participation Rejected & Parent Fest Scope
- **Observed Behavior**: Certificate stating *"PROUDLY PRESENTED TO ... FOR PARTICIPATING IN THE WORKSHOP: 3D PRINTING AND DESIGNING ORGANIZED AS PART OF NATIONAL-LEVEL MULTI-FEST XPLORE'24"* was rejected as a promotional poster and misattributed event level.
- **Root Causes**:
  1. The word `"PROUDLY PRESENTED TO"` matched poster regexes.
  2. The parent multi-fest's `"NATIONAL-LEVEL"` scope was at risk of being inherited by subactivities.
- **Resolution**:
  - Poster detection refined: `"presented to"` and `"proudly presented to"` are recognized as affirmative recipient awards.
  - Subactivities do not inherit parent multi-fest scope. Workshop subactivity level evaluates to `null` unless explicit competition scope for that subactivity is documented.

---

### 19.3 Missing Rule Input vs Invalid Evidence (`INSUFFICIENT_RULE_DATA`)
When a document genuinely proves participation but lacks a parameter needed for point calculation (e.g., event level for a technical competition):
- `evidenceStatus` remains `VALID_EVIDENCE`.
- `ruleEvaluationStatus` is set to `INSUFFICIENT_RULE_DATA`.
- `processingStatus` is set to `INSUFFICIENT_RULE_DATA`.
- `finalPoints = 0`.
- User-facing message: *"Certificate accepted. We identified the activity, but couldn't determine the event level required to calculate KTU points."*

---

### 19.4 Deterministic Rule Precedence: Tech Quiz vs Professional Societies
When a certificate involves a competition or quiz:
- **Organizer is a Professional Society** (IEEE, IET, ASME, SAE, CSI, ISTE, ACM):
  - Matches **Sl. No. 10** (`2019-PRO-SOCIETY-01`: Competitions Conducted by Professional Societies).
- **Organizer is a General College or Fest**:
  - Matches **Sl. No. 8** (`2019-PRO-TECHFEST-01`: Tech Fest, Tech Quiz).

---

### 19.5 Authentication & Logout Hardening
- **Root Cause of Logout Failure**:
  1. Cookie teardown in `authController.logout` set the cookie value to `'none'` with `expires: Date.now() + 5000` without specifying `path: '/'`. When cookie path or security attributes mismatched the login configuration, browsers retained the valid authentication cookie.
  2. Frontend `AuthContext.jsx` waited for the network logout request before clearing local state; if the backend was sluggish, local storage and auth headers remained active.
- **Fix Applied**:
  - `authController.js`: Standardized cookie options on `sendTokenResponse` and `logout` with `path: '/'`, `httpOnly: true`, `sameSite: isProduction ? 'none' : 'lax'`, `secure: isProduction`.
  - Added explicit expired cookie deletion (`res.clearCookie('token', cookieOptions)` and fallback `res.cookie('token', '', { ...cookieOptions, expires: new Date(0) })`).
  - Single-session logout: Does **NOT** increment `user.tokenVersion`, preventing accidental multi-device invalidation.
  - `AuthContext.jsx`: Immediately purges `localStorage.removeItem('token')`, `localStorage.removeItem('user')`, `setUser(null)`, `setProfile(null)` so `ProtectedRoute` redirects immediately, then invokes `authService.logout()`.
  - `api.js`: Interceptor explicitly removes `Authorization` header when token is absent.

---

### 19.6 Student-Facing Status & Filter UX Overhaul
- **Removed Misleading Statuses**: Completely removed `"Pending Review"` and `"Low Confidence"` from the student UI.
- **Student-Facing Filters on Certificates Page**:
  - `All`
  - `Accepted` (`COUNTED`, `VERIFIED`)
  - `Processing` (`PROCESSING`)
  - `Needs Better Document` (`INSUFFICIENT_EVIDENCE`, `INSUFFICIENT_RULE_DATA`, `NEEDS_REVIEW`, `LOW_CONFIDENCE`)
  - `Not Counted` (`NOT_ELIGIBLE`)
  - `Duplicate` (`DUPLICATE`)
  - `Failed` (`FAILED`)
- **Five Distinct Result Banners in Certificate Detail**:
  1. **Accepted + Points Added**: Green banner, "+X points added to your profile".
  2. **Accepted + 0 Points (Scheme Ineligible)**: Slate banner, "0 points added. This activity does not meet the requirements of an eligible activity under your KTU scheme."
  3. **Accepted + Missing Information (`INSUFFICIENT_RULE_DATA`)**: Amber banner, "Certificate accepted. We identified the activity, but couldn't determine the event level required to calculate KTU points."
  4. **Invalid Document (`INVALID_EVIDENCE`)**: Rose banner, "This document does not provide evidence of completed participation or achievement."
  5. **Unconfirmed / Low Quality (`INSUFFICIENT_EVIDENCE`)**: Amber banner, "We couldn't read enough information from this document. Please upload a clearer copy."

---

### 19.7 Test Suite & Build Verification
- **Total Backend Tests**: **155 passed across 54 suites** (0 failures, 100% passing).
  - Executed via: `npm.cmd --prefix server test`
  - Added new regression suite `server/tests/realWorldClassificationAndLogout.test.js` with 20 tests covering:
    - Luminis Quiz classification as Tech Quiz (never Conference/Presentation)
    - Anti-hallucination on occasion tokens (National Space Day, National Science Day, NSS, NIT, World Environment Day, State Bank)
    - IEEE SIGHT GCEK Workshop extraction & 0-point scheme explanation
    - Formula Bharat non-standard wording validation
    - 3D Printing workshop acceptance & parent fest scope isolation
    - Deterministic rule precedence between Tech Fest and Professional Societies
    - Cookie teardown & authentication clearing on logout
- **Frontend Production Build**: `npm.cmd --prefix client run build` succeeded in **16.96s** with 2309 modules transformed, 0 errors.

## 20. STUDENT-ONLY WORKFLOW TERMINOLOGY AUDIT & FINAL UX HARDENING

### 20.1 Root Cause: Why "Review Manually" Remained in Upload Dropzone
While the previous hardening pass updated `Certificates.jsx`, `Badge.jsx`, and `CertificateDetail.jsx`, `UploadDropzone.jsx` had not been updated for `INSUFFICIENT_RULE_DATA`.
Specifically:
- In `UploadDropzone.jsx`, `isInsufficientRuleData` was unhandled and fell through into `isFailed`.
- The `isFailed` card rendered a red destructive box with the heading *"We couldn't process this certificate"*, displaying the backend's status reason (*"Certificate accepted. We identified the activity, but couldn't determine the event level required to calculate KTU points."*) and providing a button labeled `<Link>Review manually</Link>`.
- This created a glaring contradiction: claiming the certificate could not be processed while simultaneously stating it was accepted, and offering a non-existent manual review action.

### 20.2 Complete Removal of False Workflow Copy & Buttons
Every student-facing occurrence of manual/faculty review terminology was audited and eliminated:
1. **Upload Result Panels (`UploadDropzone.jsx`)**:
   - Replaced `Review manually` button with `<Link to={'/certificates/' + result._id}>View details</Link>`.
   - Replaced `Review details` button with `View details`.
   - Replaced `Review rule details` button with `View details`.
   - Replaced `Please review this certificate` header with `Needs a clearer document`.
   - Removed `"check the information looks correct before submitting"`.
   - Added dedicated amber card for `isInsufficientRuleData` titled: **"Certificate accepted — more information needed"** with actions `View certificate` and `Try another file`.
   - Updated processing step 5 from `"Done!"` to `"Result ready"`.
2. **Filter & Empty States (`CertTable.jsx` & `Certificates.jsx`)**:
   - Added filter-tailored empty states for `COUNTED`, `PROCESSING`, `INSUFFICIENT_EVIDENCE`, `NOT_ELIGIBLE`, `DUPLICATE`, `FAILED`, and search queries.
   - When a filter has no matching records, it explains the specific state (e.g. *"No certificates need a better document"*, *"No duplicate certificates"*) with a `"Clear filters"` action rather than a generic *"No certificates yet"*.
3. **Analytics & Dashboard Views**:
   - `SchemeAnalyticsView.jsx`: Replaced `{ name: 'Needs Review' }` with `{ name: 'Needs Better Document' }`, and changed chart description to *"Breakdown of accepted, uncounted, and unconfirmed certificates"*.
   - `Analytics.jsx`: Replaced KPI label `'Verified'` with `'Accepted'`.
   - `Dashboard.jsx`: Replaced `'verified'` count with `'accepted'`.
   - `CertificateDetail.jsx`: Replaced fallback `'Verified under official KTU rules'` with `'Accepted under official KTU rules'`, and updated collapsible header to `Technical Processing Details & Audit Log`.
   - `Evaluation.jsx`: Replaced table header `Manual Baseline (Student / Admin Audit)` with `Traditional Manual Audit (Self-Calculation)`.
   - `certController.js`: Replaced `Manual re-processing initiated.` with `Re-check initiated.`.

### 20.3 Four Canonical Student-Facing Outcome States
| Outcome | Technical States | Banner Theme | Title Displayed | Subtitle / Points | User Actions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Success** | `COUNTED` / `VALID_EVIDENCE` | Success (Green) | `+X Activity Points!` | Points awarded & saved | `Upload another`, `View details` |
| **B. Zero Points Eligible** | `VALID_EVIDENCE` + `NOT_ELIGIBLE` | Neutral (Slate) | `Certificate accepted — 0 points added` | `Awarded: 0 Points` | `View details`, `Upload another certificate` |
| **C. Missing Rule Data** | `VALID_EVIDENCE` + `INSUFFICIENT_RULE_DATA` | Warning (Amber) | `Certificate accepted — more information needed` | `Awarded: 0 Points for Now (Needs Event Level)` | `View certificate`, `Try another file` |
| **D. Invalid / Unreadable** | `INVALID_EVIDENCE` or `INSUFFICIENT_EVIDENCE` | Danger (Rose) / Amber | `This document does not provide activity evidence` / `We couldn't confirm this document` | `Awarded: 0 Points` | `Upload a valid certificate` / `Upload clearer certificate` |

### 20.4 Static & Runtime Regression Verification
- Created `server/tests/studentOnlyWorkflowAudit.test.js`:
  - Scans all `.jsx` and `.js` source files in `client/src` to assert 0 occurrences of forbidden review strings (`Review manually`, `Pending Review`, `Faculty Review`, `Manual Review`, `Awaiting Approval`, etc.).
  - Asserts `INSUFFICIENT_RULE_DATA` preserves `VALID_EVIDENCE` and produces informative status reason with 0 points.
  - Asserts `AnalyticsEngine` counts `INSUFFICIENT_RULE_DATA` under `insufficientEvidence`.
- **Full Test Suite**: **158 tests passed across 57 suites** (0 failures, 100% passing).
- **Client Build**: Succeeded in **6.95s** with 2309 modules transformed, 0 errors.

---

*Report Generated and Verified against the KTUAPM Repository Codebase.*



