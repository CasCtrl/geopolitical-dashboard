const API_BASE_URL = "http://localhost:5001";

export type WorkspaceBucket =
  | "scenarioOutputs"
  | "alertConfigs"
  | "customThresholds"
  | "schedulesHistory"
  | "advancedPrefs";

function defaultHeaders(): HeadersInit {
  const userId = typeof window !== "undefined" ? localStorage.getItem("dashboard.userId") : null;
  const workspaceId = typeof window !== "undefined" ? localStorage.getItem("dashboard.workspaceId") : null;

  return {
    "Content-Type": "application/json",
    ...(userId ? { "x-user-id": userId } : {}),
    ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
  };
}

export async function putWorkspaceState(
  bucket: WorkspaceBucket,
  artifactKey: string,
  payload: unknown,
  expectedVersion?: number
): Promise<number | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/workspace/state/${bucket}/${artifactKey}`, {
      method: "PUT",
      headers: defaultHeaders(),
      body: JSON.stringify({
        payload,
        ...(typeof expectedVersion === "number" ? { expectedVersion } : {}),
      }),
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    return typeof json?.artifact?.version === "number" ? json.artifact.version : null;
  } catch {
    return null;
  }
}
