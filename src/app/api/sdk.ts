export type ApiEnvelope<T> = {
  data: T;
  meta?: {
    freshness?: {
      generatedAt?: string;
      lastSuccessfulRefreshAt?: string;
      staleAfterSeconds?: number;
      isStale?: boolean;
    };
    reliability?: {
      score?: number;
      tier?: "high" | "medium" | "low";
      sourceQualityScore?: number;
      methodologyVersion?: string;
    };
    provenance?: {
      source?: string;
      sourceType?: string;
      fallback?: {
        used?: boolean;
        reason?: string | null;
      };
    };
  };
};

export type WorkspaceBucket =
  | "scenarioOutputs"
  | "alertConfigs"
  | "customThresholds"
  | "schedulesHistory"
  | "advancedPrefs";

export type WorkspaceArtifact<T = unknown> = {
  artifactId: string;
  userId: string;
  workspaceId: string;
  ownerUserId: string;
  ownershipRole: string;
  artifactType: string;
  artifactKey: string;
  version: number;
  isDeleted: boolean;
  payload: T;
  createdAt: string;
  traceId: string | null;
};

export type ComplianceSummary = {
  privacyPolicyUrl: string | null;
  termsOfUseUrl: string | null;
  dataRetentionDays: number;
  endpoints: {
    health: string;
    readiness: string;
    auditTrail: string;
    incidents: string;
    observability: string;
  };
  timestamp: string;
};

export type ApiClientOptions = {
  baseUrl?: string;
  getHeaders?: () => HeadersInit;
};

const DEFAULT_BASE_URL = "http://localhost:5001";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const getHeaders = options.getHeaders || (() => ({}));

  return {
    async putWorkspaceState<TPayload>(
      bucket: WorkspaceBucket,
      artifactKey: string,
      payload: TPayload,
      expectedVersion?: number
    ): Promise<WorkspaceArtifact<TPayload>> {
      const response = await fetch(`${baseUrl}/api/workspace/state/${bucket}/${artifactKey}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify({
          payload,
          ...(typeof expectedVersion === "number" ? { expectedVersion } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`Workspace state PUT failed with status ${response.status}`);
      }

      const json = await response.json();
      return json.artifact as WorkspaceArtifact<TPayload>;
    },

    async getComplianceSummary(): Promise<ComplianceSummary> {
      const response = await fetch(`${baseUrl}/api/compliance`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Compliance fetch failed with status ${response.status}`);
      }

      return parseJson<ComplianceSummary>(response);
    },
  };
}
