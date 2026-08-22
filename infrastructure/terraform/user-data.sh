#!/bin/bash
set -e

apt-get update

apt-get install -y \
    curl \
    git \
    ca-certificates

# --- Docker ---
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# --- k3s ---
curl -sfL https://get.k3s.io | sh -

mkdir -p /home/ubuntu/.kube
cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
chown -R ubuntu:ubuntu /home/ubuntu/.kube

# The kubectl alias only expands as the first word of a command — breaks
# silently inside nohup/scripts. KUBECONFIG works everywhere, so set both.
echo 'alias kubectl="sudo k3s kubectl"' >> /home/ubuntu/.bashrc
echo 'export KUBECONFIG=/home/ubuntu/.kube/config' >> /home/ubuntu/.bashrc

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
K="k3s kubectl"

# --- wait for the k3s API to actually be up before using it ---
until $K get nodes >/dev/null 2>&1; do
  sleep 5
done

# --- clone the app repo onto the box ---
REPO_DIR="/home/ubuntu/$(basename "${git_repo_url}" .git)"
sudo -u ubuntu -H git clone "${git_repo_url}" "$REPO_DIR"

# --- namespaces ---
$K create namespace novus
$K create namespace monitoring
$K create namespace argocd

# ============================================================
# CRITICAL PATH — this is what makes the app actually deploy.
# Everything in this block must succeed, or the site itself
# won't come up. Kept first and un-guarded on purpose.
# ============================================================

$K apply --server-side --force-conflicts -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# ArgoCD CLI — not required for setup anymore (see below), kept for
# day-to-day use (argocd app sync / get / login for the UI).
curl -sSL -o /tmp/argocd-linux-amd64 \
  https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
install -m 555 /tmp/argocd-linux-amd64 /usr/local/bin/argocd
rm /tmp/argocd-linux-amd64

# Wait for the Application CRD to actually be registered before using it —
# applying one too early fails with "no matches for kind Application".
$K wait --for condition=established --timeout=120s crd/applications.argoproj.io

# --- Register the Application directly as a manifest, not via CLI login ---
# This is the actual GitOps-correct way to bootstrap: ArgoCD's Application
# is just a CRD, so it doesn't need `argocd login` or `app create` at all.
# If the `deployment` branch doesn't exist yet, this just sits waiting —
# ArgoCD retries automatically and starts syncing the moment it exists.
cat <<EOF | $K apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: novus
  namespace: argocd
spec:
  project: default
  source:
    repoURL: ${git_repo_url}
    targetRevision: deployment
    path: infrastructure/kubernetes
  destination:
    server: https://kubernetes.default.svc
    namespace: novus
  syncPolicy:
    automated: {}
EOF

# Stash the initial admin password somewhere only the ubuntu user can read,
# so there's no need to fetch/decode it manually on first login.
for i in $(seq 1 30); do
  if $K -n argocd get secret argocd-initial-admin-secret >/dev/null 2>&1; then
    $K -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' \
      | base64 -d > /home/ubuntu/argocd-initial-password.txt
    echo >> /home/ubuntu/argocd-initial-password.txt
    chown ubuntu:ubuntu /home/ubuntu/argocd-initial-password.txt
    chmod 600 /home/ubuntu/argocd-initial-password.txt
    break
  fi
  sleep 5
done

# ============================================================
# END CRITICAL PATH. Everything below is monitoring — genuinely
# optional. set +e means a failure here gets logged and skipped
# instead of killing the rest of the boot script.
# ============================================================
set +e

curl -fsSL -o /tmp/get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 /tmp/get_helm.sh
/tmp/get_helm.sh
rm /tmp/get_helm.sh

helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# --- Prometheus + Grafana (raw manifests, not a Helm chart) ---
$K apply -f "$REPO_DIR/infrastructure/kubernetes/monitoring/prometheus.yaml" \
  || echo "WARNING: prometheus.yaml apply failed - monitoring incomplete, app is unaffected"
$K apply -f "$REPO_DIR/infrastructure/kubernetes/monitoring/grafana.yaml" \
  || echo "WARNING: grafana.yaml apply failed - monitoring incomplete, app is unaffected"

# --- kube-state-metrics ---
$K apply -f "$REPO_DIR/infrastructure/kubernetes/monitoring/kube-state-metrics.yaml" \
  || echo "WARNING: kube-state-metrics.yaml apply failed - monitoring incomplete, app is unaffected"

# --- node-exporter ---
$K apply -f "$REPO_DIR/infrastructure/kubernetes/monitoring/node-exporter-daemonset.yaml" \
  || echo "WARNING: node-exporter-daemonset.yaml apply failed - monitoring incomplete, app is unaffected"

# --- Loki + Promtail (centralized logging) ---
helm install loki grafana/loki \
  -n monitoring \
  -f "$REPO_DIR/infrastructure/kubernetes/monitoring/loki-values.yaml" \
  || echo "WARNING: loki install failed - logging incomplete, app is unaffected"

helm install promtail grafana/promtail \
  -n monitoring \
  -f "$REPO_DIR/infrastructure/kubernetes/monitoring/promtail-values.yaml" \
  || echo "WARNING: promtail install failed - logging incomplete, app is unaffected"

set -e
echo "Boot script complete."