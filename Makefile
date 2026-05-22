.PHONY: help dev build start clean

help:
	@echo "Blink frontend — available commands:"
	@echo "  make dev       Start development server (http://localhost:3000)"
	@echo "  make build     Production build"
	@echo "  make start     Run production build"
	@echo "  make clean     Remove build artifacts and node_modules"

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

clean:
	rm -rf .next
	rm -rf node_modules
	npm install
