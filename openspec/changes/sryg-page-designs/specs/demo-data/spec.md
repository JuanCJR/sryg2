# Demo Data Specification

## Purpose

Every feature in this change reads from deterministic mock data instead of a backend, following the `personnel` feature's existing precedent. This spec defines the convention so that connecting the real backend later is a one-module swap behind each feature's container, never a change to components or pages.

## Requirements

### Requirement: One Data Module Per Feature

Each feature MUST expose its mock data through exactly one module at `src/features/<feature>/data/demoData.ts`, mirroring the structure already used by `src/features/personnel/data/demoData.ts`.

#### Scenario: A new feature has a single data module

- GIVEN the `licenses` feature is created for page 6
- WHEN its data is defined
- THEN it lives at `src/features/licenses/data/demoData.ts`
- AND no other file in the feature defines mock records

### Requirement: Data Generation Is Deterministic

Mock data generation MUST NOT use `Math.random` or any other non-deterministic source, and MUST NOT compute dates relative to "now" without a fixed seed/reference date. The same module MUST produce the same data on every run.

#### Scenario: Two runs produce identical data

- GIVEN a feature's `demoData.ts` module
- WHEN it is imported and evaluated twice (e.g., in two separate test runs or app loads)
- THEN the resulting records are byte-for-byte identical

#### Scenario: Expiry-relative data uses a fixed reference date

- GIVEN a feature needs "near-expiry" or "expired" demo records for status badges
- WHEN those records are generated
- THEN their dates are computed relative to a fixed, explicit reference date constant defined in the module
- AND the module does not call `Date.now()` or `new Date()` with no arguments to derive record content

### Requirement: DEMO_*_ID Constants Identify Default Entities

Each feature's data module MUST export one or more `DEMO_*_ID` constants identifying the entity (or entities) the router or a container defaults to, following the existing `DEMO_PERSON_ID` pattern.

#### Scenario: A feature exports its default demo ID

- GIVEN the `licenses` feature's data module
- WHEN another module needs a default license to display
- THEN it imports a constant such as `DEMO_LICENSE_ID` from `demoData.ts`
- AND does not hardcode the identifier inline elsewhere

### Requirement: Domain Types Are Separate From Data

Each feature MUST define its domain types in `src/features/<feature>/domain/types.ts` (or an equivalent `domain/` module), separate from the data module. The data module MUST import types from `domain/`, not define them inline.

#### Scenario: Types live in domain, not in data

- GIVEN a feature's demo data uses a `LicenseStatus` type
- WHEN the type is defined
- THEN it is declared in `src/features/<feature>/domain/types.ts` (or a sibling `domain/` file)
- AND `demoData.ts` imports it rather than redeclaring it

### Requirement: Only Containers Import The Data Module

Within a feature, only `containers/` MUST import from `data/demoData.ts`. Presentational `components/` and route-level `pages/` MUST NOT import the data module directly; they receive data as props from their container.

#### Scenario: A component receives data as props, not by importing demoData

- GIVEN a presentational list component for the Listado page
- WHEN it needs personnel records
- THEN it receives them via props from its container
- AND it does not import `demoData.ts` itself

#### Scenario: Swapping the backend touches only the container's data source

- GIVEN a feature's container currently imports from `demoData.ts`
- WHEN the backend is connected later
- THEN only the container's import changes (from `demoData.ts` to a real data-fetching module)
- AND no component or page file requires any change
