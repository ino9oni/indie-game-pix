SHELL := /bin/bash

.PHONY: install dev run build preview lint fmt test coverage security-scan

install:
	@if command -v npm >/dev/null 2>&1; then npm ci || npm install; else echo "npm not found"; exit 1; fi

dev:
	npm run dev

run: dev

build:
	npm run build

preview:
	npm run preview

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

