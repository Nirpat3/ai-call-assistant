# Versioning Standard

## Goal
Use one environment-aware version format across dev, QA, beta, and production.

## Format
- `dev`: `X.Y.Z-dev.N`
- `qa`: `X.Y.Z-qa.N`
- `beta`: `X.Y.Z-beta.N`
- `prod`: `X.Y.Z`

## Commands
```bash
scripts/version.sh dev patch
scripts/version.sh qa patch
scripts/version.sh beta minor
scripts/version.sh prod patch
```

## Rules
1. Always bump before deploy.
2. `prod` versions must not include prerelease suffixes.
3. The canonical value is stored in `.version`.
4. If `package.json` exists, its `version` must match `.version`.
