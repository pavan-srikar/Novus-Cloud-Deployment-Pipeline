# Novus — Setup Instructions

Steps to get this running from a fresh fork. Do them in order — later steps depend on earlier ones existing.

## 1. Prerequisites

- AWS account
- An EC2 key pair created in AWS (Console → EC2 → Key Pairs) — note the name
- GitHub account with this repo forked
- API keys for whichever LLM providers you're using (Groq, Gemini, etc.)

## 2. Create the Terraform state bucket

Terraform needs somewhere to store its state file.

```bash
aws s3 mb s3://<your-unique-bucket-name> --region us-east-1
```

Then update `infrastructure/terraform/backend.tf` with your bucket name:

```hcl
terraform {
  backend "s3" {
    bucket = "<your-unique-bucket-name>"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}
```

Also update `infrastructure/terraform/terraform.tfvars` — set `key_name` to your actual EC2 key pair name (not the placeholder).

## 3. Add GitHub repo secrets

Repo → Settings → Secrets and variables → Actions → New repository secret. Add all of these:

| Secret | What it is |
|---|---|
| `AWS_ACCESS_KEY_ID` | From an IAM user with EC2 + S3 permissions |
| `AWS_SECRET_ACCESS_KEY` | Same IAM user |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Private key (`.pem` file contents) matching your EC2 key pair |
| `EC2_HOST` | Leave blank for now — you'll fill this in after step 4 |
| `POSTGRES_USER` | Your choice |
| `POSTGRES_PASSWORD` | Your choice |
| `POSTGRES_DB` | Your choice |
| `DATABASE_URL` | `postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>` |
| `JWT_SECRET` | Any long random string |
| `GEMINI_API_KEY` | From Google AI Studio |
| `GROQ_API_KEY` | From console.groq.com |
| `OPENROUTER_API_KEY` | From openrouter.ai |
| `DEEPSEEK_API_KEY` | From platform.deepseek.com |

## 4. Stand up the EC2 box

Push your `backend.tf`/`terraform.tfvars` changes to `main`, then go to Actions → **Terraform** workflow → **Run workflow** (manual trigger, this is what actually applies — a plain push only plans).

Once it finishes, get the IP:

```bash
cd infrastructure/terraform
terraform output public_ip
```

Go back to GitHub secrets and set `EC2_HOST` to that IP.

Docker, k3s, and kubectl are already installed automatically on boot (`user-data.sh` handles this) — nothing to install by hand.

## 5. Bootstrap the EC2 box (one-time, manual)

```bash
ssh ubuntu@<EC2_HOST>

git clone https://github.com/<your-username>/Novus-Cloud-Deployment-Pipeline.git ~/Novus-Cloud-Deployment-Pipeline

sudo k3s kubectl create namespace novus
```

## 6. Push the `deployment` branch once

From your local machine — this branch is bot-owned from here on, you're just creating it:

```bash
git checkout -b deployment
git push origin deployment
git checkout main
```

## 7. Install ArgoCD on the cluster

Still SSH'd into the EC2 box:

```bash
kubectl create namespace argocd
kubectl apply --server-side --force-conflicts -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Install the CLI:

```bash
curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
rm argocd-linux-amd64
```

Set `KUBECONFIG` so plain `kubectl` (no `sudo`, no alias) always works — this matters because the `kubectl` alias `user-data.sh` sets up only expands when `kubectl` is the first word of a command, and silently breaks the moment you wrap it in `nohup`/scripts (like the next step does):

```bash
export KUBECONFIG=$HOME/.kube/config
echo 'export KUBECONFIG=$HOME/.kube/config' >> ~/.bashrc
```

Get the admin password and log in:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
```

(the trailing `; echo` matters — without it the password has no newline after it and blends into your next terminal prompt, making it easy to copy a corrupted/truncated password by mistake)

Copy that password, then start the port-forward and log in:

```bash
nohup kubectl -n argocd port-forward svc/argocd-server 8080:443 > /tmp/argocd-pf.log 2>&1 &
argocd login localhost:8080 --username admin --password '<password from above>' --insecure
```

If login fails with "connection refused", the port-forward likely died — check `cat /tmp/argocd-pf.log` for why before retrying.

Then rotate that password: `argocd account update-password`

## 8. Point ArgoCD at the repo

```bash
argocd app create novus \
--repo https://github.com/<your-username>/Novus-Cloud-Deployment-Pipeline.git \
--path infrastructure/kubernetes \
--revision deployment \
--dest-server https://kubernetes.default.svc \
--dest-namespace novus \
--sync-policy automated
```

(paste as one line — backslash-newline continuations break if there's a trailing space after the `\`)

## 9. Trigger the first real deploy

Push any small change to `main` (app code, not `infrastructure/kubernetes/**`). This kicks off CI, which:
- builds and pushes Docker images
- bumps image tags and force-pushes to `deployment`
- SSHes in, syncs your secrets into the cluster, restarts pods

ArgoCD picks up the `deployment` branch change and applies everything else (Postgres, backend, frontend, ingress, network policies).

## 10. Check it worked

```bash
sudo k3s kubectl get pods -n novus
```

All three (`postgres`, `backend`, `frontend`) should show `Running`, `1/1`. Then open `http://<EC2_HOST>` in a browser.

## Day-to-day after this

Just `git push` to `main` like normal. CI builds, ArgoCD deploys, no manual steps. Never hand-edit anything in `infrastructure/kubernetes/**` on `main` while CI is also touching it in the same window — pull before you push if you do.

## If you ever `terraform destroy`

Redo steps 4, 5, 7, 8. Steps 3 and 6 don't need repeating — your secrets and `deployment` branch survive a cluster teardown.