KTU Activity Points AI Platform
An AI-assisted activity-point tracking platform for KTU students. The application helps students upload activity evidence, understand how their documents were interpreted, and track points under their applicable scheme.
 
 
 
 
 
Live application: https://ktuapm.onrender.com/
Project scope: This repository is the student-only application. It does not provide faculty or administrator accounts, human certificate approval, or an official university verification service. Automatically calculated points are estimates based on the configured rules and the evidence available to the application; official KTU regulations remain authoritative.

Overview
KTU activity-point rules vary by admission scheme and student entry type. Manually matching documents to the appropriate categories, limits, and requirements can be difficult for students. This platform brings uploads, document interpretation, point calculation, and progress tracking into one interface.
The system separates AI-assisted document understanding from rule-based point calculation. The AI extracts relevant facts from a document; it is not the authority that decides point values.
Features
- Student registration, login, and academic-profile management.
- Scheme-aware activity-point requirement tracking.
- PDF and image evidence submission.
- Gemini-assisted extraction of document details, such as activity title, organizer, dates, award, and duration when supported by the uploaded evidence.
- Evidence screening before activity classification and point calculation.
- Rule-based calculation with an explanation of the resulting points and applicable limits.
- Duplicate-upload checks and student dashboard analytics.
- Responsive interface for desktop and mobile use.
Evidence handling
A document mentioning an event is not, by itself, proof that the student completed or participated in that event. For example, a workshop poster must not earn workshop points merely because it contains the word workshop.
Evidence state	Meaning	Point calculation
VALID_EVIDENCE	Sufficient evidence of an eligible completed/performed activity attributable to the student.	May proceed to scheme and activity rules.
INVALID_EVIDENCE	Document does not constitute acceptable activity evidence, such as an advertisement, poster, or unrelated file.	Not invoked; 0 points.
INSUFFICIENT_EVIDENCE	The available material does not support a reliable decision.	Not invoked; 0 points.


The interface should explain these outcomes in plain language rather than exposing implementation terms to students. This project has no human-review queue, so an insufficient-evidence result must not be presented as “awaiting approval.”
Technology
Area	Technology
Frontend	React, Vite, dashboard charts
API	Node.js, Express
Document understanding	Google Gemini API
Business rules	Server-side, scheme-aware rule engine
Database	MongoDB Atlas with Mongoose
File storage	Configurable storage provider, subject to deployment configuration
Hosting	Render frontend and backend services


Processing flow
Student uploads a document
          |
          v
File and document validation
          |
          v
AI-assisted fact extraction
          |
          v
Evidence decision
    |           |
    |           +-- INVALID / INSUFFICIENT --> Explanation; 0 points
    v
VALID_EVIDENCE
          |
          v
KTU scheme and activity-rule evaluation
          |
          v
Calculated points + understandable explanation
          |
          v
Student dashboard
The server, not the language model, determines points using the configured KTU rules. Students should consult the applicable official regulation for authoritative requirements and exemptions.
Getting started
Prerequisites
- Node.js 18 or later
- npm
- A MongoDB instance or Atlas connection
- A Gemini API key
Install
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
npm run install:all
The installation command reflects the documented project scripts. If your checkout uses separate package files instead, install dependencies in server/ and client/ individually.
Configure local environment
Create the backend environment file from the repository's example file (where available). Never commit real credentials.
# server/.env (example values only)
NODE_ENV=development
PORT=5000
MONGODB_URI=<YOUR_MONGODB_CONNECTION_STRING>
JWT_SECRET=<YOUR_RANDOM_DEVELOPMENT_SECRET>
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
GEMINI_MODEL=gemini-2.5-flash
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
The frontend's public API URL may be set in its own environment file:
# client/.env (example)
VITE_API_URL=http://localhost:5000
Only non-secret configuration belongs in VITE_* variables because Vite includes those values in the browser bundle. Do not put database credentials, JWT signing secrets, or AI-provider keys in frontend environment variables.
Run
npm run dev
The documented development defaults are frontend http://localhost:5173 and backend http://localhost:5000. Check the repository's package scripts if these differ in your checkout.
Tests and evaluation
npm test
npm run evaluate
Use the repository's current test and evaluation scripts to reproduce results. Benchmark numbers are deliberately not presented here without a reproducible report, dataset description, test conditions, and the distinction between live AI calls and mocked/local execution. Evaluation should include invalid-document false positives, scheme-rule accuracy, latency, and cross-browser behavior, not just category classification accuracy.
Deployment
The documented deployment uses two Render services:
1. Frontend: a static site built from client/, using npm run build and publishing dist/. Configure an SPA rewrite to /index.html where needed.
2. Backend: a web service built from server/ and started using the server package's production start script.
Set deployment values in Render's private environment-variable settings, not in source control. Typical backend variable names include NODE_ENV, FRONTEND_URL, MONGODB_URI, JWT_SECRET, GEMINI_API_KEY, GEMINI_MODEL, and STORAGE_PROVIDER. Configure provider-specific storage variables only for the provider actually enabled.
Set VITE_API_URL on the frontend to the public HTTPS URL of the deployed API, then rebuild the static site. A local localhost address must not be used in the production build.
Storage: Render web-service local files should not be treated as durable upload storage. Select a persistent provider and confirm its permissions, quotas, backups, and retention requirements before inviting real users.
Privacy and security
- Keep AI keys, JWT signing secrets, database credentials, and storage credentials on the backend.
- Keep credentials and uploaded student documents out of the Git repository and public test fixtures.
- Restrict uploads by allowed type and size, and enforce authorization on private document access.
- Do not pass authentication tokens in URLs or query parameters. Use an appropriate authenticated request or short-lived, narrowly scoped document-access mechanism.
- Avoid logging raw student documents, extracted personal information, passwords, tokens, or secrets.
- Validate the deployment's CORS, cookie/session settings, dependency updates, and access controls independently. Documentation alone is not a security audit.
Project status and limitations
This is a student-focused academic project, not an official KTU portal. AI extraction can be incorrect, and a prediction is not proof of participation. Documents that are invalid or lack sufficient evidence must not receive points. Official regulations and university decisions take precedence over application estimates.
License
MIT, as indicated in the project documentation. Include the corresponding LICENSE file in the repository before publishing under this license.
