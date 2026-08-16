# Networking & Security

How traffic actually flows through the cluster, and why it's shaped the way it is — including two real bugs this shape caused, and how they were found.

## Ingress: single entrypoint

Every external request — the site itself and every `/api/*` call — routes through the **frontend pod only**:

```
browser → Traefik Ingress → frontend pod → (internal NGINX proxy) → backend pod
```

The frontend's own NGINX config proxies `/api/` to the backend Service internally. The backend Service is never exposed as a separate Ingress path.

### The bug this prevented from being caught earlier

The Ingress originally *did* have a second rule sending `/api` straight to the backend Service, bypassing the frontend pod entirely — seemed like a reasonable shortcut at the time. It caused every API call to fail with a bare `502 Bad Gateway` and zero backend log output, because the NetworkPolicy below only allows traffic from `app: frontend` — Traefik doesn't carry that label, so the packet was silently dropped before it ever reached Express. No error message, no log line, just nothing. Found by comparing `kubectl describe ingress` (showed the route as correctly configured) against `kubectl logs -f` on the backend (showed literally no incoming request) — the gap between "ingress says it's routed" and "app never saw it" is what pointed at the network layer instead of application code.

Fix: removed the direct `/api` Ingress rule. Everything funnels through the frontend pod now, which the NetworkPolicy already trusted.

## NetworkPolicies: default-deny, explicit allow

Each pod has an explicit ingress **and** egress allowlist, rather than relying on whatever the cluster's default happens to be.

**Backend — ingress:** only from pods labeled `app: frontend`, on port 5000. Nothing else, including the ingress controller directly, can reach it.

**Backend — egress:** only to Postgres (5432), DNS (53), and the open internet on 443. That last one is intentionally broad — the LLM providers (Groq, Gemini, etc.) don't publish fixed IP ranges, so scoping tighter than "port 443 to anywhere" isn't practical without adding an egress proxy.

### The second bug this shape caused

After fixing the Ingress bug above, chat requests still failed — this time with a real error in the logs (`AuthenticationError` from the Groq SDK), which made it look like a bad API key. It **was** eventually a bad key, but first there was a separate issue: the backend's egress rules didn't include port 443 to the internet at all originally, only Postgres and DNS. Every outbound call to an LLM provider was being silently dropped the same way the Ingress traffic had been — same symptom shape (nothing in the logs, request just vanishes), different direction (egress instead of ingress).

Fix: added an explicit `ipBlock: 0.0.0.0/0` egress rule on port 443.

## The pattern worth remembering

Both bugs looked identical from the outside — "request fails, no useful error, nothing in application logs." Both were actually the network layer dropping a packet before the application ever got a chance to log anything. When a request fails with **zero corresponding log line on the receiving side**, that's the tell to check `NetworkPolicy`/`Ingress` config before assuming it's an application bug.