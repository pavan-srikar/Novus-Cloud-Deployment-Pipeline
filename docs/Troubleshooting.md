# Troubleshooting log

Real issues hit running this project, how they were diagnosed, and the fix. Kept as a reference for next time something looks similar — and because "here's a bug I actually debugged" is more useful in an interview than "the pipeline just works."

---

### Symptom: `kubectl` command fails with `permission denied` reading `/etc/rancher/k3s/k3s.yaml`, but the exact same command worked seconds earlier

**Cause:** a shell alias (`kubectl="sudo k3s kubectl"`) only expands when `kubectl` is the *first word* of a command. Wrapping it in `nohup kubectl ...` or inside a script means the alias never applies, and the raw un-sudo'd binary tries to read a root-only file.

**Fix:** `export KUBECONFIG=$HOME/.kube/config` instead of relying on the alias — works identically whether `kubectl` is first-word, wrapped, or inside a script.

---

### Symptom: `argocd login` fails with `connection refused`

**Cause:** the `kubectl port-forward` tunnel it depends on wasn't actually running — either never started, or was backgrounded with `nohup ... > /dev/null 2>&1 &` which hides the exact reason it died.

**Fix:** check `jobs` — `Running` vs `Exit 1` tells you immediately if it's alive. Redirect to a real logfile (`> /tmp/argocd-pf.log 2>&1`) instead of `/dev/null` so a crash is diagnosable instead of silent.

---

### Symptom: copied an auto-generated password, but login rejects it as wrong

**Cause:** `kubectl get secret ... | base64 -d` prints with no trailing newline, so the password runs directly into the next shell prompt line — easy to copy a corrupted/truncated string without noticing.

**Fix:** `... | base64 -d; echo` forces a clean newline after the output.

---

### Symptom: `502 Bad Gateway` on every API call, zero matching log lines on the backend

**Cause:** a `NetworkPolicy` was silently dropping traffic between the Ingress controller and the backend pod — the Ingress was routing `/api` directly to the backend Service, but the policy only trusted traffic from `app: frontend`. See [`NETWORKING.md`](./NETWORKING.md) for the full breakdown.

**Fix:** route all traffic through the frontend pod instead of splitting `/api` off at the Ingress level.

---

### Symptom: chat feature fails with a generic frontend error, backend logs show nothing for the request

**Cause:** same shape as the above, different direction — the backend's egress `NetworkPolicy` didn't allow outbound HTTPS at all, so calls to the LLM provider were silently dropped before ever leaving the pod.

**Fix:** added an explicit egress rule allowing port 443 to `0.0.0.0/0`.

---

### Symptom: chat feature fails with a real, visible error — `AuthenticationError: Invalid API Key`

**Cause:** exactly what it says — the provider (Groq) rejected the key. In this case a genuinely stale/regenerated key, confirmed by decoding the live cluster Secret and diffing it against the provider's dashboard.

**Fix:** regenerate the key, update the GitHub Actions secret, push to trigger a redeploy.

---

### Symptom: works right after a deploy, breaks later with no changes made

**Cause:** two systems (ArgoCD and an imperative SSH script) both had write access to the same Kubernetes Secret, on two independent schedules. Whichever synced most recently won — including ArgoCD's own background polling, which needs zero user action to trigger. See [`SECRETS.md`](./SECRETS.md) for the full incident.

**Fix:** removed the Secret manifest from ArgoCD's tracked resources entirely. One owner per object, no exceptions.

---

### Symptom: fresh EC2 box, CI's SSH deploy step fails with `No such file or directory` / `not a git repository`

**Cause:** `terraform apply` provisions a blank instance — nothing clones the repo onto it automatically. The SSH job assumes the repo already exists at a fixed path.

**Fix:** one-time manual `git clone` onto any new box, documented in [`SETUP.md`](./SETUP.md).

---

### Symptom: old user accounts / data gone after standing the cluster back up

**Cause:** Postgres's `PersistentVolumeClaim` uses k3s's default `local-path` storage class — data lives on the EC2 instance's own root disk, not on anything external. `terraform destroy` deletes that disk along with the instance, taking the database with it.

**Fix:** no fix applied — accepted as a known tradeoff for a single-node solo setup. A durable fix would mean an EBS-backed volume (via the AWS EBS CSI driver) or an external database (RDS) instead of in-cluster Postgres.