# Novus

A full-stack AI productivity app (task tracking + an AI chat coach). The app itself is secondary — this is primarily a DevOps project: everything from provisioning the server to deploying new code is automated, with no manual `kubectl apply` or SSH-and-fix steps in the normal flow.

**Stack:** React + TypeScript (Vite) · Express + TypeScript · PostgreSQL + Prisma · JWT auth
**Infra:** Terraform → AWS EC2 → k3s (single-node Kubernetes) → ArgoCD (GitOps) → NGINX Ingress

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

Two pipelines run independently and meet inside the cluster: **ArgoCD** owns *what's deployed* (manifests), and a **separate SSH step** owns *what secrets exist* (API keys, DB credentials) — because ArgoCD is a GitOps tool and secrets deliberately never live in git.

---

## Getting started

### Full cloud setup

Every step — AWS IAM, Terraform state bucket, GitHub secrets, EC2 bootstrap, ArgoCD install — is written out in `docs/instructions.md`. It's written so a fresh fork can go from zero to a live deployment without needing me to explain anything live.

### Local development

No cloud, no Kubernetes needed:

```bash
git clone https://github.com/pavan-srikar/Novus-Cloud-Deployment-Pipeline.git
cd Novus-Cloud-Deployment-Pipeline
docker compose -f docker-compose.dev.yml up --build
```

- App: http://localhost
- Backend health: http://localhost:5000/health

Production images run the same way via `docker-compose.prod.yml`, pulling from GHCR instead of building locally.


---

## Project layout

```
app/backend/                  Express API
app/frontend/                 React app
infrastructure/terraform/     AWS provisioning
infrastructure/kubernetes/    k8s manifests (synced by ArgoCD via the `deployment` branch)
.github/workflows/            CI + Terraform pipelines
INSTRUCTIONS.md                full setup walkthrough
```

---

## Infrastructure (Terraform)

`infrastructure/terraform/` provisions:

- One EC2 instance (Ubuntu 24.04, size configurable via `terraform.tfvars`)
- An Elastic IP, so the server's address survives a `terraform destroy` + `apply` cycle without updating DNS/secrets every time (mostly — a full destroy still gets you a new EIP)
- A security group scoping inbound access to just what's needed (SSH, HTTP)
- Remote state in S3, so state isn't sitting on anyone's laptop

The EC2 instance bootstraps itself on first boot via a `user_data` script — no manual server setup at all. That script installs Docker, installs k3s (single-node Kubernetes), and wires up a working `kubectl` config for the default user. By the time Terraform reports the instance as ready, there's already a functioning Kubernetes cluster listening on it.

A second workflow (`.github/workflows/terraform.yml`) runs `terraform plan` on every push touching `infrastructure/terraform/**`, and `terraform apply` on manual trigger — plan is automatic for visibility, apply is manual on purpose, since this creates billable cloud resources.

---

## CI/CD Pipeline

`.github/workflows/ci.yml` runs on every push to `main` and has two jobs:

**`build-and-verify`**
1. Install deps, generate Prisma client, build backend and frontend
2. Build and push Docker images to GHCR, tagged with the commit SHA (not `:latest` — see *Why unique tags* below)
3. Rewrite the image tag in the k8s Deployment manifests to match this commit
4. Commit that change and force-push it to the `deployment` branch

**`deploy`** (needs the first job)
1. SSH into the EC2 box
2. Pull the latest `main` (for app code context, not manifests)
3. Recreate the `novus-secret` Kubernetes Secret from the current GitHub Actions secrets
4. Restart backend/frontend pods if they already exist, so they pick up any secret changes — this is separate from ArgoCD's job, since changing a k8s Secret doesn't automatically restart pods that already read it into memory

**Why unique image tags instead of `:latest`:** with `:latest`, `kubectl`/ArgoCD sometimes can't tell a new build apart from the old one at the manifest level, so a rollout can silently get skipped. A SHA-tagged image always produces a real diff, so a deploy is guaranteed to actually happen.

