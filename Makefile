IMAGE_NAME = chatops-frontend:latest
PORT = 3000
BACKEND_URL = http://localhost:8000/api

.PHONY: build run dev

build:
	docker build -t $(IMAGE_NAME) .
	docker image prune -f

run:
	docker run --rm -p $(PORT):3000 -e BACKEND_URL=$(BACKEND_URL) $(IMAGE_NAME)

# Local hot-reloading dev server (no Docker build). Edits refresh instantly;
# BACKEND_URL is read server-side per request, so it's picked up the same way
# `run` provides it to the container.
dev:
	BACKEND_URL=$(BACKEND_URL) npm run dev -- --port $(PORT)
