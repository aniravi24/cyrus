# Fork

A downstream fork of [`ceedaragents/cyrus`](https://github.com/ceedaragents/cyrus) carrying patches for a self-hosted deployment.

## Branches

| Branch                            | Contents                                                     |
| --------------------------------- | ------------------------------------------------------------ |
| `fix/stale-session-recovery`      | Source: upstream + the patches below                         |
| `fix/stale-session-recovery-dist` | Same source plus compiled `dist/`, rebuilt by CI per release |

The dist branch exists so a container build clones prebuilt JavaScript instead of compiling TypeScript at image build time. It is **generated** - never commit to it by hand; dispatch **Fork Release** instead.

## Upstream baseline

Read it off the release tag, which is `v<upstream-version>-fork.<n>`: `v0.2.71-fork.1` is upstream `v0.2.71` plus fork revision 1. `apps/cli/package.json`'s `version` is the same upstream number, and **Fork Upstream Watch** opens an issue when upstream releases past it.

## Patches on top of upstream

| Patch                     | What it does                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Stale session recovery    | Detects a `--resume` that failed on an expired session id, clears it, retries with a context summary |
| Auto-resume on restart    | Interrupted sessions resume when the host restarts                                                   |
| Crash recovery with retry | Retries crashed sessions with backoff (`crashRetryCount`)                                            |
| omp runner                | `packages/omp-runner` plus the `"omp"` runner type: runs a session on omp over its RPC protocol       |

Upstream PR: [#829](https://github.com/ceedaragents/cyrus/pull/829) (session recovery). The webhook patches were cherry-picked upstream in [#923](https://github.com/ceedaragents/cyrus/pull/923).

## Workflows

| Workflow             | Trigger                | Purpose                                                                    |
| -------------------- | ---------------------- | -------------------------------------------------------------------------- |
| Fork CI              | push/PR to fork branch | Build, typecheck, test - upstream's `ci.yml` only covers `main`/`cypack-*` |
| Fork Release         | manual dispatch        | Rebuild dist branch, tag `v<version>-fork.<n>`, cut a GitHub Release        |
| Fork Upstream Watch  | weekly + manual        | Open an issue when upstream releases past this fork's baseline             |

## Releasing

1. Land the change on the source branch (Fork CI must be green).
2. Dispatch **Fork Release** (`dry_run: true` first if the tag numbering matters).
3. Bump the consumer's pinned tag.

## Rebasing onto a new upstream release

```bash
git fetch origin --tags
git merge-base --is-ancestor v<old> v<new>   # nonzero => history was rewritten
git rebase --onto v<new> v<old> fix/stale-session-recovery
pnpm install && pnpm build                    # adapt patches to API changes
```

`--onto` is mandatory, not a preference: upstream periodically rewrites release-prep commits, and once the old tag is no longer an ancestor of the new one a plain `git rebase <new-tag>` replays every commit of the old lineage instead of the handful of fork patches.
