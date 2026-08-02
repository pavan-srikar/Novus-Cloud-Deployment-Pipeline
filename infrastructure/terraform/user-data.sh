#!/bin/bash
set -e

apt-get update

apt-get install -y \
    curl \
    git \
    ca-certificates

# Install Docker
curl -fsSL https://get.docker.com | sh

systemctl enable docker
systemctl start docker

usermod -aG docker ubuntu

# Install k3s
curl -sfL https://get.k3s.io | sh -

# Make kubectl available for ubuntu
mkdir -p /home/ubuntu/.kube

cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config

chown -R ubuntu:ubuntu /home/ubuntu/.kube

echo 'alias kubectl="sudo k3s kubectl"' >> /home/ubuntu/.bashrc