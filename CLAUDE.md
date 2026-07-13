# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**KIP** (Kwacha Intelligence Platform) is an AI-powered business idea generation platform for Zambian entrepreneurs. The tech stack consists of:
- **Frontend**: React 18 with Vite, Tailwind CSS, and React Router
- **Backend**: FastAPI (Python) with SQLAlchemy ORM, SQLite/PostgreSQL
- **AI Integration**: Anthropic Claude API for intelligent business idea generation and chat
- **Additional Services**: Stripe/Flutterwave for payments, ChromaDB for vector embeddings (RAG), news/RSS integration

## Development Setup & Commands

### Prerequisites
- Python 3.10+ (add to PATH)
- Node.js LTS
- Environment file: `backend/.env` with `ANTHROPIC_API_KEY` and `SECRET_KEY`

### Getting Started (Windows)
```bash
# Run setup (one-time, installs dependencies)
setup.ps1          # PowerShell recommended
# OR: setup.bat    # Alternative

# Start development servers
start.ps1          # PowerShell recommended
# OR: start.bat    # Alternative

# Starts:
#   - Frontend at http://localhost:3000
#   - Backend API at http://localhost:8000
#   - FastAPI docs at http://localhost:8000/docs
```

### Frontend Development
```bash
cd frontend

# Development server (hot reload)
npm run dev         # Runs on port 3000

# Build production bundle
npm build

# Preview production build locally
npm run preview
```

### Backend Development
```bash
cd backend

# Run development server (auto-reload on code changes)
uvicorn main:app --reload

# Run with specific port
uvicorn main:app --reload --port 8000 --host 0.0.0.0
```

### Testing & Validation
Currently no test suites configured. Consider adding:
- Backend: pytest for API endpoint tests
- Frontend: Vitest/Jest for component tests

## Architecture & Key Patterns

### Backend Architecture (FastAPI + SQLAlchemy)

**Structure:**
```
backend/app/
  ├── models/           # SQLAlchemy ORM models (User, Conversation, BusinessIdea, etc.)
  ├── routes/           # API endpoint routers (auth, chat, ideas, etc.)
  ├── services/         # Business logic (kip_engine, knowledge_base, ML models)
  ├── schemas.py        # Pydantic request/response schemas
  ├── database.py       # SQLAlchemy session management
  ├── security.py       # JWT auth, password hashing (bcrypt)
  └── main.py           # FastAPI app initialization, CORS, router registration
```

**Key Patterns:**

1. **Authentication**: JWT-based with HTTPBearer scheme
   - Token created in `security.py:create_access_token()` (7-day expiry)
   - `get_current_user()` dependency validates token and returns User
   - Protected routes use: `current_user: User = Depends(get_current_user)`

2. **Database**: SQLAlchemy ORM with dependency injection
   - `get_db()` in `database.py` provides session via FastAPI Depends
   - All routes receive `db: Session = Depends(get_db)`
   - Database URL configurable via `DATABASE_URL` env var (defaults to SQLite)

3. **Route Organization**: Each domain gets its own router
   - Registered in `main.py` with prefix (e.g., `/api/auth`, `/api/chat`)
   - Example: `app.include_router(auth.router, prefix="/api/auth")`

4. **Business Logic Layers**:
   - `kip_engine.py`: Core K-BIG-1 engine for idea generation
   - `knowledge_base.py`: RAG with ChromaDB for context retrieval
   - `kip_prompt.py`: Prompt templates for Claude API
   - `ml_engine.py`: Scoring and ML utilities
   - `news_service.py`: RSS/news aggregation

### Frontend Architecture (React + Vite)

**Structure:**
```
frontend/src/
  ├── pages/           # Page components (DashboardPage, ChatPage, etc.)
  ├── components/      # Reusable UI components (Layout, Navigation, etc.)
  ├── hooks/           # Custom hooks (useAuth, useTheme, useLanguage)
  ├── lib/             # Utilities (api.js with axios interceptors)
  ├── context/         # React Context (TranslationContext)
  ├── i18n/            # Internationalization strings
  └── App.jsx          # Main router and context setup
```

**Key Patterns:**

1. **Routing**: React Router v6 with Protected routes
   - Public routes: `/`, `/login`, `/register`, `/legal/*`
   - Protected: All other routes redirect to `/login` if no token
   - Token stored in `localStorage['kip_token']`

2. **Authentication**:
   - `AuthProvider` (useAuth.jsx) manages global auth state
   - `login(token, userData)` stores token and user in localStorage/state
   - API interceptor in `lib/api.js` auto-attaches token to requests

