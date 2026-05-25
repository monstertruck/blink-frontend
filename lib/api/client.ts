import type {
  CategoryCount,
  CategoryResponse,
  LinkRequest,
  LinkResponse,
  LinkStatus,
  LinkUpdate,
} from "./types";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API error ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = extractDetail(err.body);
    return detail ? `${err.status}: ${detail}` : `Error ${err.status}.`;
  }
  if (err instanceof Error) return err.message;
  return "Request failed.";
}

function extractDetail(body: unknown): string | null {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return null;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  acceptStatuses: number[] = [],
): Promise<{ data: T; status: number }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok && !acceptStatuses.includes(res.status)) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* response wasn't JSON */
    }
    throw new ApiError(res.status, res.statusText, body);
  }

  const data =
    res.status === 204 ? (null as T) : ((await res.json()) as T);
  return { data, status: res.status };
}

export type CreateLinkResult = {
  link: LinkResponse;
  /** True if the backend returned 409 because this URL was already saved. */
  alreadyExisted: boolean;
};

export async function createLink(
  body: LinkRequest,
  signal?: AbortSignal,
): Promise<CreateLinkResult> {
  const { data, status } = await request<LinkResponse>(
    "/links",
    { method: "POST", body: JSON.stringify(body), signal },
    [409],
  );
  return { link: data, alreadyExisted: status === 409 };
}

export type ListLinksParams = {
  skip?: number;
  limit?: number;
  category?: string;
  status?: LinkStatus;
};

export async function listLinks(
  params: ListLinksParams = {},
): Promise<LinkResponse[]> {
  const qs = new URLSearchParams();
  if (params.skip !== undefined) qs.set("skip", String(params.skip));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.category) qs.set("category", params.category);
  if (params.status) qs.set("status", params.status);
  const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
  const { data } = await request<LinkResponse[]>(`/links${suffix}`);
  return data;
}

export async function getLink(id: number): Promise<LinkResponse> {
  const { data } = await request<LinkResponse>(`/links/${id}`);
  return data;
}

export async function setLinkStatus(
  id: number,
  status: LinkStatus,
): Promise<LinkResponse> {
  const { data } = await request<LinkResponse>(
    `/links/${id}/status?status=${encodeURIComponent(status)}`,
    { method: "PATCH" },
  );
  return data;
}

export async function updateLink(
  id: number,
  body: LinkUpdate,
): Promise<LinkResponse> {
  const { data } = await request<LinkResponse>(`/links/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return data;
}

export async function deleteLink(id: number): Promise<void> {
  await request<null>(`/links/${id}`, { method: "DELETE" });
}

export async function listCategories(
  includeAll = false,
): Promise<CategoryCount[]> {
  const suffix = includeAll ? "?include_all=true" : "";
  const { data } = await request<CategoryCount[]>(`/categories${suffix}`);
  return data;
}

export async function createCategory(name: string): Promise<CategoryResponse> {
  const { data } = await request<CategoryResponse>("/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return data;
}
