# Blocking Management Specification

## Purpose

The Bloqueos page (8) registers impediments and resolves them once solved. It is the one page whose "subject" is the blocked state itself, and resolution is a destructive-pattern action requiring confirmation.

## Requirements

### Requirement: Bloqueos Registers And Lists Impediments

The system MUST render a Bloqueos page on `ListPageTemplate`, showing reason, registration date, status (open/resolved), and resolved-by per record, filterable by status (open/resolved).

#### Scenario: Registering a new block

- GIVEN an Administrador or Supervisor opens Bloqueos
- WHEN they register a new block with a reason
- THEN the new record appears with status "open" and today's registration date

#### Scenario: Filtering to open blocks

- GIVEN Bloqueos has both open and resolved records
- WHEN a user filters by status "open"
- THEN only open records remain visible

### Requirement: Registering A Block Follows The Role Matrix

Per the inventory and `permissions.ts` (`blocking:register`), only Administrador and Supervisor MUST be able to register a block.

#### Scenario: Consulta cannot register a block

- GIVEN a Consulta-role user opens Bloqueos
- WHEN they view the page
- THEN no "register block" action is available to them

### Requirement: Resolving A Block Requires Confirmation And Is Audited

Resolving a block MUST show a confirmation dialog naming the specific consequence in plain language (per runbook §7's destructive-action pattern), and MUST write an audit entry (BR-11) on confirmation.

#### Scenario: Resolve shows a specific-consequence confirmation

- GIVEN an open block on a person's record
- WHEN a user with resolve access initiates "resolve"
- THEN a confirmation dialog names the consequence in plain language, not a generic "are you sure?"
- AND resolving is only completed after that confirmation

#### Scenario: Resolving a block writes an audit entry

- GIVEN a block is resolved
- WHEN the resolution completes
- THEN a corresponding audit entry is recorded in the mock audit data

### Requirement: Resolve Access Is Pending OD-08

Which roles may resolve a block (beyond registering one) is gated by OD-08, an open product decision. The current demo stand-in in `permissions.ts` grants `blocking:resolve` to Administrador and Supervisor. This spec does not change that stand-in; it only requires the resolve action to honor whatever `permissions.ts` currently encodes.

#### Scenario: Resolve honors the current stand-in grant

- GIVEN `permissions.ts` grants `blocking:resolve` to Administrador and Supervisor
- WHEN either role opens a block with "open" status
- THEN they see the "resolve" action
- AND Consulta does not see it

#### Scenario: A future OD-08 resolution changes only permissions.ts

- GIVEN OD-08 is resolved differently later
- WHEN the role matrix is updated
- THEN only `permissions.ts`'s `blocking:resolve` grant changes
- AND no page or component code requires modification

### Requirement: Bloqueos Covers Its Required States

The page MUST render empty, loading, error, success, and blocked (its own subject) states per runbook §6.

#### Scenario: Empty state when no blocks exist

- GIVEN no block records exist in mock data
- WHEN Bloqueos loads
- THEN the empty state is shown instead of a bare empty table
