# KTU Activity Points - API Specification

All protected endpoints require either an `Authorization: Bearer <jwt>` header or a secure HTTP-only session cookie.

## Authentication Endpoints

### `POST /api/auth/register`
- **Body**: `{ name, email, password, registerNumber, program, branch, admissionYear, entryType }`
- **Response**: `{ success: true, token, user: { _id, name, email }, profile }`

### `POST /api/auth/login`
- **Body**: `{ email, password }`
- **Response**: `{ success: true, token, user, profile }`

### `POST /api/auth/logout`
- **Response**: `{ success: true, message }`

### `GET /api/auth/me`
- **Response**: `{ success: true, user, profile }`

---

## Student & Profile Endpoints

### `GET /api/student/profile`
- **Response**: `{ success: true, profile }`

### `PUT /api/student/profile`
- **Body**: `{ branch, program, admissionYear, entryType }`
- **Response**: `{ success: true, profile }` (Re-resolves scheme and rules server-side)

### `GET /api/student/dashboard`
- **Response**: `{ success: true, profile, analytics, recentCertificates }`

---

## Certificate Endpoints

### `POST /api/certificates`
- **Form Data**: `certificate` (PDF / PNG / JPG file)
- **Query**: `?sync=true` (optional synchronous mode, default is async)
- **Response (202 / 201)**: `{ success: true, certificate }`

### `GET /api/certificates`
- **Query**: `?category=&status=&search=&sortBy=uploadedAt&sortOrder=desc`
- **Response**: `{ success: true, count, certificates: [] }`

### `GET /api/certificates/:id`
- **Response**: `{ success: true, certificate }` (Includes full 5-step `calculationTrace`)

### `DELETE /api/certificates/:id`
- **Response**: `{ success: true, message: "Certificate removed successfully." }`

### `POST /api/certificates/:id/process`
- **Response**: `{ success: true, message, certificate }`

### `GET /api/certificates/:id/file`
- Streams original PDF / PNG document file with ownership validation.

---

## Analytics Endpoints

### `GET /api/analytics/overview`
- **Response**: `{ success: true, scheme, entryType, ruleVersion, overview }`

### `GET /api/analytics/categories`
- **Response**: `{ success: true, categoryStats: [] }`

### `GET /api/analytics/timeline`
- **Response**: `{ success: true, timeline: { monthlyTrend, semesterTrend, cumulativeGrowth } }`

### `GET /api/analytics/opportunities`
- **Response**: `{ success: true, opportunities: { remainingPoints, categoryOpportunities, suggestedActivities } }`

### `GET /api/analytics/telemetry`
- **Response**: `{ success: true, metrics: { totalProcessed, automationRate, latencies, stageBreakdown } }`

---

## Evaluation Benchmark Endpoints

### `GET /api/evaluation/latest`
- **Response**: `{ success: true, report }`

### `POST /api/evaluation/run`
- **Body**: `{ count: 520 }`
- **Response**: `{ success: true, report }`
