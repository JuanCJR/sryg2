CREATE TYPE "public"."alert_kind" AS ENUM('vencida', 'proxima');--> statement-breakpoint
CREATE TYPE "public"."credential_kind" AS ENUM('licencia', 'habilitacion_tipo', 'habilitacion_clase', 'certificado_medico');--> statement-breakpoint
CREATE TYPE "public"."graphic_resource_kind" AS ENUM('logo_inac', 'firma_presidente');--> statement-breakpoint
CREATE TYPE "public"."user_area" AS ENUM('licencias', 'medicina', 'ambas');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'emitir';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'renovar';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'bloquear';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'resolver';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'reconocer';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'exportar';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'restablecer_contrasena';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'adjuntar';--> statement-breakpoint
CREATE TABLE "catalog_aircraft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_attachment_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_class_rating" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_document_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_function" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_license_observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_license_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rav60_category" "rav60_category" NOT NULL,
	"required_medical_class" "rav67_class",
	"applies_expiry" boolean DEFAULT true NOT NULL,
	"validity_months" integer,
	"validity_is_placeholder" boolean DEFAULT true NOT NULL,
	CONSTRAINT "catalog_license_type_validity_positive" CHECK ("catalog_license_type"."validity_months" is null or "catalog_license_type"."validity_months" > 0)
);
--> statement-breakpoint
CREATE TABLE "catalog_medical_observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_nationality" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_type_rating" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_es" text NOT NULL,
	"name_en" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_adjunto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personal_id" uuid NOT NULL,
	"attachment_type_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL,
	"size" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_adjunto_size" CHECK ("personal_adjunto"."size" = octet_length("personal_adjunto"."data") and "personal_adjunto"."size" between 1 and 5242880)
);
--> statement-breakpoint
CREATE TABLE "certificado_observacion" (
	"certificado_medico_id" uuid NOT NULL,
	"observation_id" uuid NOT NULL,
	CONSTRAINT "certificado_observacion_certificado_medico_id_observation_id_pk" PRIMARY KEY("certificado_medico_id","observation_id")
);
--> statement-breakpoint
CREATE TABLE "habilitacion_clase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"licencia_id" uuid NOT NULL,
	"class_rating_id" uuid NOT NULL,
	"expiry_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habilitacion_clase_aeronave" (
	"habilitacion_clase_id" uuid NOT NULL,
	"aircraft_id" uuid NOT NULL,
	CONSTRAINT "habilitacion_clase_aeronave_habilitacion_clase_id_aircraft_id_pk" PRIMARY KEY("habilitacion_clase_id","aircraft_id")
);
--> statement-breakpoint
CREATE TABLE "habilitacion_tipo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"licencia_id" uuid NOT NULL,
	"type_rating_id" uuid NOT NULL,
	"function_id" uuid NOT NULL,
	"expiry_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licencia_observacion" (
	"licencia_id" uuid NOT NULL,
	"observation_id" uuid NOT NULL,
	CONSTRAINT "licencia_observacion_licencia_id_observation_id_pk" PRIMARY KEY("licencia_id","observation_id")
);
--> statement-breakpoint
CREATE TABLE "parametro_sistema" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"is_placeholder" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurso_grafico" (
	"kind" "graphic_resource_kind" PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"mime" text NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personal_id" uuid NOT NULL,
	"credential_kind" "credential_kind" NOT NULL,
	"credential_id" uuid NOT NULL,
	"kind" "alert_kind" NOT NULL,
	"due_date" date NOT NULL,
	"acknowledged_by" uuid,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alerta_credential_kind_key" UNIQUE("credential_id","kind"),
	CONSTRAINT "alerta_acknowledgement" CHECK (("alerta"."acknowledged_by" is null) = ("alerta"."acknowledged_at" is null))
);
--> statement-breakpoint
CREATE TABLE "acceso_usuario" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "acceso_usuario_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"usuario_id" uuid,
	"identifier" text NOT NULL,
	"ip" text,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "habilitacion" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "habilitacion" CASCADE;--> statement-breakpoint
