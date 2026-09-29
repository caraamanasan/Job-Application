export const STATUSES = [
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
] as const;

export type ApplicationStatus = (typeof STATUSES)[number];

export type Application = {
  id: number;
  company: string;
  role: string;
  job_url: string | null;
  date_applied: string;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationInput = Partial<
  Pick<Application, "company" | "role" | "job_url" | "date_applied" | "status" | "notes">
>;

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  fields: FieldErrors;

  constructor(message: string, fields: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.fields = fields;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json()) as {
    error?: string;
    fields?: FieldErrors;
  } & T;

  if (!response.ok) {
    throw new ApiError(body.error ?? "Something went wrong. Please try again.", body.fields);
  }

  return body;
}

export function getCsrfToken(): Promise<{ csrf_token: string }> {
  return request("/api/csrf");
}

export async function getApplications(
  search: string,
  status: ApplicationStatus | "",
): Promise<Application[]> {
  const result = await request<{ applications: Application[] }>(
    "/api/applications/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: search.trim(), status }),
    },
  );
  return result.applications;
}

export function createApplication(
  values: ApplicationInput,
  csrfToken: string,
): Promise<Application> {
  return request("/api/applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(values),
  });
}

export function updateApplication(
  id: number,
  values: ApplicationInput,
  csrfToken: string,
): Promise<Application> {
  return request(`/api/applications/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(values),
  });
}

export function removeApplication(id: number, csrfToken: string): Promise<void> {
  return request(`/api/applications/${id}`, {
    method: "DELETE",
    headers: { "X-CSRFToken": csrfToken },
  });
}