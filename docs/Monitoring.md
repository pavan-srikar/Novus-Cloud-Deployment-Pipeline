# Monitoring (Prometheus + Grafana)

Lives in its own `monitoring` namespace, deployed via the same ArgoCD `Application` and `deployment` branch as everything else — no separate pipeline.

## What's collecting what

- **node-exporter** (DaemonSet, `hostNetwork: true`) — host-level metrics: CPU, memory, disk, network, straight from the EC2 instance itself
- **Backend app metrics** — instrumented directly in Express via `prom-client` (`app/backend/src/metrics.ts`), exposed at `/metrics`. Tracks default Node.js process metrics (event loop lag, heap, GC) plus a custom `http_request_duration_seconds` histogram and `http_requests_total` counter, both labeled by method/route/status code
- **Prometheus** — scrapes both of the above, plus itself

## How scraping actually works

Prometheus doesn't have a hardcoded list of targets. It uses `kubernetes_sd_configs` (role: `pod`) to ask the Kubernetes API "what pods exist right now," then a `relabel_configs` block filters that down to only pods carrying specific annotations:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "5000"
  prometheus.io/path: "/metrics"
```

The backend Deployment carries these annotations already. **Any future service** just needs the same three annotations on its pod template to get picked up automatically — no editing Prometheus's config, no redeploying Prometheus itself.

This requires Prometheus to have RBAC permission to list pods/services/nodes across the cluster (`prometheus-rbac.yaml` — a `ClusterRole`, since discovery isn't scoped to one namespace).

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

## Accessing it

Deliberately **not** exposed through the public Ingress — same reasoning as ArgoCD's own dashboard: an admin/metrics UI on the open internet is unnecessary attack surface for a solo project. Reach it the same way as ArgoCD, via port-forward:

```bash
kubectl port-forward svc/grafana 3000:3000 -n monitoring
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
```

Grafana: `http://localhost:3000` — default login `admin` / `CHANGE_ME` (set in `grafana-deployment.yaml`). **Change this on first login** — same "don't leave the placeholder in place" rule as `JWT_SECRET: CHANGE_ME` elsewhere in this repo.

The Prometheus datasource is pre-provisioned (`grafana-datasource-configmap.yaml`) — no manual "add data source" step, it's there the moment you log in. Dashboards aren't pre-built yet; add them from Grafana's dashboard gallery (import ID `1860` for a solid generic node-exporter dashboard as a starting point) or build your own against the `http_request_duration_seconds` / `http_requests_total` series for app-level views.

## What's not included (yet)

- **kube-state-metrics** — would add Kubernetes object-level metrics (pod restart counts, deployment replica health, etc.) on top of the host + app metrics already collected. Reasonable next addition.
- **Alertmanager** — metrics are collected and visible, but nothing pages/notifies on thresholds yet.
- **Loki** — still on the roadmap for centralized log aggregation, same as noted in the main README.