---

## GitOps: the branch split

`main` is where I write application code. A separate, bot-only `deployment` branch holds the Kubernetes manifests with their current image tags — I never hand-edit it, and CI always force-pushes to it rather than merging, since it's meant to represent "current `main` + latest build," not an append-only history.

This exists because early on, CI committed tag bumps straight back to `main`. That meant every time I pushed code, I'd immediately have to `git pull` to get the bot's commit back before I could push again — a self-inflicted race condition. Splitting the branches means my pushes and the bot's writes never touch the same ref, so that conflict is structurally impossible now.

ArgoCD's `Application` is pointed at `deployment` with `syncPolicy: automated`, so any change that lands there gets applied to the cluster without a manual `argocd app sync`.

---

## Kubernetes setup

Manifests live in `infrastructure/kubernetes/`, organized with Kustomize:

- **Namespace** — everything for this app lives in `novus`, isolated from anything else that might run on the cluster later
- **ConfigMap / Secret** — non-sensitive config (like `PORT`) vs. sensitive values (DB credentials, JWT secret, LLM API keys), injected into the backend via `envFrom`
- **Deployments** — backend and frontend each run a single replica with resource requests/limits set (so one runaway process can't starve the node) and liveness/readiness probes hitting `/health` and `/`
- **PersistentVolumeClaim** — Postgres data survives pod restarts
- **Services** — `ClusterIP` only; nothing is exposed directly outside the cluster except through the Ingress

### Ingress: single entrypoint

All external traffic — the site itself and every `/api/*` call — routes through the **frontend pod**. The frontend's own NGINX config proxies `/api/` internally to the backend service. API requests never hit the backend directly from outside the cluster.

This wasn't arbitrary — it's what makes the NetworkPolicy below actually work.

### NetworkPolicies: default-deny, explicit allow

Each pod has an explicit ingress/egress allowlist instead of relying on the cluster's default (which, depending on CNI, is often "allow everything"). The backend, for example:

- **Ingress:** only accepts traffic from pods labeled `app: frontend`, on port 5000. Nothing else — not even the ingress controller — can reach it directly.
- **Egress:** only allowed to reach Postgres (5432), DNS (53), and the open internet on 443 (needed for the LLM API calls — Groq, Gemini, etc. don't have fixed IPs, so this can't be scoped tighter without an egress proxy).

This is why the Ingress routes everything through the frontend pod rather than splitting `/api` off to hit the backend directly — traffic arriving from the ingress controller wouldn't match `app: frontend`, so a direct route would get silently dropped by design. Locking this down was a deliberate tradeoff: it's more restrictive than the app strictly needs to function, which is the point.

---

## Secrets management

Nothing sensitive lives in git. The flow:

1. Real values (DB credentials, JWT secret, LLM API keys, AWS credentials) live only in **GitHub Actions repo secrets**
2. On every deploy, the SSH job pulls those into environment variables and recreates the `novus-secret` Kubernetes Secret from scratch (`kubectl delete` + `create`, not `apply` — sidesteps diff/merge edge cases entirely)
3. Pods that were already running get an explicit rolling restart so they pick up the new values, since Kubernetes doesn't do this automatically for env-var-mounted secrets

Rotating any credential is a one-line GitHub Secrets update + a push — no manual `kubectl edit secret` on the box, ever.

---
## Status

**Done:** Docker (dev + prod, multi-stage builds), GitHub Actions CI, GHCR, Terraform + S3 remote state, self-bootstrapping EC2, k3s, ArgoCD GitOps with a dedicated deployment branch, NGINX Ingress, default-deny NetworkPolicies, automated secret rotation.

**Not done yet:** Prometheus / Grafana / Loki for metrics and centralized logs — right now, debugging means SSHing in and reading `kubectl logs` directly.