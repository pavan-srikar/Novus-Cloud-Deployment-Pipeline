# 🚀 Novus Cloud Deployment Pipeline

  

> A full-stack AI productivity platform built to demonstrate modern DevOps, cloud deployment, and container orchestration practices.
## Features

- AI-powered productivity assistant

- JWT authentication

- Task management

- Chat interface

- PostgreSQL database

- React + Express + TypeScript

- Dockerized services

- Docker Compose (development & production)

- Multi-stage Docker builds

- NGINX reverse proxy

- Health checks

- Persistent Docker volumes

- Custom Docker networking

- GitHub Actions CI

- GitHub Container Registry (GHCR)

  

------------------------------------------------------------------------

  

## Architecture

```text
                    GitHub
                       │
              GitHub Actions (CI)
                       │
       Build & Push Images to GHCR
                       │
               SSH Deployment Job
                       │
                AWS EC2 (Terraform)
                       │
                k3s Kubernetes
                       │
            NGINX Ingress Controller
              │                 │
         React Frontend    Express Backend
              │                 │
              └──── PostgreSQL ─┘
```

  

--------

  

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express
- Prisma ORM
- JWT Authentication

### Database
- PostgreSQL

### DevOps

- Docker
- Docker Compose
- GitHub Actions
- GitHub Container Registry (GHCR)
- Terraform
- AWS EC2
- AWS S3 Remote State
- Kubernetes (k3s)
- NGINX Ingress

### In Progress

- Argo CD
- Prometheus
- Grafana
- Loki

------------------------------------------------------------------------

## Project Structure

```text
.
├── app/
│   ├── backend/
│   └── frontend/
│
├── infrastructure/
│   ├── terraform/
│   └── kubernetes/
│
├── docker-compose.dev.yml
├── docker-compose.prod.yml
│
├── .github/
│   └── workflows/
│
└── README.md
```

-------

## Quick Start

Clone the repository:
``` bash

git clone https://github.com/pavan-srikar/Novus-Cloud-Deployment-Pipeline.git

cd Novus-Cloud-Deployment-Pipeline

```

Start the development environment:
``` bash

docker compose -f docker-compose.dev.yml up --build

```

Stop it:
``` bash

docker compose -f docker-compose.dev.yml down

```

Backend health check:
``` bash

curl http://localhost:5000/health

```

Application:

- Frontend: http://localhost
- Backend Health: http://localhost:5000/health

-------
## Deployment

Infrastructure is provisioned using Terraform.

Terraform provisions:

- EC2 Instance
- Elastic IP
- Security Group
- User Data bootstrap
- Remote S3 Terraform state

GitHub Actions:

- Builds frontend
- Builds backend
- Pushes images to GHCR
- Updates Kubernetes Secrets
- Restarts backend deployment

The application runs on a single-node k3s Kubernetes cluster.
  


## Docker

Development:
``` bash

docker compose -f docker-compose.dev.yml up --build

```

Production:
``` bash

docker compose -f docker-compose.prod.yml up -d

```


Production images are pulled from GitHub Container Registry (GHCR).


## Kubernetes

Application components:

- Namespace
- ConfigMap
- Secret
- PostgreSQL Deployment
- Backend Deployment
- Frontend Deployment
- Persistent Volume Claim
- Services
- NGINX Ingress

Secrets are automatically updated from GitHub Actions during deployment.

## CI Pipeline

On every push to `main`

1. Install dependencies
2. Generate Prisma Client
3. Build backend
4. Build frontend
5. Build Docker images
6. Push images to GHCR
7. Connect to EC2
8. Update Kubernetes Secret
9. Restart Backend Deployment

## Roadmap

### Completed

- [x] Dockerized frontend
- [x] Dockerized backend
- [x] PostgreSQL
- [x] Docker Compose (Development)
- [x] Docker Compose (Production)
- [x] Multi-stage Docker builds
- [x] Health checks
- [x] Named Docker volumes
- [x] Custom Docker network
- [x] GitHub Actions CI
- [x] GitHub Container Registry
- [x] AWS EC2
- [x] Terraform
- [x] S3 Remote State
- [x] Kubernetes (k3s)
- [x] NGINX Ingress
- [x] Kubernetes Secrets
- [x] ConfigMaps
- [x] Persistent Volumes

### Planned

- [ ] Argo CD GitOps
- [ ] Prometheus Monitoring
- [ ] Grafana Dashboards
- [ ] Loki Log Aggregation
------------------------------------------------------------------------
## Purpose

This project demonstrates a production-style cloud-native deployment workflow using modern DevOps practices.

It covers:

- Infrastructure as Code with Terraform
- Containerization using Docker
- CI/CD with GitHub Actions
- Kubernetes orchestration (k3s)
- AWS cloud deployment
- Container image publishing with GHCR
- Secure secret management
- Reverse proxying with NGINX Ingress

The remaining roadmap focuses on GitOps and observability using Argo CD, Prometheus, Grafana, and Loki.