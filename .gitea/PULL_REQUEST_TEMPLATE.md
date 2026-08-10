# Pull Request Checklist

## Summary

## Problem Statement

<!-- State the concrete user, product, operational, or internal platform problem. -->

## Acceptance Criteria

- [ ] <!-- Objective criterion verified by a test, command, preview, screenshot, log, metric, or named human review. -->

## Risk Tier

- [ ] Routine - copy, styling, config behind a flag
- [ ] Notable - endpoint, schema, dependency, shared behavior
- [ ] Risky - auth, payments, PII, migration, irreversible operation

## Effects Class

- [ ] none/read - inspection only
- [ ] write - changes files or repo state
- [ ] irreversible - cannot be safely undone without human approval

## Gitea CI/CD Checks

- [ ] **Gitea Actions Status:** Verify that the Gitea Actions workflow passes without failures.
- [ ] **Runner Logs:** Check the runner console logs for any hidden warnings or compilation errors.
- [ ] **Artifacts:** Ensure all build artifacts (compiled code, binaries) are generated correctly.

---

## Frontend Checks

- [ ] **UI & Layout:** Verified responsive design across mobile, tablet, and desktop screen sizes.
- [ ] **Console Errors:** Opened browser dev tools and confirmed zero red console errors.
- [ ] **Linting & Formatting:** Ran local linters (ESLint/Prettier) and fixed all style issues.
- [ ] **Form Validation:** Tested user inputs to ensure error messages trigger correctly.
- [ ] **Unit Tests:** Ran frontend tests (Jest/Vitest) and all specs passed.

---

## Backend Checks

- [ ] **API Endpoints:** Tested URLs manually (Postman/Insomnia) and verified JSON structures.
- [ ] **Database Migrations:** Created and tested migration scripts locally; data remains safe.
- [ ] **Error Handling:** Confirmed proper HTTP status codes return on bad or missing inputs.
- [ ] **Security:** Verified passwords/tokens are secure and private routes are blocked.
- [ ] **Integration Tests:** Ran backend test suites and verified database connections work.

---

## Full-Stack & Integration Checks

- [ ] **End-to-End Flow:** Walked through the complete user action from screen to database.
- [ ] **CORS Rules:** Updated settings so frontend can talk to backend without origin blocks.
- [ ] **Environment Variables:** Verified all local secret keys match the template `.env.example` file.
- [ ] **Auth Token:** Confirmed login tokens transfer smoothly and securely across the system.

## Architecture Impact

- [ ] R0 - no architecture impact
- [ ] R1 - local module/interface impact
- [ ] R2 - cross-module/service/data-flow impact; ADR or RFC may be required
- [ ] R3 - auth, trust boundary, persistence model, deployment topology, or irreversible migration; ADR and human review required

## Verification Evidence

| Check | Evidence | Result |
| ----- | -------- | ------ |
|       |          |        |

## Human Review

Product/design review: N/A
Domain/security review: N/A
Migration/irreversible approval: N/A

## Rollback / Recovery

<!-- Required for Notable, Risky, R2, R3, or irreversible work. For Routine/R0 work, N/A is acceptable. -->
