# CI/CD Pipeline

Two GitHub Actions workflows: one provisions infrastructure, the other builds and deploys the app.

## `terraform.yml` — infrastructure

Triggers:
- **`plan`** automatically on any push touching `infrastructure/terraform/**` — visibility only, doesn't change anything
- **`apply`** only on manual trigger (`workflow_dispatch`) — deliberately not automatic, since this creates billable AWS resources

What it provisions: one EC2 instance, an Elastic IP, a security group, and remote state in S3. The instance bootstraps itself via a `user_data` script on first boot — installs Docker, installs k3s, sets up a working `kubectl` config. No manual server setup after `apply` finishes.

## `ci.yml` — build and deploy

Triggers on every push to `main`. Two jobs:

### Job 1: `build-and-verify`

1. Install deps, generate Prisma client, build backend + frontend
2. Build Docker images, push to GHCR tagged with the **commit SHA** — not `:latest`
3. `sed`-rewrite the image tag in the Kubernetes Deployment manifests to match this commit
4. Commit that change and **force-push it to a separate `deployment` branch** (never to `main`)

### Job 2: `deploy` (needs job 1)

1. SSH into the EC2 box
2. Pull latest `main` (app code context — not the manifests)
3. Recreate the `novus-secret` Kubernetes Secret from the current GitHub Actions secrets (delete + create, not `apply` — avoids diff/merge edge cases on Secret objects entirely)
4. Restart backend/frontend pods **if they already exist** — this is separate from anything ArgoCD does, and exists because changing a Secret's contents doesn't auto-restart pods that already read it into their environment

## Why SHA tags, not `:latest`

With `:latest`, the image reference string never changes between builds — so `kubectl`/ArgoCD sometimes can't tell a new build apart from the old one at the manifest level, and a rollout can silently get skipped. A SHA-tagged image always produces a real diff in the manifest, so a deploy is guaranteed to actually trigger.

## Why a separate `deployment` branch instead of committing to `main`

Originally, job 1 committed the tag bump straight back to `main`. That meant every code push raced against the bot's own commit — push, get rejected because the bot had already pushed behind your back, `git pull`, push again. Constant friction, and it only gets worse the more often CI runs.

Splitting the branches fixes it structurally: `main` is 100% human-owned, `deployment` is 100% bot-owned, and they never write to the same ref. No possible collision, not "collision is now less likely."

ArgoCD watches `deployment`, not `main` — see [`NETWORKING.md`](./NETWORKING.md) and [`SECRETS.md`](./SECRETS.md) for what happens once a change lands there.