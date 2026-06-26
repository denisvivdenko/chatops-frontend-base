IMAGE_NAME = chatops-frontend
PORT = 3000

build:
	docker build -t $(IMAGE_NAME) .

run:
	docker run --rm -p $(PORT):3000 $(IMAGE_NAME)
