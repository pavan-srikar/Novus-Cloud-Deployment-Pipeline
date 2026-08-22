# Novus

A full-stack AI productivity app (task tracking + an AI chat coach). The app itself is secondary — this is primarily a DevOps project: everything from provisioning the server to deploying new code is automated, with no manual `kubectl apply` or SSH-and-fix steps in the normal flow.

**Stack:** React + TypeScript (Vite) · Express + TypeScript · PostgreSQL + Prisma · JWT auth

**Infra:** Terraform (AWS EC2 + S3 remote state) → k3s (single-node Kubernetes) → ArgoCD (GitOps) → NGINX Ingress

---

## Architecture

```
                          GitHub (main branch)
                                  │
                          GitHub Actions (CI)
                    build images ──► push to GHCR
                                  │
                     bump image tags in manifests
                                  │
                    force-push to `deployment` branch
                                  │
                 ┌────────────────┴────────────────┐
                 │                                  │
           ArgoCD (polls repo)              GitHub Actions (SSH job)
           syncs k8s manifests               syncs secrets into cluster,
                 │                            restarts pods if needed
                 ▼                                  │
        ┌──────────────────── k3s cluster ──────────┴──────────┐
        │                                                       │
        │   NGINX Ingress (single entrypoint, port 80)          │
        │        │                                              │
        │        ▼                                              │
        │   frontend pod ──(internal proxy)──► backend pod       │
        │        │                                  │            │
        │        └──────────► Postgres pod ◄────────┘            │
        │                                                       │
        └───────────────────────────────────────────────────────┘
```

Two pipelines run independently and meet inside the cluster: **ArgoCD** owns *what's deployed* (manifests), and a **separate SSH step** owns *what secrets exist* — because ArgoCD is a GitOps tool and secrets deliberately never live in git. `main` is where I write app code; a bot-only `deployment` branch holds the manifests, so my commits and CI's never collide.

ArgoCD's and Grafana's dashboards are both exposed directly on the box via NodePort (`:30443` / `:30300`) rather than behind the app's own Ingress — see [`docs/MONITORING.md`](./docs/MONITORING.md) for why that split exists.

Full breakdown of each piece is in [`docs/`](./docs) — see below.

---

## Local development

No cloud, no Kubernetes needed:

```bash
git clone https://github.com/pavan-srikar/Novus-Cloud-Deployment-Pipeline.git
cd Novus-Cloud-Deployment-Pipeline
docker compose -f docker-compose.dev.yml up --build
```

- App: http://localhost
- Backend health: http://localhost:5000/health

Production images run the same way via `docker-compose.prod.yml`, pulling from GHCR instead of building locally.

## Once deployed

- App: `http://<EC2_HOST>`
- ArgoCD: `https://<EC2_HOST>:30443` (self-signed cert — browser will warn, that's expected)
- Grafana: `http://<EC2_HOST>:30300` (default `admin` / `CHANGE_ME` — change on first login)

Full setup walkthrough, including how to get the ArgoCD admin password without decoding a k8s Secret by hand, is in [`docs/SETUP.md`](./docs/SETUP.md).

## Documentation

| Doc | Covers |
|---|---|
| [`docs/APP_ARCHITECTURE.md`](./docs/APP_ARCHITECTURE.md) | How the app itself works — data model, auth, the chat-to-task pipeline, XP/leveling |
| [`docs/SETUP.md`](./docs/SETUP.md) | Full walkthrough from a fresh fork — AWS IAM, Terraform, GitHub secrets, ArgoCD install |
| [`docs/CICD.md`](./docs/CICD.md) | Both GitHub Actions pipelines, job-by-job, and why they're built the way they are |
| [`docs/NETWORKING.md`](./docs/NETWORKING.md) | Ingress routing, NetworkPolicies, and two real bugs this design caused |
| [`docs/SECRETS.md`](./docs/SECRETS.md) | How secrets flow from GitHub → cluster, and an incident where two systems fought over the same one |
| [`docs/MONITORING.md`](./docs/MONITORING.md) | Prometheus + Grafana + kube-state-metrics + Loki — what's collected, how scraping and log shipping work, how to access it |
| [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) | A running log of real issues hit, root cause, and fix |
| [`docs/KUBECTL_CHEATSHEET.md`](./docs/KUBECTL_CHEATSHEET.md) | Every `kubectl`/`argocd` command actually used on this project, explained |

## Project layout

```
app/backend/                  Express API
app/frontend/                 React app
infrastructure/terraform/     AWS provisioning
infrastructure/kubernetes/    k8s manifests (synced by ArgoCD via the `deployment` branch)
.github/workflows/            CI + Terraform pipelines
docs/                         setup, architecture, and troubleshooting docs
```

## Screenshots

### Web App Demo

![Demo](./docs/assets/webapp.gif)

### Github-Actions

![Github-Actions](./docs/assets/GithubCI.gif)

### Agro CD

![AgroCD](./docs/assets/agroCD.gif)

### Grafana / Prometheus

![Grafana](./docs/assets/monitoring.gif)

## Status

**Done:** Docker (dev + prod, multi-stage builds), GitHub Actions CI, GHCR, Terraform + S3 remote state, self-bootstrapping EC2 (Docker, k3s, ArgoCD, the monitoring stack, and the app repo are all installed/cloned automatically at boot — `terraform apply` alone gets you most of the way there), ArgoCD GitOps with a dedicated deployment branch, NGINX Ingress, default-deny NetworkPolicies, automated secret rotation, Prometheus + Grafana + kube-state-metrics monitoring (host, pod, and app-level metrics), Loki + Promtail centralized logging, with public web access to ArgoCD and Grafana.

**Not done yet:** Alerting on metric thresholds (Alertmanager).