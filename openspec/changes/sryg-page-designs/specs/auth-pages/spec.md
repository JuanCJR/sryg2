# Auth Pages Specification

## Purpose

Login (page 1) and Perfil / cambio de contraseña (page 14) are the two account-related pages. Both are mocked: Login enters the shell without real authentication, and Perfil changes a password without a real backend. Their content follows `design-brief-runbook.md` §6.

## Requirements

### Requirement: Login Authenticates And Routes Into The Shell (Mocked)

The system MUST render a Login page on `AuthTemplate` that accepts email/username and password, and on submit routes the user into `AppShell` under a selected demo role. The system MUST NOT implement real authentication, session persistence, or password verification; submission is a mock that always succeeds unless the demo credentials are deliberately invalid (to exercise the error state).

#### Scenario: Valid mock submission enters the shell

- GIVEN a user on the Login page enters the demo-valid credentials
- WHEN they submit the form
- THEN the app navigates into `AppShell` under the corresponding demo role
- AND no network call is made

#### Scenario: Invalid mock submission shows an error

- GIVEN a user enters credentials that the mock treats as invalid
- WHEN they submit the form
- THEN the page shows the error state (invalid credentials) via `AlertBanner`
- AND the user remains on the Login page

#### Scenario: Login covers its required states

- GIVEN the Login page
- WHEN it is exercised end to end
- THEN it renders the empty (initial), loading (submitting), error (invalid credentials / locked account), and success (redirect) states described in runbook §6

### Requirement: Login's Forgot-Password Affordance Is Pending Q3

Whether Login includes a "forgot password" link, and if so what it does, is not decided by this spec (open question Q3). The system MUST implement one of two states pending that decision and MUST NOT invent a recovery flow beyond what Q3 resolves to.

#### Scenario: No decision yet — link is omitted

- GIVEN Q3 has not been answered when the Login slice is built
- WHEN the page ships
- THEN Login does not render a "forgot password" link
- AND no recovery route or task is created

#### Scenario: Q3 resolves to add recovery

- GIVEN Q3 is later answered in favor of a recovery flow
- WHEN that decision is implemented
- THEN Login renders a "forgot password" link
- AND it links to a recovery page built in a subsequent, explicitly scoped slice — not invented ahead of the decision

### Requirement: Profile Page Shows Own Account Info And Password Change

The system MUST render a Perfil page on `FormPageTemplate`, accessible to all roles, showing the signed-in user's own email and role (read-only) and last login, with an action to change their own password.

#### Scenario: Profile shows read-only account fields

- GIVEN any signed-in demo role
- WHEN they open Perfil
- THEN their email, role, and last login are displayed as read-only fields
- AND no other user's data is shown

#### Scenario: Password change succeeds (mocked)

- GIVEN a user on Perfil submits a new password
- WHEN the form is submitted with valid input
- THEN the page shows the success state confirming the change
- AND no network call is made

#### Scenario: Profile covers its required states

- GIVEN the Perfil page
- WHEN it is exercised end to end
- THEN it renders the loading, error, and success states described in runbook §6
