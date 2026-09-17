# Fork

A downstream fork of [`ceedaragents/cyrus`](https://github.com/ceedaragents/cyrus) carrying patches for a self-hosted deployment.

## Branches

| Branch | Contents                                                             |
| ------ | -------------------------------------------------------------------- |
| `main` | Upstream, rebased, plus the patches below. The only branch to edit    |
| `dist` | The same tree plus compiled `dist/`, rebuilt by CI on every release   |

`dist` exists so a container build clones prebuilt JavaScript instead of compiling TypeScript at image build time. It is **generated** - never commit to it by hand, and never branch off it.

## Upstream baseline

Read it off the release tag, which is `v<upstream-version>-fork.<n>`: `v0.2.71-fork.1` is upstream `v0.2.71` plus fork revision 1. `apps/cli/package.json`'s `version` is the same upstream number, and **Fork Upstream Watch** opens an issue when upstream releases past it.

## Patches on top of upstream

| Patch                     | What it does                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Stale session recovery    | Detects a `--resume` that failed on an expired session id, clears it, retries with a context summary |
| Auto-resume on restart    | Interrupted sessions resume when the host restarts                                                   |
| Crash recovery with retry | Retries crashed sessions with backoff (`crashRetryCount`)                                            |
| omp runner                | `packages/omp-runner` plus the `"omp"` runner type: runs a session on omp over its RPC protocol       |
| Maintenance mode          | `maintenanceMode` config block plus `CYRUS_MAINTENANCE_MODE`: accept events, start no session, answer the request |

Upstream PR: [#829](https://github.com/ceedaragents/cyrus/pull/829) (session recovery). The webhook patches were cherry-picked upstream in [#923](https://github.com/ceedaragents/cyrus/pull/923).

## Workflows

| Workflow             | Trigger                | Purpose                                                                    |
| -------------------- | ---------------------- | -------------------------------------------------------------------------- |
| Fork CI              | push/PR                | Build, typecheck, test - upstream's `ci.yml` covers its own repo only      |
| Fork Release         | push to `main`         | Rebuild `dist`, tag `v<version>-fork.<n>`, cut a GitHub Release            |
| Fork Upstream Watch  | weekly + manual        | Open an issue when upstream releases past this fork's baseline             |

## Releasing

Landing on `main` is the release: **Fork Release** runs on every push to it, rebuilds `dist`, tags `v<upstream-version>-fork.<n>`, and cuts a GitHub Release. Docs-only pushes are skipped. Then bump the consumer's pinned tag - Renovate opens that PR itself.

Dispatch the workflow by hand only to re-cut a release without a new commit (`dry_run: true` to check the tag numbering first).

## Rebasing onto a new upstream release

```bash
git fetch origin --tags
git merge-base --is-ancestor v<old> v<new>   # nonzero => history was rewritten
git rebase --onto v<new> v<old> main
pnpm install && pnpm build                    # adapt patches to API changes
```

Rebasing rewrites `main`, which is expected here: `main` is a patch stack over an upstream tag, and the only consumer pins tags rather than tracking the branch. `--onto` is mandatory, not a preference: upstream periodically rewrites release-prep commits, and once the old tag is no longer an ancestor of the new one a plain `git rebase <new-tag>` replays every commit of the old lineage instead of the handful of fork patches.
