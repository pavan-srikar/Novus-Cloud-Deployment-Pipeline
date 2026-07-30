#!/bin/bash
set -eux

apt-get update

apt-get install -y \
    docker.io \
    docker-compose-v2 \
    git \
    curl

systemctl enable docker
systemctl start docker

usermod -aG docker ubuntu

# Wait until Docker is responding
until docker info >/dev/null 2>&1; do
    sleep 2
done