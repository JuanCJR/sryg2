CREATE TYPE "public"."audit_action" AS ENUM('crear', 'actualizar', 'eliminar', 'autenticar');--> statement-breakpoint
CREATE TYPE "public"."block_status" AS ENUM('activo', 'resuelto');--> statement-breakpoint
CREATE TYPE "public"."block_type" AS ENUM('administrativo', 'medico', 'regulatorio');--> statement-breakpoint
CREATE TYPE "public"."blood_type" AS ENUM('a_pos', 'a_neg', 'b_pos', 'b_neg', 'ab_pos', 'ab_neg', 'o_pos', 'o_neg');--> statement-breakpoint
CREATE TYPE "public"."credential_status" AS ENUM('activa', 'vencida', 'bloqueada');--> statement-breakpoint
CREATE TYPE "public"."personnel_status" AS ENUM('activo', 'inactivo');--> statement-breakpoint
CREATE TYPE "public"."rav60_category" AS ENUM('piloto_transporte_linea', 'piloto_comercial', 'piloto_privado', 'tripulante_cabina', 'tecnico_mantenimiento', 'controlador_transito_aereo');--> statement-breakpoint
CREATE TYPE "public"."rav67_class" AS ENUM('clase_1', 'clase_2', 'clase_3');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('administrador', 'supervisor', 'consulta');--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_aeronautico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cedula" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"blood_type" "blood_type",
	"cargo" text,
	"dependencia" text,
	"category" "rav60_category",
	"status" "personnel_status" DEFAULT 'activo' NOT NULL,
	"photo_ref" text,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_aeronautico_cedula_unique" UNIQUE("cedula"),
	CONSTRAINT "personal_aeronautico_cedula_format" CHECK ("personal_aeronautico"."cedula" ~ '^[0-9]{6,9}$')
);
--> statement-breakpoint
CREATE TABLE "certificado_medico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personal_id" uuid NOT NULL,
	"rav67_class" "rav67_class" NOT NULL,
	"issue_date" date NOT NULL,
	"expiry_date" date NOT NULL,
	"restrictions" text,
	"status" "credential_status" DEFAULT 'activa' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificado_medico_dates_order" CHECK ("certificado_medico"."expiry_date" > "certificado_medico"."issue_date")
);
--> statement-breakpoint
CREATE TABLE "habilitacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"licencia_id" uuid NOT NULL,
	"type" text NOT NULL,
	"issue_date" date NOT NULL,
	"expiry_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habilitacion_dates_order" CHECK ("habilitacion"."expiry_date" > "habilitacion"."issue_date")
);
--> statement-breakpoint
CREATE TABLE "licencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personal_id" uuid NOT NULL,
	"rav60_category" "rav60_category" NOT NULL,
	"issue_date" date NOT NULL,
	"expiry_date" date NOT NULL,
	"status" "credential_status" DEFAULT 'activa' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "licencia_dates_order" CHECK ("licencia"."expiry_date" > "licencia"."issue_date")
);
--> statement-breakpoint
CREATE TABLE "bloqueo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personal_id" uuid NOT NULL,
	"type" "block_type" NOT NULL,
	"reason" text NOT NULL,
	"status" "block_status" DEFAULT 'activo' NOT NULL,
	"created_by" uuid NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bloqueo_resolution_consistency" CHECK (("bloqueo"."status" = 'resuelto') = ("bloqueo"."resolved_by" is not null and "bloqueo"."resolved_at" is not null)
        and ("bloqueo"."resolved_by" is null) = ("bloqueo"."resolved_at" is null))
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auditoria_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid,
	"action" "audit_action" NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"changes" jsonb,
	"request_id" text
);
--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD CONSTRAINT "personal_aeronautico_created_by_usuario_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD CONSTRAINT "personal_aeronautico_updated_by_usuario_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificado_medico" ADD CONSTRAINT "certificado_medico_personal_id_personal_aeronautico_id_fk" FOREIGN KEY ("personal_id") REFERENCES "public"."personal_aeronautico"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habilitacion" ADD CONSTRAINT "habilitacion_licencia_id_licencia_id_fk" FOREIGN KEY ("licencia_id") REFERENCES "public"."licencia"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licencia" ADD CONSTRAINT "licencia_personal_id_personal_aeronautico_id_fk" FOREIGN KEY ("personal_id") REFERENCES "public"."personal_aeronautico"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueo" ADD CONSTRAINT "bloqueo_personal_id_personal_aeronautico_id_fk" FOREIGN KEY ("personal_id") REFERENCES "public"."personal_aeronautico"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueo" ADD CONSTRAINT "bloqueo_created_by_usuario_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueo" ADD CONSTRAINT "bloqueo_resolved_by_usuario_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_actor_id_usuario_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "usuario_email_lower_key" ON "usuario" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "personal_aeronautico_full_name_lower_idx" ON "personal_aeronautico" USING btree (lower("full_name"));--> statement-breakpoint
CREATE INDEX "certificado_medico_personal_id_idx" ON "certificado_medico" USING btree ("personal_id");--> statement-breakpoint
CREATE INDEX "certificado_medico_expiry_date_idx" ON "certificado_medico" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "habilitacion_licencia_id_idx" ON "habilitacion" USING btree ("licencia_id");--> statement-breakpoint
CREATE INDEX "habilitacion_expiry_date_idx" ON "habilitacion" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "licencia_personal_id_idx" ON "licencia" USING btree ("personal_id");--> statement-breakpoint
CREATE INDEX "licencia_expiry_date_idx" ON "licencia" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "bloqueo_personal_activo_idx" ON "bloqueo" USING btree ("personal_id") WHERE "bloqueo"."status" = 'activo';--> statement-breakpoint
CREATE INDEX "auditoria_entity_idx" ON "auditoria" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "auditoria_actor_occurred_idx" ON "auditoria" USING btree ("actor_id","occurred_at" desc);--> statement-breakpoint
CREATE INDEX "auditoria_occurred_idx" ON "auditoria" USING btree ("occurred_at" desc);