3. **API Communication**:
   - All requests go through axios instance in `lib/api.js`
   - Base URL: `/api` (proxied to backend via Vite)
   - Interceptors:
     - Request: Attach JWT token and language header
     - Response: Auto-redirect to login on 401 (token expired)

4. **Context Providers** (App.jsx):
   - `ThemeProvider`: Dark/light mode state
   - `TranslationProvider`: i18n state
   - `AuthProvider`: Auth state
   - Wrapped in order shown

### Data Flow Examples

**Chat Flow:**
1. Frontend: User types message in ChatPage → calls `/api/chat` POST
2. Backend: `chat.router` receives message → calls `kip_engine.py` for Claude response
3. Backend: Saves conversation to DB via SQLAlchemy models
4. Frontend: Receives response, updates UI

**Business Idea Generation:**
1. Frontend: Form submission on IdeasPage → POST to `/api/ideas`
2. Backend: `ideas.router` calls `knowledge_base.py` for RAG
3. Backend: ChromaDB retrieves similar ideas + context from vector store
4. Backend: Passes context to Claude via `kip_prompt.py`
5. Backend: Saves BusinessIdea to DB, returns to frontend

### Key Environment Variables

**Backend (.env):**
- `ANTHROPIC_API_KEY`: Required for Claude API calls
- `SECRET_KEY`: JWT signing key (required, must be secure in production)
- `DATABASE_URL`: SQLAlchemy connection string (defaults to `sqlite:///./kip.db`)
- `FRONTEND_URL`: CORS allowed origin (defaults to localhost:3000, 5173)

**Frontend (vite.config.js):**
- `VITE_API_URL`: API base URL (defaults to `/api`, proxied via Vite)

## API Endpoints Overview

FastAPI Swagger docs at `/docs` lists all endpoints. Key groups:

- `/api/auth/*`: Register, login, get current user
- `/api/chat/*`: Message creation, conversation retrieval
- `/api/ideas/*`: Business idea CRUD, feedback
- `/api/dashboard/*`: User stats and analytics
- `/api/news/*`: News aggregation, briefings
- `/api/templates/*`: Business templates
- `/api/learn/*`: Educational content
- `/api/bizsim/*`: Business simulation engine
- `/api/business/*`: Business dashboard and custom business tracking
- `/api/enterprise/*`: Enterprise features
- `/api/capital/*`: Capital access resources
- `/api/stripe/*` & `/api/flutterwave/*`: Payment integrations

## Common Development Tasks

### Adding a New API Endpoint

1. Create/update model in `backend/app/models/` (SQLAlchemy)
2. Create/update schema in `backend/app/schemas.py` (Pydantic)
3. Create/update router in `backend/app/routes/your_domain.py`
4. Register router in `backend/main.py`: `app.include_router(...)`
5. Access via protected endpoint: `current_user: User = Depends(get_current_user)`

### Adding a New Frontend Page

1. Create component in `frontend/src/pages/YourPage.jsx`
2. Add route in `frontend/src/App.jsx` (wrap with `<Protected>` if needed)
3. Call backend via `api.get/post/etc()` from `frontend/src/lib/api.js`
4. Use `useAuth()` hook for user data
5. Use `useTheme()` hook for dark mode
6. Use Tailwind CSS for styling

### Debugging Auth Issues

- Check token in browser DevTools → Application → localStorage → `kip_token`
- Verify token not expired: decode at jwt.io
- Check CORS settings in `main.py` (FRONTEND_URLS list)
- Verify `SECRET_KEY` in `.env` matches token signature

### Working with ChromaDB & RAG

- Vector store for knowledge base in `knowledge_base.py`
- Embeds text using `sentence-transformers`
- Retrieves similar content for context before Claude API call
- Useful for business templates, ideas, news context

## Technology Notes

- **Tailwind CSS**: Used for all frontend styling. Custom config in `frontend/tailwind.config.js`
- **React Router v6**: Supports lazy loading and nested routes if needed
- **SQLAlchemy 2.0**: ORM for database, uses modern async patterns (though sync for now)
- **FastAPI**: Auto-generates OpenAPI/Swagger docs at `/docs`
- **JWT with 7-day expiry**: Adjust `ACCESS_TOKEN_EXPIRE_HOURS` in `security.py` if needed
- **SQLite default**: Safe for development; switch to PostgreSQL via `DATABASE_URL` env var for production

## Git Status Notes

Currently tracking multiple backup/experimental files (marked with `-b4-*`, `-stripe`, `-authloop` suffixes). These are old branches kept in the working tree. Consider cleaning up if they cause confusion.
