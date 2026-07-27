# 🚀 Novus Cloud Deployment Pipeline

> A full-stack AI productivity platform built to demonstrate modern
> DevOps, cloud deployment, and container orchestration practices.

## Features

-   AI-powered productivity assistant
-   JWT authentication
-   Task management
-   Chat interface
-   PostgreSQL database
-   React + Express + TypeScript
-   Dockerized services
-   Docker Compose (development & production)
-   Multi-stage Docker builds
-   NGINX reverse proxy
-   Health checks
-   Persistent Docker volumes
-   Custom Docker networking
-   GitHub Actions CI
-   GitHub Container Registry (GHCR)

------------------------------------------------------------------------

## Architecture

``` text
GitHub
   │
GitHub Actions (CI)
   │
Build & Push Docker Images (GHCR)
   │
Production Server
   │
NGINX
├── React Frontend
└── Express Backend
      │
 PostgreSQL
```

------------------------------------------------------------------------

## Tech Stack

### Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS

### Backend

-   Node.js
-   Express
-   Prisma ORM
-   JWT Authentication

### Database

-   PostgreSQL

### DevOps

-   Docker
-   Docker Compose
-   GitHub Actions
-   GitHub Container Registry (GHCR)
-   NGINX

### Planned

-   Terraform
-   AWS
-   Kubernetes
-   ArgoCD
-   Prometheus
-   Grafana
-   Loki

------------------------------------------------------------------------

## Project Structure

``` text
.
├── app/
│   ├── backend/
│   └── frontend/
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── .github/
└── README.md
```

------------------------------------------------------------------------

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

-   Frontend: http://localhost
-   Backend Health: http://localhost:5000/health

------------------------------------------------------------------------

## Environment Variables

Backend:

``` env
DATABASE_URL=
JWT_SECRET=

GROQ_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
DEEPSEEK_API_KEY=
```

------------------------------------------------------------------------

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

------------------------------------------------------------------------

## CI Pipeline

On every push to `main`:

1.  Install dependencies
2.  Generate Prisma client
3.  Build backend
4.  Build frontend
5.  Build Docker images
6.  Push images to GHCR

------------------------------------------------------------------------

## Roadmap

### Completed

-   [x] Dockerized frontend
-   [x] Dockerized backend
-   [x] PostgreSQL
-   [x] Docker Compose (development)
-   [x] Docker Compose (production)
-   [x] Multi-stage Docker builds
-   [x] Health checks
-   [x] Named Docker volumes
-   [x] Custom Docker network
-   [x] Restart policies
-   [x] Environment variables
-   [x] GitHub Actions CI
-   [x] GitHub Container Registry

### Planned

-   [ ] Continuous Deployment to AWS EC2
-   [ ] Terraform
-   [ ] Kubernetes
-   [ ] ArgoCD
-   [ ] Prometheus
-   [ ] Grafana
-   [ ] Loki

------------------------------------------------------------------------

## Purpose

This project demonstrates an end-to-end DevOps workflow, from local
development with Docker to automated builds, container image publishing,
and cloud deployment using modern infrastructure tooling.