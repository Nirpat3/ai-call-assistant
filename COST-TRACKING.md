# Cost Tracking

## Purpose
This repository must track usage and cost events in an append-only model so billing and analytics are reproducible.

## Minimum Requirements
1. Every billable event must include a unique idempotency key (`event_id`).
2. Metering writes must be append-only and immutable.
3. Usage rows must capture:
   - product
   - feature
   - customer_id
   - usage_count
   - cost_unit
   - total_cost
   - billing_period
   - source_event_id
4. Rollups must be deterministic and replayable from raw metering rows.
5. Duplicate source events must be ignored via a unique constraint on `source_event_id`.

## Validation Checklist
- [ ] API ingests metering with `usage_count` and calculates `total_cost = usage_count * cost_unit`.
- [ ] Database enforces unique `source_event_id`.
- [ ] Rollup job aggregates from raw usage rows, not from ad hoc counters.
- [ ] Admin endpoint exists to trigger rollup/invoice generation manually.
- [ ] Test coverage includes duplicate-event idempotency.
