import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  mode: text("mode").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const briefs = pgTable("briefs", {
  projectId: text("project_id").primaryKey(),
  goal: text("goal").notNull(),
  audience: text("audience").notNull(),
  siteConstraints: jsonb("site_constraints").$type<string[]>().notNull(),
  mustPreserve: jsonb("must_preserve").$type<string[]>().notNull(),
  mayChange: jsonb("may_change").$type<string[]>().notNull(),
  outputRequirements: jsonb("output_requirements").$type<string[]>().notNull(),
});

export const assets = pgTable("assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  kind: text("kind").notNull(),
  source: text("source").notNull(),
  url: text("url").notNull(),
  sha256: text("sha256").notNull(),
  rightsNote: text("rights_note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const directions = pgTable("directions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  lane: text("lane").notNull(),
  label: text("label").notNull(),
  rationale: text("rationale").notNull(),
  prompt: text("prompt").notNull(),
  modelId: text("model_id").notNull(),
  parametersJson: jsonb("parameters_json")
    .$type<Record<string, unknown>>()
    .notNull(),
  status: text("status").notNull(),
  jobId: text("job_id"),
});

export const generationJobs = pgTable("generation_jobs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  directionId: text("direction_id").notNull(),
  provider: text("provider").notNull(),
  providerJobId: text("provider_job_id").notNull(),
  providerStatus: text("provider_status").notNull(),
  requestHash: text("request_hash").notNull(),
  attempt: integer("attempt").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  resultUrls: jsonb("result_urls").$type<string[]>().notNull(),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
});

export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  decision: text("decision").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const fieldNotes = pgTable("field_notes", {
  projectId: text("project_id").primaryKey(),
  clientGoal: text("client_goal").notNull(),
  workflowObserved: text("workflow_observed").notNull(),
  workedWell: jsonb("worked_well").$type<string[]>().notNull(),
  friction: jsonb("friction").$type<string[]>().notNull(),
  failureReproduction: jsonb("failure_reproduction")
    .$type<string[]>()
    .notNull(),
  productOpportunity: jsonb("product_opportunity").$type<string[]>().notNull(),
  evidenceLinks: jsonb("evidence_links").$type<string[]>().notNull(),
  author: text("author").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const webhookReceipts = pgTable("webhook_receipts", {
  id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  provider: text("provider").notNull(),
  providerJobId: text("provider_job_id").notNull(),
  status: text("status").notNull(),
  payloadHash: text("payload_hash").notNull(),
  duplicate: boolean("duplicate").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
});