ALTER TABLE "licencia" DROP CONSTRAINT "licencia_dates_order";--> statement-breakpoint
DROP INDEX "personal_aeronautico_full_name_lower_idx";--> statement-breakpoint
ALTER TABLE "licencia" ALTER COLUMN "expiry_date" DROP NOT NULL;--> statement-breakpoint
-- Custom: existing users (e.g. the seeded admin) get area "ambas"; new rows must name one.
ALTER TABLE "usuario" ADD COLUMN "area" "user_area" DEFAULT 'ambas' NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario" ALTER COLUMN "area" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD COLUMN "first_names" text;--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD COLUMN "last_names" text;--> statement-breakpoint
-- Custom: full_name cannot be split reliably, so it is kept whole in first_names for existing rows.
UPDATE "personal_aeronautico" SET "first_names" = "full_name", "last_names" = '';--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ALTER COLUMN "first_names" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ALTER COLUMN "last_names" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD COLUMN "document_type_id" uuid;--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD COLUMN "nationality_id" uuid;--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD COLUMN "photo" "bytea";--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD COLUMN "photo_mime" text;--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD COLUMN "signature" "bytea";--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD COLUMN "signature_mime" text;--> statement-breakpoint
ALTER TABLE "certificado_medico" ADD COLUMN "number" text;--> statement-breakpoint
-- Custom (D22): the certificate number defaults to the holder's document number.
UPDATE "certificado_medico" c SET "number" = p."cedula" FROM "personal_aeronautico" p WHERE p."id" = c."personal_id";--> statement-breakpoint
ALTER TABLE "certificado_medico" ALTER COLUMN "number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "certificado_medico" ADD COLUMN "verification_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "licencia" ADD COLUMN "license_type_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "licencia" ADD COLUMN "number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "licencia" ADD COLUMN "verification_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_adjunto" ADD CONSTRAINT "personal_adjunto_personal_id_personal_aeronautico_id_fk" FOREIGN KEY ("personal_id") REFERENCES "public"."personal_aeronautico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_adjunto" ADD CONSTRAINT "personal_adjunto_attachment_type_id_catalog_attachment_type_id_fk" FOREIGN KEY ("attachment_type_id") REFERENCES "public"."catalog_attachment_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_adjunto" ADD CONSTRAINT "personal_adjunto_created_by_usuario_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificado_observacion" ADD CONSTRAINT "certificado_observacion_certificado_medico_id_certificado_medico_id_fk" FOREIGN KEY ("certificado_medico_id") REFERENCES "public"."certificado_medico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificado_observacion" ADD CONSTRAINT "certificado_observacion_observation_id_catalog_medical_observation_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."catalog_medical_observation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habilitacion_clase" ADD CONSTRAINT "habilitacion_clase_licencia_id_licencia_id_fk" FOREIGN KEY ("licencia_id") REFERENCES "public"."licencia"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habilitacion_clase" ADD CONSTRAINT "habilitacion_clase_class_rating_id_catalog_class_rating_id_fk" FOREIGN KEY ("class_rating_id") REFERENCES "public"."catalog_class_rating"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habilitacion_clase_aeronave" ADD CONSTRAINT "habilitacion_clase_aeronave_habilitacion_clase_id_habilitacion_clase_id_fk" FOREIGN KEY ("habilitacion_clase_id") REFERENCES "public"."habilitacion_clase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habilitacion_clase_aeronave" ADD CONSTRAINT "habilitacion_clase_aeronave_aircraft_id_catalog_aircraft_id_fk" FOREIGN KEY ("aircraft_id") REFERENCES "public"."catalog_aircraft"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habilitacion_tipo" ADD CONSTRAINT "habilitacion_tipo_licencia_id_licencia_id_fk" FOREIGN KEY ("licencia_id") REFERENCES "public"."licencia"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habilitacion_tipo" ADD CONSTRAINT "habilitacion_tipo_type_rating_id_catalog_type_rating_id_fk" FOREIGN KEY ("type_rating_id") REFERENCES "public"."catalog_type_rating"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habilitacion_tipo" ADD CONSTRAINT "habilitacion_tipo_function_id_catalog_function_id_fk" FOREIGN KEY ("function_id") REFERENCES "public"."catalog_function"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licencia_observacion" ADD CONSTRAINT "licencia_observacion_licencia_id_licencia_id_fk" FOREIGN KEY ("licencia_id") REFERENCES "public"."licencia"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licencia_observacion" ADD CONSTRAINT "licencia_observacion_observation_id_catalog_license_observation_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."catalog_license_observation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parametro_sistema" ADD CONSTRAINT "parametro_sistema_updated_by_usuario_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurso_grafico" ADD CONSTRAINT "recurso_grafico_updated_by_usuario_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_personal_id_personal_aeronautico_id_fk" FOREIGN KEY ("personal_id") REFERENCES "public"."personal_aeronautico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_acknowledged_by_usuario_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."usuario"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceso_usuario" ADD CONSTRAINT "acceso_usuario_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_aircraft_name_es_lower_key" ON "catalog_aircraft" USING btree (lower("name_es"));--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_attachment_type_name_es_lower_key" ON "catalog_attachment_type" USING btree (lower("name_es"));--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_class_rating_name_es_lower_key" ON "catalog_class_rating" USING btree (lower("name_es"));--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_document_type_name_es_lower_key" ON "catalog_document_type" USING btree (lower("name_es"));--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_function_name_es_lower_key" ON "catalog_function" USING btree (lower("name_es"));--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_license_observation_name_es_lower_key" ON "catalog_license_observation" USING btree (lower("name_es"));--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_license_type_name_es_lower_key" ON "catalog_license_type" USING btree (lower("name_es"));--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_medical_observation_name_es_lower_key" ON "catalog_medical_observation" USING btree (lower("name_es"));--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_nationality_name_es_lower_key" ON "catalog_nationality" USING btree (lower("name_es"));--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_type_rating_name_es_lower_key" ON "catalog_type_rating" USING btree (lower("name_es"));--> statement-breakpoint
CREATE INDEX "personal_adjunto_personal_id_idx" ON "personal_adjunto" USING btree ("personal_id");--> statement-breakpoint
CREATE INDEX "habilitacion_clase_licencia_id_idx" ON "habilitacion_clase" USING btree ("licencia_id");--> statement-breakpoint
CREATE INDEX "habilitacion_clase_expiry_date_idx" ON "habilitacion_clase" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "habilitacion_tipo_licencia_id_idx" ON "habilitacion_tipo" USING btree ("licencia_id");--> statement-breakpoint
CREATE INDEX "habilitacion_tipo_expiry_date_idx" ON "habilitacion_tipo" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "alerta_personal_id_idx" ON "alerta" USING btree ("personal_id");--> statement-breakpoint
CREATE INDEX "alerta_due_date_idx" ON "alerta" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "acceso_usuario_usuario_created_idx" ON "acceso_usuario" USING btree ("usuario_id","created_at" desc);--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD CONSTRAINT "personal_aeronautico_document_type_id_catalog_document_type_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."catalog_document_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD CONSTRAINT "personal_aeronautico_nationality_id_catalog_nationality_id_fk" FOREIGN KEY ("nationality_id") REFERENCES "public"."catalog_nationality"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licencia" ADD CONSTRAINT "licencia_license_type_id_catalog_license_type_id_fk" FOREIGN KEY ("license_type_id") REFERENCES "public"."catalog_license_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personal_aeronautico_names_lower_idx" ON "personal_aeronautico" USING btree (lower("last_names"),lower("first_names"));--> statement-breakpoint
CREATE INDEX "licencia_license_type_id_idx" ON "licencia" USING btree ("license_type_id");--> statement-breakpoint
CREATE INDEX "licencia_number_idx" ON "licencia" USING btree ("number");--> statement-breakpoint
ALTER TABLE "personal_aeronautico" DROP COLUMN "full_name";--> statement-breakpoint
ALTER TABLE "personal_aeronautico" DROP COLUMN "photo_ref";--> statement-breakpoint
ALTER TABLE "licencia" DROP COLUMN "rav60_category";--> statement-breakpoint
ALTER TABLE "certificado_medico" ADD CONSTRAINT "certificado_medico_verification_token_unique" UNIQUE("verification_token");--> statement-breakpoint
ALTER TABLE "licencia" ADD CONSTRAINT "licencia_verification_token_unique" UNIQUE("verification_token");--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD CONSTRAINT "personal_aeronautico_photo_mime" CHECK (("personal_aeronautico"."photo" is null) = ("personal_aeronautico"."photo_mime" is null));--> statement-breakpoint
ALTER TABLE "personal_aeronautico" ADD CONSTRAINT "personal_aeronautico_signature_mime" CHECK (("personal_aeronautico"."signature" is null) = ("personal_aeronautico"."signature_mime" is null));--> statement-breakpoint
ALTER TABLE "licencia" ADD CONSTRAINT "licencia_dates_order" CHECK ("licencia"."expiry_date" is null or "licencia"."expiry_date" > "licencia"."issue_date");--> statement-breakpoint
-- Custom (D3): placeholders until INAC supplies the values; keys match @sryg/types settings.ts.
INSERT INTO "parametro_sistema" ("key", "value", "is_placeholder") VALUES
	('alerts.threshold_days', '30', true),
	('medical.validity_months.clase_1', '12', true),
	('medical.validity_months.clase_2', '12', true),
	('medical.validity_months.clase_3', '12', true)
ON CONFLICT ("key") DO NOTHING;
