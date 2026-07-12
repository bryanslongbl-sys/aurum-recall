// ContextNode / ContextMap — the data model for the memory lattice.
// A node is a context ROUTER (metadata + summary + pointers), not the content itself.

export type ContextColor =
  | "gold" | "blue" | "green" | "red" | "purple" | "white" | "gray" | "cyan" | "orange";

export type TrustLevel =
  | "user_verified" | "source_backed" | "ai_inferred" | "disputed" | "stale" | "unknown";

export type PrivacyLevel = "public" | "private" | "sensitive" | "locked";

export interface ContextMarker {
  kind: string;          // "qr" | "datamatrix" | "aruco" | "svgid" | ...
  payload: string;       // e.g. "ctx://ctx_root"
}

export interface ContextNode {
  id: string;
  parent_id?: string | null;
  label: string;
  type: string;
  color: ContextColor;
  path: string;
  summary: string;
  children?: string[];
  source_paths?: string[];
  embedding_refs?: string[];
  created_at?: string;
  updated_at?: string;
  last_verified?: string;
  verified_by?: string;
  trust_level: TrustLevel;
  staleness_score?: number;   // 0..1
  privacy_level: PrivacyLevel;
  access?: Record<string, unknown>;
  marker?: ContextMarker;
}

export interface ContextMap {
  version: string;
  root_id: string;
  title: string;
  description?: string;
  nodes: ContextNode[];
}
