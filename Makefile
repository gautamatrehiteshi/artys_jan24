# Makefile for HyperLedger Fabric artys
include .env

GREEN  := $(shell tput -Txterm setaf 2)
WHITE  := $(shell tput -Txterm setaf 7)
YELLOW := $(shell tput -Txterm setaf 3)
RESET  := $(shell tput -Txterm sgr0)
ARCH   := $(shell uname -m)

COMPOSE = docker compose --env-file .env -f ./docker-compose.yml -p ${PROJECT_NAME}

.PHONY:start test model build stop clean restart teardown stats help
##@Code
start: model fabric ## Launch fabric locally and installs chaincode. Can be called with v=x

test: build ## Start a dev environment, connect to fabric, launch tests
	${COMPOSE} run --rm test

testw: build ## Start a dev environment, connect to fabric, launch tests with watcher
	${COMPOSE} run --rm test npm run testw

model: build ## Export the chaincode model for the API swagger custom endpoints
	${COMPOSE} run --rm test npm run model
	cp $(PWD)/data/model/model.json $(PWD)/api/config.json

##@Environment
build: ## Build the development image
	docker image build -t $(PROJECT_NAME) ./chaincode

stop: stop-fabric ## stop the fabric blockchain and dev environment
	${COMPOSE} down

restart: stop clean start ## Restarts a dev environment, launch test with watcher
clean: clean-fabric

teardown: stop teardown-fabric ## Remove any containers, images, leftovers from the project on the system
	-docker rmi node:8.9.4
	-docker rmi $(PROJECT_NAME)
	-docker rmi $(FABRIC_BUILDER)

##@Others
stats: ## Show useful docker stats with formating
	docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.Name}}"

help: ## Show this help.
	@awk \
		'BEGIN {FS = ":.*##"; printf "Usage: make $(GREEN)<target>$(YELLOW)\n"} \
		/^##@/ { printf "$(YELLOW)%s$(WHITE)\n", substr($$0, 4) } \
		/^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-10s$(WHITE) %s\n", $$1, $$2 }' \
		$(MAKEFILE_LIST)

.PHONY:fabric install upgrade restart-fabric copy-chaincode network
##@Testing
fabric: ## Pull and deploy a local Fabric instance
	${COMPOSE} up builder
	make install v=1

clean-fabric:
	-docker stop $$(docker ps -aq --filter "name=dev-peer*$(PROJECT_NAME)-*")
	-docker rm $$(docker ps -aq --filter "name=dev-peer*")
	-docker rmi $$(docker images -aq --filter "reference=dev-peer*")
	-docker system prune -f

copy-chaincode:
	docker cp $(PWD)/chaincode cli.$(PROJECT_NAME):/var/hyperledger/$(PROJECT_NAME)-$(v)

install: copy-chaincode ## Package, install and instantiate chaincode. Usage: make install v={x.x.x}
	${COMPOSE} run builder make install VERSION=$(v) NAMESPACE=${PROJECT_NAME}

upgrade: copy-chaincode ## Package, install and upgrade chaincode. Usage: make upgrade v={x.x.x}
	${COMPOSE} run builder make upgrade VERSION=$(v) NAMESPACE=${PROJECT_NAME}

stop-fabric:
	${COMPOSE} run builder make stop
	-docker rmi $$(docker images -aq --filter "reference=dev-peer*")

restart-fabric: stop-fabric fabric

teardown-fabric:
	-docker rmi -f $$(docker images -aq --filter "reference=hyperledger/fabric-*:*")
