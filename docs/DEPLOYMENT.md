# Deployment and CI

## Branches

`feature/<name>` merges into `dev`, which deploys to staging. `dev` merges into `main`, which deploys to production. Both `dev` and `main` are protected.

## Workflows (`.github/workflows/`)

- `test.yml` runs on PRs to `dev` and `main`: `npm run test:run` and `npm run type-check`.
- `migration-check.yml` labels PRs that contain migrations. It fails on destructive migrations until the `destructive-migration-approved` label is added.
- `build-app.yml` builds the app image when a PR merges to `dev` or `main`.
- `deploy-clone-worker.yml` builds the clone-worker image. It only runs when `cloud-functions/clone-program/**` or `prisma/schema.prisma` changes.
- `issue-cleanup.yml` does issue housekeeping.

## Environments

**Staging** (merge to `dev`), https://staging.ripit.fit
- Images: `ghcr.io/aptx-health/ripit-fitness:staging` and `ghcr.io/aptx-health/clone-program:staging`, overwritten on every merge.
- The Helm values use `imagePullPolicy: Always`, so a rollout picks up the new image.

**Production** (merge to `main`), https://ripit.fit
- Images: `ghcr.io/aptx-health/ripit-fitness:sha-<sha>` and `ghcr.io/aptx-health/clone-program:<sha>`. These are pinned and never overwritten.
- To release, bump the SHA by hand in the infra repo's Helm values.

GitHub Environments `staging` (restricted to `dev`) and `production` hold environment-specific vars, such as `NEXT_PUBLIC_APP_URL`. An environment var overrides a repo secret of the same name.

ArgoCD (GitOps, auto-sync) manages the k8s deployments. Secrets flow from Doppler through External Secrets Operator. Image traceability: `docs/IMAGE_TRACEABILITY.md`.

## GitHub Discussions

Use Discussions, not Issues, for architecture and design questions. `gh` has no discussion command, so use GraphQL:

```bash
gh api graphql -f query='
mutation {
  createDiscussion(input: {
    repositoryId: "R_kgDOQjYwOQ",
    categoryId: "DIC_kwDOQjYwOc4C3fsH",
    title: "Your title",
    body: "Your markdown body"
  }) { discussion { url } }
}'
```

Category IDs:

| Category | ID |
|---|---|
| Announcements | `DIC_kwDOQjYwOc4C3fsE` |
| General | `DIC_kwDOQjYwOc4C3fsF` |
| Ideas (architecture decisions) | `DIC_kwDOQjYwOc4C3fsH` |
| Q&A | `DIC_kwDOQjYwOc4C3fsG` |
