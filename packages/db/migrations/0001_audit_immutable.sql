-- Custom SQL migration: auditoria is append-only (NFR-04). TRUNCATE is not covered on purpose
-- (used by tests); production roles must not be granted it.
CREATE FUNCTION auditoria_reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'auditoria is append-only: % is not allowed', TG_OP;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER auditoria_immutable
BEFORE UPDATE OR DELETE ON "auditoria"
FOR EACH ROW EXECUTE FUNCTION auditoria_reject_mutation();
