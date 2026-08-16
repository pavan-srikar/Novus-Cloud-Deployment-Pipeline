# Secrets Management

Nothing sensitive lives in git — not even as an encrypted blob. Real values (DB credentials, JWT secret, LLM API keys, AWS credentials) exist only in **GitHub Actions repo secrets**.

## The flow

1. On every deploy, the SSH job in `ci.yml` pulls the current values from GitHub Actions secrets into environment variables
2. `infrastructure/kubernetes/config/update-k8s-secret.sh` deletes and recreates the `novus-secret` Kubernetes Secret from those values — `delete` + `create`, not `apply`, to sidestep any diff/merge behavior on Secret objects entirely
3. Backend/frontend pods get an explicit rolling restart so they pick up the new values — Kubernetes doesn't do this automatically for Secrets mounted as environment variables, only for volume-mounted ones (and even then, the app has to be written to watch for the change)

Rotating any credential is: update it in GitHub Secrets, push anything to `main`. No manual `kubectl edit secret` on the box, ever.

## `infrastructure/kubernetes/config/secret.yaml` — intentionally not real

There's a `secret.yaml` checked into the repo, with every sensitive field either blank or an obvious placeholder (`JWT_SECRET: CHANGE_ME`, empty strings for API keys). This is correct — it documents which keys the app expects without ever containing a real value. It is **not** applied to the cluster (see the incident below for why that distinction matters).

## Incident: ArgoCD and the SSH job fighting over the same object

Early on, `secret.yaml` was included in `infrastructure/kubernetes/config/kustomization.yaml`, which meant ArgoCD treated it as a resource it owned and synced. Two independent systems ended up writing to the same `novus-secret` object on two independent schedules:

- The SSH job set real values, but only when CI ran
- ArgoCD re-applied the git version (blank placeholders) on its own polling cycle, regardless of what CI had just done

Whichever one ran more recently "won." This produced a genuinely confusing symptom: the app would work immediately after a deploy, then break on its own with zero user action — because ArgoCD's next automatic poll, entirely independent of anything the user did, would silently overwrite the real values with git's blank ones. Diagnosed with `kubectl describe secret novus-secret -n novus`, which showed every API key at `0 bytes` — not merely wrong, but genuinely empty, which pointed at "something is resetting this to a blank template" rather than "a key expired."

**Fix:** removed `secret.yaml` from `kustomization.yaml`'s resource list. ArgoCD no longer knows the file exists, so it can never sync/overwrite that object again. The Secret is now exclusively owned by the SSH job — one writer, no race.

**The general lesson:** don't let a GitOps tool manage any object that a second, independent process also writes to imperatively. Pick exactly one owner per resource.

## A caveat worth knowing

Kubernetes Secrets are base64-**encoded**, not encrypted, at rest by default. Anyone with `get secret -o yaml` access to the namespace can trivially decode them. Fine for a solo project on a private cluster; in a real multi-tenant or compliance-sensitive environment, you'd want something like Sealed Secrets or an external secrets manager (Vault, AWS Secrets Manager via the External Secrets Operator) instead of raw `Secret` objects.