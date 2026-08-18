# Novus — Setup Instructions

Steps to get this running from a fresh fork. Do them in order — later steps depend on earlier ones existing.

`terraform apply` now does most of the heavy lifting itself — it provisions the EC2 box **and** installs Docker, k3s, ArgoCD, clones this repo onto the box, and points ArgoCD's `Application` at your `deployment` branch, all via the `user_data` boot script. What's left manual below is only the stuff that genuinely can't be automated (see the note at the end of step 4 for why).

## 1. Prerequisites

- AWS account
- An EC2 key pair created in AWS (Console → EC2 → Key Pairs) — note the name
- GitHub account with this repo forked
- API keys for whichever LLM providers you're using (Groq, Gemini, etc.)

## 2. Create the Terraform state bucket

```bash
aws s3 mb s3://<your-unique-bucket-name> --region us-east-1
```

Update `infrastructure/terraform/backend.tf` with your bucket name:

```hcl
terraform {
  backend "s3" {
    bucket = "<your-unique-bucket-name>"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}
```

Also update `infrastructure/terraform/terraform.tfvars`:
- `key_name` — your actual EC2 key pair name (not the placeholder)
- `git_repo_url` — your fork's URL. This gets baked into the boot script so the box clones the right repo and ArgoCD watches the right source — **update this before your first `apply`, or ArgoCD will bootstrap itself pointed at the original repo instead of your fork.**

## 3. Add GitHub repo secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | What it is |
|---|---|
| `AWS_ACCESS_KEY_ID` | From an IAM user with EC2 + S3 permissions |
| `AWS_SECRET_ACCESS_KEY` | Same IAM user |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Private key (`.pem` file contents) matching your EC2 key pair |
| `EC2_HOST` | Leave blank for now — filled in after step 4 |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Your choice |
| `DATABASE_URL` | `postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>` |
| `JWT_SECRET` | Any long random string |
| `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `DEEPSEEK_API_KEY` | From each provider's dashboard |

## 4. Stand up the EC2 box

Push your `terraform.tfvars` changes to `main`, then Actions → **Terraform** workflow → **Run workflow** (manual trigger — this is what actually applies; a plain push only plans).

Once it finishes:

```bash
cd infrastructure/terraform
terraform output public_ip
```

Set `EC2_HOST` in GitHub Secrets to that IP.

By the time `apply` finishes, the box has already: installed Docker + k3s, cloned your repo, created the `novus` and `argocd` namespaces, installed ArgoCD, and applied an `Application` object pointing at your `deployment` branch. **It'll sit there doing nothing yet** — the `deployment` branch doesn't exist until step 5, and ArgoCD just waits/retries quietly until it does. That's expected, not an error.

**What's still manual, and why:**
- **Setting `EC2_HOST`** — chicken-and-egg. The IP doesn't exist until the instance does, so nothing can pre-fill this before `apply` runs.
- **Pushing the `deployment` branch** (step 5) — this has to come from *your* machine with *your* git identity/credentials. The EC2 box deliberately doesn't hold write access to your repo — giving a public-facing server push rights to your source control would be a real security downgrade for very little benefit.
- **Rotating the ArgoCD admin password** (step 6) — a human decision, not something worth silently automating.

## 5. Push the `deployment` branch once

```bash
git checkout -b deployment
git push origin deployment
git checkout main
```

This branch is bot-owned from here on — CI force-pushes to it, you never touch it by hand again. The moment it exists, the `Application` created back in step 4 picks it up automatically.

## 6. Log into ArgoCD and rotate the password

ArgoCD's UI is exposed directly at `https://<EC2_HOST>:30443` — your browser will warn about the self-signed certificate, that's expected, proceed past it (or add a real cert later if this ever needs to be more than a solo dev tool).

The initial admin password is already sitting on the box, no `kubectl get secret`/`base64 -d` needed:

```bash
ssh ubuntu@<EC2_HOST>
cat ~/argocd-initial-password.txt
```

Log in via the web UI with `admin` and that password, then rotate it immediately — Settings → change the admin password from the UI, or via CLI if you'd rather:

```bash
nohup kubectl port-forward svc/argocd-server -n argocd 8080:443 > /tmp/argocd-pf.log 2>&1 &
argocd login localhost:8080 --username admin --password '<password from the file above>' --insecure
argocd account update-password
```

## 7. Trigger the first real deploy

Push any small change to `main` (app code, not `infrastructure/kubernetes/**`). This kicks off CI, which builds and pushes Docker images, bumps image tags and force-pushes to `deployment`, then SSHes in to sync your secrets into the cluster.

ArgoCD picks up the `deployment` branch change and applies everything else — Postgres, backend, frontend, ingress, network policies, monitoring.

## 8. Check it worked

```bash
kubectl get pods -n novus
kubectl get pods -n monitoring
```

Everything should show `Running`, `1/1`. Then open `http://<EC2_HOST>` in a browser.

## Day-to-day after this

Just `git push` to `main` like normal. CI builds, ArgoCD deploys, no manual steps. Never hand-edit anything in `infrastructure/kubernetes/**` on `main` while CI is also touching it in the same window — pull before you push if you do.

## If you ever `terraform destroy`

Redo steps 4 and 6 (Terraform recreates everything and re-bootstraps ArgoCD automatically; you just need to update `EC2_HOST` and rotate the new admin password). Steps 3 and 5 don't need repeating — your GitHub secrets and `deployment` branch survive a cluster teardown, since neither one lives on the EC2 box.

**One thing that does *not* survive:** the database. See `docs/TROUBLESHOOTING.md` for why (Postgres storage is tied to the instance's local disk) and what a durable fix would look like.