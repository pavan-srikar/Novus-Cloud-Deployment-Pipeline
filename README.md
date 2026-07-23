# 🚀 Novus Cloud Deployment Pipeline

> **Production-ready Cloud-Native AI Productivity Platform demonstrating modern DevOps, Platform Engineering, and Cloud deployment practices.**

Novus is a full-stack AI productivity platform built to simulate a real-world production environment. The project focuses on modern cloud infrastructure, containerization, automation, CI/CD, observability, and Kubernetes deployment rather than just application development.

---

# ✨ Features

* AI-powered productivity assistant
* User authentication with JWT
* Task management
* Chat interface
* REST API
* PostgreSQL database
* Responsive React frontend
* Dockerized microservices
* Infrastructure as Code
* CI/CD automation
* Monitoring & Logging
* Production-ready NGINX reverse proxy
* Multi-container architecture with Docker Compose

---

# 🏗️ Architecture

```
                GitHub
                   │
          GitHub Actions CI/CD
                   │
                   ▼
        Docker Image Build & Push
                   │
                   ▼
              AWS / Kubernetes
                   │
                   ▼
               NGINX (Reverse Proxy)
            ┌──────────┴──────────┐
            │                     │
      React Frontend        Express Backend
                                     │
                                     ▼
                               PostgreSQL
                                     │
                      Prometheus • Grafana • Loki
```

# 🔀 Request Flow

All client traffic enters through NGINX, which acts as a reverse proxy.


Browser
│
▼
NGINX (Port 80)
├── / → React Static Files
└── /api/* → Express Backend
│
▼
PostgreSQL


Benefits:

- Single public entry point
- Backend remains hidden from clients
- Simplified routing and deployment
- Ready for HTTPS, load balancing, and Kubernetes Ingress

---

# 🛠 Tech Stack

## Frontend

* React 19
* TypeScript
* Vite
* Axios
* React Router
* Tailwind CSS

## Backend

* Node.js
* Express.js
* TypeScript
* Prisma ORM
* JWT Authentication
* REST API

## Database

* PostgreSQL 17

## DevOps

* Docker
* Docker Compose
* GitHub Actions
* Terraform
* Kubernetes
* ArgoCD
* NGINX Ingress
* ExternalDNS
* cert-manager
* Horizontal Pod Autoscaler

## Monitoring

* Prometheus
* Grafana
* Loki

## Cloud

* AWS EC2
* AWS S3
* AWS RDS
* AWS IAM
* AWS VPC

---

# 📁 Project Structure

```text
novus-cloud-deployment-pipeline
│
├── app
│   ├── backend
│   └── frontend
│
├── infrastructure
│   ├── terraform
│   ├── kubernetes
│   └── nginx
│
├── monitoring
│
├── docker-compose.yml
│
└── README.md
```

---

# 🚀 Quick Start

Clone the repository

```bash
git clone https://github.com/pavan-srikar/Novus-Cloud-Deployment-Pipeline.git
cd novus-cloud-deployment-pipeline
```

Start the entire stack

```bash
docker compose up -d --build
```

Verify services

```bash
docker ps
```

Backend Health Check

```bash
curl http://localhost:5000/health
```

Open the application

```
Application
http://localhost

Backend Health
http://localhost:5000/health
```

Stop the project

```bash
docker compose down
```

---

# ⚙️ Environment Variables

Backend

```env
DATABASE_URL=postgresql://user:password@postgres:5432/database
JWT_SECRET=your-secret

GROQ_API_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
```

---

# 🐳 Docker Services

| Service          | Internal Port | Host Port |
| ---------------- | ------------: | --------: |
| NGINX (Frontend) |            80 |        80 |
| Backend API      |          5000 |      5000 |
| PostgreSQL       |          5432 |      5432 |


---

# 📈 CI/CD Pipeline

* Source Control with GitHub
* Automatic Docker image builds
* Infrastructure provisioning with Terraform
* Kubernetes deployments
* GitHub Actions workflows
* Rolling updates
* Health checks
* Automated deployments

---

# ☁️ Infrastructure

The project is designed to run on AWS using Infrastructure as Code.

Components include:

* VPC
* EC2
* RDS PostgreSQL
* S3
* IAM Roles
* Security Groups
* Load Balancer
* Kubernetes Cluster

---

# 📊 Observability

The platform includes production-ready monitoring.

* Prometheus metrics
* Grafana dashboards
* Loki centralized logging
* Container health monitoring
* Infrastructure monitoring

---

# 📌 Roadmap

- [x] Dockerized frontend
- [x] Dockerized backend
- [x] PostgreSQL container
- [x] Docker Compose orchestration
- [x] Production NGINX frontend
- [x] Reverse proxy routing
- [ ] Container health checks
- [ ] Multi-stage Docker optimization
- [ ] GitHub Actions CI/CD
- [ ] Terraform infrastructure
- [ ] AWS deployment
- [ ] Kubernetes deployment
- [ ] ArgoCD GitOps
- [ ] NGINX Ingress
- [ ] cert-manager
- [ ] ExternalDNS
- [ ] Horizontal Pod Autoscaler
- [ ] Prometheus
- [ ] Grafana
- [ ] Loki

---

# 🎯 Purpose

This repository demonstrates practical Platform Engineering and DevOps concepts by building, containerizing, deploying, and operating a cloud-native full-stack application using modern infrastructure tooling.

The objective is to showcase production deployment workflows, Infrastructure as Code, container orchestration, CI/CD automation, monitoring, and cloud operations in a single end-to-end project.
