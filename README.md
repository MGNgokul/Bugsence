# BugSense

BugSense is a full-stack bug management starter project aligned to your product spec.

## Implemented Scaffold

### Backend (`backend/`)
- Node.js + Express + MongoDB (Mongoose)
- JWT authentication with roles (`Admin`, `Developer`, `Tester`)
- Bug CRUD with status workflow:
  - `Open -> In Progress -> Testing -> Resolved -> Closed`
- Assignment system (`assignedTo`, `assignedBy`, `deadline`)
- Comments system
- Activity timeline logging
- Rule-based bug categorization
- AI bug fix suggestions with OpenAI integration and rule-based fallback
- Analytics summary API
- API error logging middleware

### Frontend (`frontend/`)
- React + Vite app
- Login flow
- Dashboard with charts (Recharts)
- Bug list with filters/search
- Bug report form
- Bug detail page with AI suggestion, status update, comments
- Dark/Light mode toggle

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`

### Bugs
- `POST /api/bugs`
- `GET /api/bugs`
- `GET /api/bugs/:id`
- `PUT /api/bugs/:id`
- `DELETE /api/bugs/:id`
- `PUT /api/bugs/:id/assign`
- `POST /api/bugs/:id/comments`

### Analytics
- `GET /api/analytics/summary`

## Run Locally

1. Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in frontend env if backend is not on `http://localhost:5000`.

## GitHub Pages

The repository includes a GitHub Pages workflow for the frontend.

- Push to `main` and GitHub Actions will build `frontend/` and publish it to Pages.
- The Pages URL will be `https://mgngokul.github.io/Bugsence/`.
- For API calls to work on the live site, add a repository secret named `VITE_API_BASE_URL` that points to your deployed backend URL.
- GitHub Pages only hosts the frontend. The Express/MongoDB backend must be deployed separately on a service such as Render, Railway, or a VPS.

### AI Suggestions

BugSense can generate AI bug-fix suggestions through the OpenAI Responses API.

- Set `OPENAI_API_KEY` in `backend/.env` to enable live AI suggestions.
- Optional: change `OPENAI_MODEL` if you want to use a different compatible OpenAI model.
- Optional: change `OPENAI_BASE_URL` only if you are routing requests through a compatible proxy or gateway.
- If no API key is configured, or the provider request fails, BugSense falls back to the built-in local suggestion engine.
- `GET /api/health` now reports whether the OpenAI provider is configured.

## Folder Structure

```txt
frontend/
  src/components
  src/pages
  src/context
  src/services
  src/hooks
  src/utils
  src/layouts
  src/styles

backend/
  server/controllers
  server/models
  server/routes
  server/middleware
  server/utils
  server/config
  server/server.js
```

## Next Expansion Options
- PostgreSQL/Prisma variant
- Real AI integration (OpenAI/Gemini) in `backend/server/utils/aiSuggestions.js`
- File uploads to Cloudinary
- Notification delivery via email/websocket
- Developer productivity score endpoints
- Automated monitoring ingestion (Sentry-style events)
