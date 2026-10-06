FROM docker:cli AS docker-tools

FROM jenkins/inbound-agent:alpine-jdk21
USER root
RUN apk add --no-cache nodejs npm git bash curl aws-cli openssh-client
COPY --from=docker-tools /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-tools /usr/local/libexec/docker/cli-plugins/ /usr/local/libexec/docker/cli-plugins/
USER jenkins
WORKDIR /home/jenkins/agent

