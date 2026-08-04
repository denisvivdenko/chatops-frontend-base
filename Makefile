IMAGE_NAME = chatops-frontend:latest
PORT = 3000
BACKEND_URL = http://localhost:8000/api
# BACKEND_URL = http://chatops.denysvivdenko.dev/api

.PHONY: build run dev test

build:
	docker build -t $(IMAGE_NAME) .
	docker image prune -f

run:
	docker run --rm -p $(PORT):3000 -e BACKEND_URL=$(BACKEND_URL) $(IMAGE_NAME)

dev:
	BACKEND_URL=$(BACKEND_URL) npm run dev -- --port $(PORT)

test:
	BACKEND_URL=$(BACKEND_URL) npx vitest run

prod:
	BACKEND_URL=$(BACKEND_URL) npm run build && \
	BACKEND_URL=$(BACKEND_URL) npm run start -- --port $(PORT)
