-include .env
export

IMAGE_NAME = chatops-frontend:latest
PORT = 3000

.PHONY: build run dev test

build:
	docker build -t $(IMAGE_NAME) .
	docker image prune -f

run:
	docker run --rm -p $(PORT):3000 -e BACKEND_URL=$(BACKEND_URL) $(IMAGE_NAME)

dev:
	npm run dev -- --port $(PORT)

test:
	npx vitest run

prod:
	npm run build && npm run start -- --port $(PORT)
