# Users module

Users and their role and area (D24): Admin-only administration of `/api/users` (AUTH-06, D1, D14) — list, create, edit name/role/area, activate/deactivate and reset the password. Create and reset answer a temporary password once and set `must_change_password` (D4). The last active Admin can be neither deactivated nor demoted (409). Every write is audited in the same transaction (BR-11). The change of the user's own password and the access log (D23) live in the auth module.
