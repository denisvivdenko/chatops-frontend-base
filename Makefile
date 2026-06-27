IMAGE_NAME = chatops-frontend:latest
PORT = 3000
BACKEND_URL = http://localhost:8000

build:
	docker build -t $(IMAGE_NAME) .
	docker image prune -f

run:
	docker run --rm -p $(PORT):3000 -e BACKEND_URL=$(BACKEND_URL) $(IMAGE_NAME)
