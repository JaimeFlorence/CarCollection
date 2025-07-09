# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Frontend (Next.js)
```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Run production server
npm run start

# Lint code
npm run lint

# Type checking
npx tsc --noEmit

# Run tests
npx jest
# or watch mode
npx jest --watch
```

### Backend (FastAPI)
```bash
cd ../backend

# Setup virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Initialize database
python init_db.py

# Create admin user (username: admin, password: admin123)
python create_admin.py

# Create test user (username: jaime, password: testing1)
cd ../car-collection-prototype
python create_user_sqlite.py

# Run development server (http://localhost:8000)
uvicorn app.main:app --reload

# Run tests
pytest -v

# Data management
python data_manager.py export    # Export to CSV
python data_manager.py import    # Import from CSV
python data_manager.py validate  # Validate CSV files
```

## Architecture Overview

### Full-Stack Application Structure
This is a car collection management system with separate frontend and backend:

- **Frontend**: Next.js 15 app in `/car-collection-prototype/`
- **Backend**: FastAPI server in `/backend/`
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT-based with multi-tenancy support

### Key Architectural Patterns

1. **Multi-Tenancy Implementation**
   - Database-level isolation using `user_id` foreign keys
   - All queries automatically filtered by authenticated user
   - Located in: `backend/app/crud.py`, `backend/app/main.py`

2. **Authentication Flow**
   - JWT tokens stored in localStorage (frontend)
   - AuthContext manages auth state: `src/contexts/AuthContext.tsx`
   - Protected routes: `src/components/ProtectedRoute.tsx`
   - Backend auth: `backend/app/auth.py`

3. **API Client Pattern**
   - Centralized API service: `src/lib/api.ts`
   - Automatic token injection for authenticated requests
   - Base URL: `http://localhost:8000`

4. **Component Architecture**
   - Shadcn UI components in `src/components/ui/`
   - Feature components organized by function
   - Tailwind CSS v4 for styling

### Database Schema

Three main models with user isolation:

1. **User**: Authentication and profile data
2. **Car**: Vehicle information (user_id for multi-tenancy)
3. **ToDo**: Maintenance tasks linked to cars (user_id for multi-tenancy)

Models defined in: `backend/app/models.py`
Schemas in: `backend/app/schemas.py`

### Testing Approach

- **Frontend**: Jest with React Testing Library
- **Backend**: Pytest with test files in `backend/app/tests/`
- Test authentication separately with `backend/test_auth.py`

### Important Notes

1. Always run both frontend and backend servers for full functionality
2. Backend must be running on port 8000 before starting frontend
3. Use the data_manager.py script for database backup/restore
4. Admin users created via create_admin.py script
5. Path alias `@/` maps to `./src/` in frontend code



## Recent Enhancements (January 9, 2025)

1. **Real Service History Tracking**
   - Progress bars now calculate from actual service dates
   - "Mark Done" creates proper service history entries
   - See `ServiceIntervalList.tsx` for implementation

2. **Engine Type Selection**
   - Diesel vs gas selection for compatible vehicles
   - See `EngineTypeDialog.tsx` and `service_research.py`
   - Ford Super Duty trucks get diesel-specific intervals

3. **Enhanced Research API**
   - Real manufacturer data for 15+ brands
   - Confidence scoring and source tracking
   - Default intervals for unknown vehicles




   Project Awareness & Context

- **Always read `PLANNING.md`** at the start of a new conversation to understand the project's architecture, goals, style, and constraints.

- **Check `TASK.md`** before starting a new task. If the task isn’t listed, add it with a brief description and today's date.

- **Use consistent naming conventions, file structure, and architecture patterns** as described in `PLANNING.md`.



Code Structure & Modularity

- **Never create a file longer than 500 lines of code.** If a file approaches this limit, refactor by splitting it into modules or helper files.

- **Organize code into clearly separated modules**, grouped by feature or responsibility.

- **Use clear, consistent imports** (prefer relative imports within packages).


Testing & Reliability

- **Always create Pytest unit tests for new features** (functions, classes, routes, etc).

- **After updating any logic**, check whether existing unit tests need to be updated. If so, do it.

- **Tests should live in a `/tests` folder** mirroring the main app structure.

  - Include at least:

    - 1 test for expected use

    - 1 edge case

    - 1 failure case



Task Completion

- **Mark completed tasks in `TASK.md`** immediately after finishing them.

- Add new sub-tasks or TODOs discovered during development to `TASK.md` under a “Discovered During Work” section.




Style & Conventions

- **Use Python** as the primary language.

- **Follow PEP8**, use type hints, and format with `black`.

- **Use `pydantic` for data validation**.

- Use `FastAPI` for APIs and `SQLAlchemy` or `SQLModel` for ORM if applicable.

- Write **docstrings for every function** using the Google style:

  ```python

  def example():

      """

      Brief summary.


      Args:

          param1 (type): Description.


      Returns:

          type: Description.

      """

  ```


Documentation & Explainability

- **Update `README.md`** when new features are added, dependencies change, or setup steps are modified.

- **Comment non-obvious code** and ensure everything is understandable to a mid-level developer.

- When writing complex logic, **add an inline `# Reason:` comment** explaining the why, not just the what.



AI Behavior Rules

- **Never assume missing context. Ask questions if uncertain.**

- **Never hallucinate libraries or functions** – only use known, verified Python packages.

- **Always confirm file paths and module names** exist before referencing them in code or tests.

- **Never delete or overwrite existing code** unless explicitly instructed to or if part of a task from `TASK.md`.