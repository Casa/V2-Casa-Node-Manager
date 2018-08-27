.PHONY: install-prehook	install install-dev

install-prehook:
	cp pre-commit .git/hooks/

install: install-prehook
	npm install

install-dev:
	npm install --dev

lint:
	eslint .