# Engineering Rulebook

Rulebook version: `v1.1.0`
Managed by: `dev-bootstrap`

## Mandatory Rules

1. Do not create duplicate APIs.
2. Do not create duplicate business logic in multiple files/services without explicit approval.
3. Reuse existing modules before adding new ones.
4. Every new endpoint must be preceded by a duplication check.
5. Every new shared utility must be preceded by a duplication check.

## Duplicate API Prevention Standard

Before adding an endpoint:

1. Search existing routes:
```bash
rg -n "app\\.(get|post|put|patch|delete)|router\\.(get|post|put|patch|delete)|route\\(" src
```
2. Search API docs/spec:
```bash
rg -n "GET |POST |PUT |PATCH |DELETE " API.md docs
```
3. If an endpoint exists with overlapping purpose, extend it instead of creating a sibling API.
4. If a new endpoint is required, document why existing APIs cannot be extended.

## Duplicate Code Prevention Standard

Before adding new logic:

1. Search for similar names/behavior:
```bash
rg -n "<keyword>|<function_name>|<domain_term>" src
```
2. Prefer extracting shared logic into one reusable module.
3. If intentional duplication is unavoidable (e.g., hard boundary constraints), add a short justification comment and link issue/ADR.

## PR Checklist (Required)

- [ ] I searched for existing API endpoints and confirmed no duplicate contract is introduced.
- [ ] I searched for existing logic and reused/extended it where possible.
- [ ] If duplication remains, I documented explicit justification.

## Sync Policy

`RULEBOOK.md` is a managed file and may be overwritten by org sync tooling.
