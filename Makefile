SHELL := /bin/bash

.PHONY: install dev run build preview lint fmt test coverage security-scan

# Helper: ensure vite is available locally without always reinstalling
ensure-vite:
	@if [ ! -x node_modules/.bin/vite ]; then \
		echo "vite not found locally. Installing deps..."; \
		if command -v npm >/dev/null 2>&1; then npm ci || npm install; else echo "npm not found"; exit 1; fi; \
	fi

install:
	@if command -v npm >/dev/null 2>&1; then npm ci || npm install; else echo "npm not found"; exit 1; fi

dev: ensure-vite
	npx vite --host --port 15173

run: dev

build: ensure-vite
	npx vite build

preview: ensure-vite
	npx vite preview --host --port 15173

lint:
	npm run lint || true

fmt:
	npm run fmt || true

test:
	npm run test

coverage:
	@echo "No coverage setup yet"

security-scan:
	@echo "No security scan configured"
