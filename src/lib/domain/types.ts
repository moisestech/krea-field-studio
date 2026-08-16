export const KREA_JOB_STATES = [
  "backlogged",
  "queued",
  "scheduled",
  "processing",
  "sampling",
  "intermediate-complete",
  "completed",
  "failed",
  "cancelled",
] as const;

export type KreaJobState = (typeof KREA_JOB_STATES)[number];

export const TERMINAL_STATES: readonly KreaJobState[] = [
  "completed",
  "failed",
  "cancelled",
];

export type UiJobGroup = "Waiting" | "Generating" | "Finished";

export function uiGroupFor(status: KreaJobState): UiJobGroup {
  if (status === "backlogged" || status === "queued" || status === "scheduled")
    return "Waiting";
  if (
    status === "processing" ||
    status === "sampling" ||
    status === "intermediate-complete"
  ) {
    return "Generating";
  }
  return "Finished";
}

export const PROJECT_STATUSES = [
  "draft",
  "plan_ready",
  "generating",
  "review_ready",
  "approved",
  "exported",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ["plan_ready"],
  plan_ready: ["generating", "draft"],
  generating: ["review_ready", "plan_ready"],
  review_ready: ["approved", "generating"],
  approved: ["exported", "generating"],
  exported: [],
};

export function assertTransition(from: ProjectStatus, to: ProjectStatus): void {
  if (!PROJECT_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid project transition: ${from} → ${to}`);
  }
}

export type ProjectMode = "replay" | "live" | "failure";
export type LaneId = "faithful" | "material" | "surprise";
export type AssetKind =
  "site" | "artwork" | "reference" | "generated" | "motion";
export type AssetSource = "fixture" | "upload" | "krea";
export type DirectionStatus =
  | "proposed"
  | "approved_for_generation"
  | "generated"
  | "selected"
  | "rejected";
export type ApprovalDecision = "approve" | "reject" | "request_changes";
export type ProviderName = "fixture" | "krea";

export type Project = {
  id: string;
  title: string;
  mode: ProjectMode;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type Brief = {
  projectId: string;
  goal: string;
  audience: string;
  siteConstraints: string[];
  mustPreserve: string[];
  mayChange: string[];
  outputRequirements: string[];
};

export type Asset = {
  id: string;
  projectId: string;
  kind: AssetKind;
  source: AssetSource;
  url: string;
  sha256: string;
  rightsNote: string;
  createdAt: string;
};

export type Direction = {
  id: string;
  projectId: string;
  lane: LaneId;
  label: string;
  rationale: string;
  prompt: string;
  modelId: string;
  parametersJson: Record<string, unknown>;
  status: DirectionStatus;
  jobId?: string;
};

export type GenerationJob = {
  id: string;
  projectId: string;
  directionId: string;
  provider: ProviderName;
  providerJobId: string;
  providerStatus: KreaJobState;
  requestHash: string;
  attempt: number;
  submittedAt: string;
  completedAt?: string;
  resultUrls: string[];
  errorCode?: string;
  errorMessage?: string;
};

export type Approval = {
  id: string;
  projectId: string;
  subjectType: "plan" | "direction" | "refinement" | "motion" | "export";
  subjectId: string;
  decision: ApprovalDecision;
  note: string;
  createdAt: string;
};

export type FieldNote = {
  projectId: string;
  clientGoal: string;
  workflowObserved: string;
  workedWell: string[];
  friction: string[];
  failureReproduction: string[];
  productOpportunity: string[];
  evidenceLinks: string[];
  author: string;
  createdAt: string;
};

export type WebhookReceipt = {
  id: string;
  idempotencyKey: string;
  provider: ProviderName;
  providerJobId: string;
  status: KreaJobState;
  payloadHash: string;
  duplicate: boolean;
  receivedAt: string;
};

export type ProjectSnapshot = {
  project: Project;
  brief: Brief;
  assets: Asset[];
  directions: Direction[];
  jobs: GenerationJob[];
  approvals: Approval[];
  fieldNote?: FieldNote;
  receipts: WebhookReceipt[];
};
