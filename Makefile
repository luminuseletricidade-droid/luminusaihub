# =============================================================================
# Luminus AI Hub - Makefile
# =============================================================================
# Comprehensive build and development automation
#
# Usage: make <target>
# Run `make help` for available commands
# =============================================================================

.PHONY: help install setup clean dev front back supabase db migrate test lint build deploy logs

# Use bash for better compatibility
SHELL := /bin/bash

# =============================================================================
# CONFIGURABLE PORTS - Change these values to use different ports
# =============================================================================
FRONTEND_PORT ?= 3000
BACKEND_PORT ?= 8001

# Colors for terminal output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m
BOLD := \033[1m

# =============================================================================
# HELP - Display available commands
# =============================================================================

help:
	@echo ""
	@echo "$(BOLD)$(CYAN)╔═══════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(BOLD)$(CYAN)║          LUMINUS AI HUB - Development Commands                        ║$(RESET)"
	@echo "$(BOLD)$(CYAN)╚═══════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(BOLD)$(GREEN)🚀 Quick Start:$(RESET)"
	@echo "  $(CYAN)make setup$(RESET)           Complete project setup (install all dependencies)"
	@echo "  $(CYAN)make dev$(RESET)             Run frontend + backend in parallel"
	@echo ""
	@echo "$(BOLD)$(GREEN)📦 Installation:$(RESET)"
	@echo "  $(CYAN)make install$(RESET)         Install all dependencies (npm + pip)"
	@echo "  $(CYAN)make install-front$(RESET)   Install frontend dependencies (npm)"
	@echo "  $(CYAN)make install-back$(RESET)    Install backend dependencies (pip + venv)"
	@echo "  $(CYAN)make venv$(RESET)            Create Python virtual environment"
	@echo ""
	@echo "$(BOLD)$(GREEN)🖥️  Development Servers:$(RESET)"
	@echo "  $(CYAN)make front$(RESET)           Run frontend dev server (Vite) - port $(FRONTEND_PORT)"
	@echo "  $(CYAN)make back$(RESET)            Run backend server (FastAPI) - port $(BACKEND_PORT)"
	@echo "  $(CYAN)make dev$(RESET)             Run both frontend and backend"
	@echo ""
	@echo "$(BOLD)$(GREEN)🗄️  Database & Migrations:$(RESET)"
	@echo "  $(CYAN)make migrate$(RESET)         Apply pending migrations to database"
	@echo "  $(CYAN)make migrate-status$(RESET)  Check migration status"
	@echo "  $(CYAN)make migrate-create$(RESET)  Create a new migration file"
	@echo "  $(CYAN)make db-reset$(RESET)        Reset local database (⚠️  destructive)"
	@echo ""
	@echo "$(BOLD)$(GREEN)☁️  Supabase:$(RESET)"
	@echo "  $(CYAN)make supabase$(RESET)        Start Supabase local development"
	@echo "  $(CYAN)make supabase-stop$(RESET)   Stop Supabase local services"
	@echo "  $(CYAN)make supabase-status$(RESET) Check Supabase services status"
	@echo "  $(CYAN)make supabase-db-push$(RESET) Push migrations to remote Supabase"
	@echo "  $(CYAN)make supabase-db-pull$(RESET) Pull remote schema to local"
	@echo "  $(CYAN)make supabase-gen-types$(RESET) Generate TypeScript types from schema"
	@echo "  $(CYAN)make edge-deploy$(RESET)     Deploy Edge Functions to Supabase"
	@echo ""
	@echo "$(BOLD)$(GREEN)🧪 Testing & Quality:$(RESET)"
	@echo "  $(CYAN)make test$(RESET)            Run all tests"
	@echo "  $(CYAN)make test-front$(RESET)      Run frontend tests (Vitest)"
	@echo "  $(CYAN)make test-back$(RESET)       Run backend tests"
	@echo "  $(CYAN)make lint$(RESET)            Run linters (ESLint)"
	@echo "  $(CYAN)make typecheck$(RESET)       Run TypeScript type checking"
	@echo ""
	@echo "$(BOLD)$(GREEN)🏗️  Build & Deploy:$(RESET)"
	@echo "  $(CYAN)make build$(RESET)           Build frontend for production"
	@echo "  $(CYAN)make build-clean$(RESET)     Clean build and rebuild"
	@echo "  $(CYAN)make preview$(RESET)         Preview production build locally"
	@echo "  $(CYAN)make docker-build$(RESET)    Build backend Docker image"
	@echo "  $(CYAN)make docker-run$(RESET)      Run backend in Docker container"
	@echo ""
	@echo "$(BOLD)$(GREEN)📋 Logs & Monitoring:$(RESET)"
	@echo "  $(CYAN)make logs-back$(RESET)       Tail backend logs"
	@echo "  $(CYAN)make logs-supabase$(RESET)   Tail Supabase logs"
	@echo ""
	@echo "$(BOLD)$(GREEN)🧹 Cleanup:$(RESET)"
	@echo "  $(CYAN)make clean$(RESET)           Remove build artifacts"
	@echo "  $(CYAN)make clean-all$(RESET)       Remove all generated files (node_modules, venv, dist)"
	@echo ""
	@echo "$(BOLD)$(YELLOW)💡 Tips:$(RESET)"
	@echo "  - Run $(CYAN)make setup$(RESET) first time to configure everything"
	@echo "  - Use $(CYAN)make dev$(RESET) for daily development"
	@echo "  - Backend requires $(CYAN).env$(RESET) file in backend/ directory"
	@echo ""

# =============================================================================
# INSTALLATION
# =============================================================================

## Create Python virtual environment
venv:
	@echo "$(CYAN)🐍 Creating Python virtual environment...$(RESET)"
	@cd "$(CURDIR)/backend" && python3 -m venv venv
	@echo "$(GREEN)✅ Virtual environment created at backend/venv$(RESET)"

## Install frontend dependencies
install-front:
	@echo "$(CYAN)📦 Installing frontend dependencies...$(RESET)"
	@npm install
	@echo "$(GREEN)✅ Frontend dependencies installed$(RESET)"

## Install backend dependencies
install-back: venv
	@echo "$(CYAN)📦 Installing backend dependencies...$(RESET)"
	@"$(CURDIR)/backend/venv/bin/pip" install --upgrade pip
	@"$(CURDIR)/backend/venv/bin/pip" install -r "$(CURDIR)/backend/requirements.txt"
	@echo "$(GREEN)✅ Backend dependencies installed$(RESET)"

## Install all dependencies
install: install-front install-back
	@echo "$(GREEN)✅ All dependencies installed$(RESET)"

## Complete project setup
setup: install
	@echo "$(CYAN)🔧 Running project setup...$(RESET)"
	@echo ""
	@echo "$(YELLOW)📋 Checklist:$(RESET)"
	@echo "  1. $(GREEN)✅$(RESET) Frontend dependencies installed"
	@echo "  2. $(GREEN)✅$(RESET) Backend virtual environment created"
	@echo "  3. $(GREEN)✅$(RESET) Backend dependencies installed"
	@echo ""
	@if [ ! -f "$(CURDIR)/backend/.env" ]; then \
		echo "  4. $(YELLOW)⚠️  Backend .env file not found$(RESET)"; \
		echo "     $(CYAN)→ Copy backend/.env.example to backend/.env$(RESET)"; \
		echo "     $(CYAN)→ Then configure your environment variables$(RESET)"; \
	else \
		echo "  4. $(GREEN)✅$(RESET) Backend .env file exists"; \
	fi
	@if [ ! -f "$(CURDIR)/.env" ]; then \
		echo "  5. $(YELLOW)⚠️  Root .env file not found$(RESET)"; \
		echo "     $(CYAN)→ Copy .env.example to .env$(RESET)"; \
	else \
		echo "  5. $(GREEN)✅$(RESET) Root .env file exists"; \
	fi
	@echo ""
	@echo "$(GREEN)🎉 Setup complete! Run 'make dev' to start development$(RESET)"

# =============================================================================
# DEVELOPMENT SERVERS
# =============================================================================

## Run frontend development server
front:
	@echo "$(CYAN)🌐 Starting frontend development server...$(RESET)"
	@echo "$(YELLOW)→ http://localhost:$(FRONTEND_PORT)$(RESET)"
	@npm run dev -- --port $(FRONTEND_PORT)

## Run backend development server
back:
	@echo "$(CYAN)🔧 Starting backend server...$(RESET)"
	@echo "$(YELLOW)→ http://localhost:$(BACKEND_PORT)$(RESET)"
	@echo "$(YELLOW)→ API Docs: http://localhost:$(BACKEND_PORT)/docs$(RESET)"
	@cd "$(CURDIR)/backend" && "$(CURDIR)/backend/venv/bin/uvicorn" main:app --host 0.0.0.0 --port $(BACKEND_PORT) --reload

## Run frontend and backend in parallel
dev:
	@echo "$(CYAN)🚀 Starting development environment...$(RESET)"
	@echo ""
	@echo "$(YELLOW)Starting servers:$(RESET)"
	@echo "  → Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo "  → Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "  → API Docs: http://localhost:$(BACKEND_PORT)/docs"
	@echo ""
	@echo "$(YELLOW)Press Ctrl+C to stop all servers$(RESET)"
	@echo ""
	@trap 'kill 0' SIGINT; \
		(cd "$(CURDIR)/backend" && "$(CURDIR)/backend/venv/bin/uvicorn" main:app --host 0.0.0.0 --port $(BACKEND_PORT) --reload) & \
		npm run dev -- --port $(FRONTEND_PORT) & \
		wait

## Run frontend and backend with tmux (if available)
dev-tmux:
	@if command -v tmux &> /dev/null; then \
		tmux new-session -d -s luminus 'make front' \; \
			split-window -h 'make back' \; \
			attach; \
	else \
		echo "$(YELLOW)tmux not found, using parallel processes...$(RESET)"; \
		make dev; \
	fi

# =============================================================================
# DATABASE & MIGRATIONS
# =============================================================================

## Apply pending migrations
migrate:
	@echo "$(CYAN)📊 Applying database migrations...$(RESET)"
	@cd "$(CURDIR)/backend" && "$(CURDIR)/backend/venv/bin/python" migrate.py migrate
	@echo "$(GREEN)✅ Migrations applied$(RESET)"

## Check migration status
migrate-status:
	@echo "$(CYAN)📊 Checking migration status...$(RESET)"
	@cd "$(CURDIR)/backend" && "$(CURDIR)/backend/venv/bin/python" migrate.py status

## Create new migration file
migrate-create:
	@if [ -z "$(NAME)" ]; then \
		echo "$(RED)❌ Please provide migration name: make migrate-create NAME=your_migration_name$(RESET)"; \
		exit 1; \
	fi
	@echo "$(CYAN)📝 Creating new migration: $(NAME)$(RESET)"
	@cd "$(CURDIR)/backend" && "$(CURDIR)/backend/venv/bin/python" create_migration.py $(NAME)
	@echo "$(GREEN)✅ Migration file created$(RESET)"

## Rollback last migration
migrate-rollback:
	@echo "$(YELLOW)⚠️  Rolling back last migration...$(RESET)"
	@cd "$(CURDIR)/backend" && "$(CURDIR)/backend/venv/bin/python" migrate.py rollback
	@echo "$(GREEN)✅ Migration rolled back$(RESET)"

## Reset database (⚠️ destructive)
db-reset:
	@echo "$(RED)⚠️  WARNING: This will reset the database!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "$(YELLOW)Resetting database...$(RESET)"
	@npx supabase db reset
	@echo "$(GREEN)✅ Database reset complete$(RESET)"

# =============================================================================
# SUPABASE
# =============================================================================

## Start Supabase local development
supabase:
	@echo "$(CYAN)☁️  Starting Supabase local development...$(RESET)"
	@npx supabase start
	@echo "$(GREEN)✅ Supabase started$(RESET)"

## Stop Supabase local services
supabase-stop:
	@echo "$(CYAN)☁️  Stopping Supabase...$(RESET)"
	@npx supabase stop
	@echo "$(GREEN)✅ Supabase stopped$(RESET)"

## Check Supabase status
supabase-status:
	@echo "$(CYAN)☁️  Supabase status:$(RESET)"
	@npx supabase status

## Push migrations to remote Supabase
supabase-db-push:
	@echo "$(CYAN)☁️  Pushing migrations to Supabase...$(RESET)"
	@npx supabase db push
	@echo "$(GREEN)✅ Migrations pushed$(RESET)"

## Pull remote schema
supabase-db-pull:
	@echo "$(CYAN)☁️  Pulling remote schema...$(RESET)"
	@npx supabase db pull
	@echo "$(GREEN)✅ Schema pulled$(RESET)"

## Generate TypeScript types from schema
supabase-gen-types:
	@echo "$(CYAN)📝 Generating TypeScript types...$(RESET)"
	@npx supabase gen types typescript --local > src/integrations/supabase/types.ts
	@echo "$(GREEN)✅ Types generated at src/integrations/supabase/types.ts$(RESET)"

## Deploy Edge Functions
edge-deploy:
	@echo "$(CYAN)🚀 Deploying Edge Functions...$(RESET)"
	@./deploy_edge_functions.sh
	@echo "$(GREEN)✅ Edge Functions deployed$(RESET)"

## Link to Supabase project
supabase-link:
	@echo "$(CYAN)🔗 Linking to Supabase project...$(RESET)"
	@npx supabase link --project-ref asdvxynilrurillrhsyj

# =============================================================================
# TESTING & QUALITY
# =============================================================================

## Run all tests
test: test-front test-back
	@echo "$(GREEN)✅ All tests completed$(RESET)"

## Run frontend tests
test-front:
	@echo "$(CYAN)🧪 Running frontend tests...$(RESET)"
	@npm run test:run

## Run frontend tests with UI
test-front-ui:
	@echo "$(CYAN)🧪 Running frontend tests with UI...$(RESET)"
	@npm run test:ui

## Run backend tests
test-back:
	@echo "$(CYAN)🧪 Running backend tests...$(RESET)"
	@cd "$(CURDIR)/backend" && "$(CURDIR)/backend/venv/bin/python" scripts/testing/test_system.py

## Run ESLint
lint:
	@echo "$(CYAN)🔍 Running linter...$(RESET)"
	@npm run lint

## Run TypeScript type checking
typecheck:
	@echo "$(CYAN)📝 Running type check...$(RESET)"
	@npx tsc --noEmit

## Run all quality checks
quality: lint typecheck test
	@echo "$(GREEN)✅ All quality checks passed$(RESET)"

# =============================================================================
# BUILD & DEPLOY
# =============================================================================

## Build frontend for production
build:
	@echo "$(CYAN)🏗️  Building frontend for production...$(RESET)"
	@npm run build
	@echo "$(GREEN)✅ Build complete: dist/$(RESET)"

## Clean and rebuild
build-clean:
	@echo "$(CYAN)🧹 Cleaning previous build...$(RESET)"
	@rm -rf dist
	@npm run build
	@echo "$(GREEN)✅ Clean build complete: dist/$(RESET)"

## Preview production build
preview:
	@echo "$(CYAN)👀 Previewing production build...$(RESET)"
	@echo "$(YELLOW)→ http://localhost:3000$(RESET)"
	@npm run preview

## Build backend Docker image
docker-build:
	@echo "$(CYAN)🐳 Building Docker image...$(RESET)"
	@cd "$(CURDIR)/backend" && docker build -t luminus-backend .
	@echo "$(GREEN)✅ Docker image built: luminus-backend$(RESET)"

## Run backend in Docker
docker-run:
	@echo "$(CYAN)🐳 Running backend in Docker...$(RESET)"
	@docker run -p $(BACKEND_PORT):$(BACKEND_PORT) --env-file "$(CURDIR)/backend/.env" luminus-backend

## Build and push Docker image
docker-push:
	@echo "$(CYAN)🐳 Building and pushing Docker image...$(RESET)"
	@cd "$(CURDIR)/backend" && docker build -t luminus-backend . && docker push luminus-backend

# =============================================================================
# LOGS & MONITORING
# =============================================================================

## Tail backend logs
logs-back:
	@echo "$(CYAN)📋 Backend logs:$(RESET)"
	@tail -f "$(CURDIR)/backend/backend.log" 2>/dev/null || echo "$(YELLOW)No log file found$(RESET)"

## Tail Supabase logs
logs-supabase:
	@echo "$(CYAN)📋 Supabase logs:$(RESET)"
	@npx supabase logs

## Watch backend logs (continuous)
logs-watch:
	@echo "$(CYAN)📋 Watching backend logs...$(RESET)"
	@tail -f "$(CURDIR)/backend/backend.log"

# =============================================================================
# CLEANUP
# =============================================================================

## Remove build artifacts
clean:
	@echo "$(CYAN)🧹 Cleaning build artifacts...$(RESET)"
	@rm -rf dist
	@rm -rf "$(CURDIR)/backend/__pycache__"
	@find "$(CURDIR)" -name "*.pyc" -delete 2>/dev/null || true
	@find "$(CURDIR)" -name ".DS_Store" -delete 2>/dev/null || true
	@echo "$(GREEN)✅ Clean complete$(RESET)"

## Remove all generated files (node_modules, venv, dist)
clean-all: clean
	@echo "$(YELLOW)⚠️  This will remove node_modules and venv$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "$(CYAN)🧹 Removing all generated files...$(RESET)"
	@rm -rf node_modules
	@rm -rf "$(CURDIR)/backend/venv"
	@echo "$(GREEN)✅ Full clean complete$(RESET)"

# =============================================================================
# UTILITIES
# =============================================================================

## Open project in VS Code
code:
	@code "$(CURDIR)"

## Open API docs in browser
docs:
	@echo "$(CYAN)📖 Opening API docs...$(RESET)"
	@open http://localhost:$(BACKEND_PORT)/docs 2>/dev/null || xdg-open http://localhost:$(BACKEND_PORT)/docs 2>/dev/null || echo "$(YELLOW)Please open http://localhost:$(BACKEND_PORT)/docs in your browser$(RESET)"

## Check system requirements
check:
	@echo "$(CYAN)🔍 Checking system requirements...$(RESET)"
	@echo ""
	@echo "$(BOLD)Node.js:$(RESET)"
	@node --version 2>/dev/null || echo "$(RED)❌ Node.js not found$(RESET)"
	@echo ""
	@echo "$(BOLD)npm:$(RESET)"
	@npm --version 2>/dev/null || echo "$(RED)❌ npm not found$(RESET)"
	@echo ""
	@echo "$(BOLD)Python:$(RESET)"
	@python3 --version 2>/dev/null || echo "$(RED)❌ Python3 not found$(RESET)"
	@echo ""
	@echo "$(BOLD)Docker:$(RESET)"
	@docker --version 2>/dev/null || echo "$(YELLOW)⚠️  Docker not found (optional)$(RESET)"
	@echo ""
	@echo "$(BOLD)Supabase CLI:$(RESET)"
	@npx supabase --version 2>/dev/null || echo "$(YELLOW)⚠️  Supabase CLI not found (will use npx)$(RESET)"
	@echo ""

## Show project info
info:
	@echo ""
	@echo "$(BOLD)$(CYAN)Luminus AI Hub$(RESET)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "$(BOLD)Project ID:$(RESET) asdvxynilrurillrhsyj"
	@echo "$(BOLD)Frontend:$(RESET)   Vite + React + TypeScript + Tailwind"
	@echo "$(BOLD)Backend:$(RESET)    FastAPI + Python 3.11"
	@echo "$(BOLD)Database:$(RESET)   Supabase (PostgreSQL)"
	@echo ""
	@echo "$(BOLD)Ports:$(RESET)"
	@echo "  Frontend: $(FRONTEND_PORT)"
	@echo "  Backend:  $(BACKEND_PORT)"
	@echo ""

## Generate documentation
docs-gen:
	@echo "$(CYAN)📖 Documentation is in docs/ folder$(RESET)"
	@ls -la docs/

# =============================================================================
# PORT MANAGEMENT
# =============================================================================

## Kill process on backend port
kill-back:
	@echo "$(CYAN)🔪 Killing process on port $(BACKEND_PORT)...$(RESET)"
	@lsof -ti :$(BACKEND_PORT) | xargs kill -9 2>/dev/null && echo "$(GREEN)✅ Process killed$(RESET)" || echo "$(YELLOW)No process found on port $(BACKEND_PORT)$(RESET)"

## Kill process on frontend port
kill-front:
	@echo "$(CYAN)🔪 Killing process on port $(FRONTEND_PORT)...$(RESET)"
	@lsof -ti :$(FRONTEND_PORT) | xargs kill -9 2>/dev/null && echo "$(GREEN)✅ Process killed$(RESET)" || echo "$(YELLOW)No process found on port $(FRONTEND_PORT)$(RESET)"

## Kill all dev processes
kill-all:
	@echo "$(CYAN)🔪 Killing all dev processes...$(RESET)"
	@lsof -ti :$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@echo "$(GREEN)✅ All dev processes killed$(RESET)"

## Show what's running on dev ports
ports:
	@echo "$(CYAN)🔍 Checking dev ports...$(RESET)"
	@echo ""
	@echo "$(BOLD)Port $(FRONTEND_PORT) (Frontend):$(RESET)"
	@lsof -i :$(FRONTEND_PORT) 2>/dev/null | head -3 || echo "  $(GREEN)Available$(RESET)"
	@echo ""
	@echo "$(BOLD)Port $(BACKEND_PORT) (Backend):$(RESET)"
	@lsof -i :$(BACKEND_PORT) 2>/dev/null | head -3 || echo "  $(GREEN)Available$(RESET)"
	@echo ""

## Restart backend (kill + start)
restart-back: kill-back back

## Restart frontend (kill + start)
restart-front: kill-front front

## Restart all (kill + dev)
restart: kill-all dev

# =============================================================================
# ALIASES (shortcuts)
# =============================================================================

f: front
b: back
d: dev
m: migrate
t: test
l: lint
c: clean
h: help
s: supabase
i: install

# Default target
.DEFAULT_GOAL := help
