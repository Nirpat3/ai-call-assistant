# Agent Git Rules

- Run `git status -sb` before work.
- Sync base first: `git checkout main && git pull --ff-only origin main`.
- Create feature branch per task.
- No force-push on shared branches.
- Do not commit secrets (`.env`, tokens, logs).
- Open PR for merge to `main`.
- Follow managed [RULEBOOK.md](./RULEBOOK.md) before adding APIs or shared logic.
