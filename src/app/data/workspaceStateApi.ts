import { createApiClient, type WorkspaceBucket } from "../api/sdk";

function defaultHeaders(): HeadersInit {
  const userId = typeof window !== "undefined" ? localStorage.getItem("dashboard.userId") : null;
  const workspaceId = typeof window !== "undefined" ? localStorage.getItem("dashboard.workspaceId") : null;

  return {
    "Content-Type": "application/json",
    ...(userId ? { "x-user-id": userId } : {}),
    ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
  };
}

const api = createApiClient({ getHeaders: defaultHeaders });

export async function putWorkspaceState(
  bucket: WorkspaceBucket,
  artifactKey: string,
  payload: unknown,
  expectedVersion?: number
): Promise<number | null> {
  try {
    const artifact = await api.putWorkspaceState(bucket, artifactKey, payload, expectedVersion);
    return typeof artifact.version === "number" ? artifact.version : null;
  } catch {
    return null;
  }
}
