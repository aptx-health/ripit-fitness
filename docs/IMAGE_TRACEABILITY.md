# Image Traceability

Every image pushed to GHCR is tagged with OCI standard labels plus custom `ripit.*` labels so you can trace it back to the exact commit, PR, and workflow run that built it.

## On GHCR (web UI)

`org.opencontainers.image.source` makes the package page display a **"Source"** link that jumps straight to the commit on GitHub. Visit the package page for [ripit-fitness](https://github.com/aptx-health/ripit-fitness/pkgs/container/ripit-fitness) or [clone-program](https://github.com/aptx-health/ripit-fitness/pkgs/container/clone-program).

## From a running image (or pulled tarball)

```bash
docker inspect ghcr.io/aptx-health/ripit-fitness:sha-<sha> \
  | jq '.[0].Config.Labels'
```

You'll see something like:

```json
{
  "org.opencontainers.image.source": "https://github.com/aptx-health/ripit-fitness",
  "org.opencontainers.image.revision": "abc1234...",
  "org.opencontainers.image.ref.name": "main",
  "org.opencontainers.image.created": "2026-04-08T23:45:12Z",
  "org.opencontainers.image.title": "ripit-fitness",
  "ripit.branch": "main",
  "ripit.actor": "dmays",
  "ripit.workflow.run": "https://github.com/aptx-health/ripit-fitness/actions/runs/1234567890",
  "ripit.pr.number": "429",
  "ripit.pr.url": "https://github.com/aptx-health/ripit-fitness/pull/429"
}
```

## From inside k8s

```bash
kubectl get pod <pod> -o jsonpath='{.spec.containers[0].image}'
# then:
docker pull <that-image>
docker inspect <that-image> | jq '.[0].Config.Labels'
```

Or: `skopeo inspect docker://<image>` works without pulling.

## Common operator questions

| Question | How to answer |
|---|---|
| What commit is running in prod right now? | `kubectl exec <pod> -- env` won't tell you — `docker inspect` the image and read `org.opencontainers.image.revision` |
| What PR introduced this bug? | `docker inspect` → `ripit.pr.url` (or `ripit.pr.number`) |
| Who triggered this build? | `docker inspect` → `ripit.actor` |
| Where are the build logs? | `docker inspect` → `ripit.workflow.run` (direct link to the GitHub Actions run) |
| When was this built? | `docker inspect` → `org.opencontainers.image.created` |
| What branch? | `docker inspect` → `org.opencontainers.image.ref.name` |

## Tag conventions

| Tag pattern | Built on | Mutable? |
|---|---|---|
| `ripit-fitness:staging` | merge to `dev` | **yes** (overwritten each merge) |
| `ripit-fitness:sha-<full-sha>` | merge to `main` | no (pinned forever) |
| `ripit-fitness:pr-<num>-sha-<short>` | PR to `dev` | no (one per commit) |
| `clone-program:staging` | merge to `dev` (path-filtered) | yes |
| `clone-program:<full-sha>` | merge to `main` (path-filtered) | no |

Labels are always present regardless of tag mutability — even `:staging` can be traced back to the specific commit that produced it.
