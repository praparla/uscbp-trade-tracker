.PHONY: help dev build deploy scrape scrape-quality scrape-full scrape-batch collect-batch serve-api test test-frontend test-scraper validate-data

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start frontend dev server (port 5173)
	cd frontend && npm run dev

build: ## Production build of frontend
	cd frontend && npm run build

preview: ## Preview production build locally
	cd frontend && npm run preview

deploy: build ## Build + deploy to GitHub Pages
	cd frontend && npx gh-pages -d dist

scrape: ## Default scrape — all cost optimizations (cheapest)
	cd scraper && python main.py

scrape-quality: ## Sonnet model (~10x cost, better quality)
	cd scraper && python main.py --model sonnet

scrape-full: ## No optimizations (most thorough, most expensive)
	cd scraper && python main.py --no-prefilter --full-text --model sonnet

scrape-batch: ## Batch job (50% cheaper, async)
	cd scraper && python main.py --batch

collect-batch: ## Collect batch results
	cd scraper && python main.py --collect-batch

scrape-dry: ## Dry run — no API calls, no downloads
	cd scraper && python main.py --dry-run

scrape-fetch: ## Fetch only — download bulletin texts, no API classification
	cd scraper && python main.py --fetch-only

serve-api: ## Start local FastAPI server (dev only, port 8000)
	cd scraper && uvicorn api:app --host 127.0.0.1 --port 8000 --reload

install: ## Install all dependencies
	cd frontend && npm install
	cd scraper && pip install -r requirements.txt

test: test-frontend test-scraper ## Run all tests (frontend + scraper)

test-frontend: ## Run frontend Vitest suite
	cd frontend && npm test

test-scraper: ## Run scraper pytest suite
	cd scraper && python -m pytest tests/ -v

validate-data: ## Run standalone data validation with known-fact checks
	cd frontend && npm run validate-data

clean: ## Remove build artifacts and caches
	rm -rf frontend/dist frontend/node_modules/.vite
	rm -rf scraper/cache/classifications/
