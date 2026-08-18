# Monitoring (Prometheus + Grafana)

Lives in its own `monitoring` namespace, deployed via the same ArgoCD `Application` and `deployment` branch as everything else — no separate pipeline.

## What's collecting what

- **node-exporter** (DaemonSet, `hostNetwork: true`) — host-level metrics: CPU, memory, disk, network, straight from the EC2 instance itself
- **kube-state-metrics** (Deployment, `monitoring` namespace) — Kubernetes object-level metrics: pod phase (`Running`/`Pending`/`CrashLoopBackOff`), container restart counts, deployment/replicaset replica health. This is the layer node-exporter and app metrics don't cover — node-exporter only sees the host, `prom-client` only sees the backend process, neither one knows whether a pod itself is healthy at the Kubernetes level
- **Backend app metrics** — instrumented directly in Express via `prom-client` (`app/backend/src/metrics.ts`), exposed at `/metrics`. Tracks default Node.js process metrics (event loop lag, heap, GC) plus a custom `http_request_duration_seconds` histogram and `http_requests_total` counter, both labeled by method/route/status code
- **Prometheus** — scrapes all three of the above, plus itself

## How scraping actually works

Prometheus doesn't have a hardcoded list of targets. It uses `kubernetes_sd_configs` (role: `pod`) to ask the Kubernetes API "what pods exist right now," then a `relabel_configs` block filters that down to only pods carrying specific annotations:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "5000"
  prometheus.io/path: "/metrics"
```

The backend Deployment carries these annotations already, and so does kube-state-metrics (on port `8080`). **Any future service** just needs the same three annotations on its pod template to get picked up automatically — no editing Prometheus's config, no redeploying Prometheus itself.

This requires Prometheus to have RBAC permission to list pods/services/nodes across the cluster (`prometheus.yaml` — a `ClusterRole`, since discovery isn't scoped to one namespace). kube-state-metrics has its own separate `ClusterRole` for the same reason — it needs to list Deployments/ReplicaSets/StatefulSets/Jobs across every namespace to report on them.

## The NetworkPolicy gotcha this setup ran straight into

Prometheus lives in `monitoring`, the backend lives in `novus`, and the backend's `NetworkPolicy` only trusted traffic from `app: frontend` in the same namespace — the exact shape of bug that already broke the app twice (see `docs/NETWORKING.md`). Fixed proactively this time instead of by debugging a 502 later:

```yaml
- from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: monitoring
      podSelector:
        matchLabels:
          app: prometheus
  ports:
    - protocol: TCP
      port: 5000
```

`kubernetes.io/metadata.name` is a label Kubernetes sets automatically on every namespace (since 1.21+) matching its own name — reliable way to target a whole namespace by name without needing a custom label first.

**Does kube-state-metrics need the same fix?** No. All three `NetworkPolicy` objects in this repo (`frontend-policy`, `backend-policy`, `postgres-policy`) live in the `novus` namespace and only select pods there. There is no `NetworkPolicy` selecting anything in `monitoring`, which means Kubernetes treats that namespace as fully open by default — no policy means no restriction, not the other way around. Prometheus can reach kube-state-metrics with zero extra config.

Worth knowing the flip side: since nothing in `monitoring` is locked down, Prometheus/Grafana/kube-state-metrics are all reachable by anything else on the cluster network, not just each other. A `default-deny` policy for that namespace would be the natural hardening step later — not needed for a solo project right now.

## Accessing it

- **Grafana:** exposed directly at `http://<EC2_HOST>:30300` via NodePort — no port-forward needed day to day. Default login `admin` / `CHANGE_ME` (set in `grafana.yaml`). **Change this on first login**, same "don't leave the placeholder in place" rule as `JWT_SECRET: CHANGE_ME` elsewhere in this repo.
- **Prometheus:** still port-forward only —
  ```bash
  kubectl port-forward svc/prometheus 9090:9090 -n monitoring
  ```
  Unlike Grafana and ArgoCD, Prometheus has **no built-in authentication at all**. Exposing it directly means anyone with the URL can read every metric being collected — not catastrophic, but a real information-disclosure tradeoff, made deliberately here rather than by default.
- **kube-state-metrics:** never needs direct access — it's a metrics source Prometheus scrapes, not something you open in a browser.

The Prometheus datasource in Grafana is pre-provisioned (`grafana.yaml`'s `grafana-datasources` ConfigMap) — no manual "add data source" step, it's there the moment you log in.

A dashboard is checked into this repo at `infrastructure/kubernetes/monitoring/novus-devops-dashboard.json` — import it via Grafana's **Dashboards → New → Import** screen and point it at the existing Prometheus datasource. It covers:

- Cluster overview (scrape targets up/down, avg node CPU/mem)
- Node health (CPU, memory, disk, network per node, from node-exporter)
- Pod/scrape-target health (table + timeline of every `up{}` target)
- Backend app health (request rate, 5xx rate, p50/p95/p99 latency, Node.js heap + event loop lag)
- Pod-level health (pod phase, restart counts, deployment replica health, per-pod CPU/mem) — from kube-state-metrics, collapsed by default

For anything not covered, Grafana's own dashboard gallery has more generic options (import ID `1860` is a solid generic node-exporter dashboard).

## What's not included (yet)

- **Alertmanager** — metrics are collected and visible, but nothing pages/notifies on thresholds yet.
- **Loki** — still on the roadmap for centralized log aggregation, same as noted in the main README.