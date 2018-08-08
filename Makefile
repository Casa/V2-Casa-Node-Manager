.PHONY: install-prehook	install

install-prehook:
	cp pre-commit .git/hooks/
	
install: install-prehook
	npm install
