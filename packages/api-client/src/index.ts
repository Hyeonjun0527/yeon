import { authSessionResponseSchema } from "@yeon/api-contract/auth";
import { contestOverviewResponseSchema } from "@yeon/api-contract/contest";
import { errorResponseSchema } from "@yeon/api-contract/error";
import { healthResponseSchema } from "@yeon/api-contract/health";
import {
  createUserResponseSchema,
  listUsersResponseSchema,
  type CreateUserBody,
} from "@yeon/api-contract/users";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type FetchLike = typeof fetch;

type ApiClientOptions = {
  baseUrl?: string;
  fetch?: FetchLike;
  headers?: HeadersInit;
};

type ParseableSchema<TSchema> = {
  parse(input: unknown): TSchema;
};

type RequestOptions<TSchema> = {
  path: string;
  schema: ParseableSchema<TSchema>;
  init?: RequestInit;
};

function joinUrl(baseUrl: string, path: string) {
  if (!baseUrl) {
    return path;
  }

  return new URL(path, baseUrl).toString();
}

async function parseErrorResponse(response: Response) {
  try {
    const data = await response.json();
    const parsed = errorResponseSchema.safeParse(data);

    if (parsed.success) {
      return parsed.data.message;
    }
  } catch {
    return null;
  }

  return null;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const fetchImpl = options.fetch ?? fetch;
  const baseUrl = options.baseUrl ?? "";
  const defaultHeaders = options.headers;

  async function request<TSchema>({
    path,
    schema,
    init,
  }: RequestOptions<TSchema>) {
    const response = await fetchImpl(joinUrl(baseUrl, path), {
      ...init,
      headers: {
        "content-type": "application/json",
        ...defaultHeaders,
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const message =
        (await parseErrorResponse(response)) ?? "API 요청 처리에 실패했습니다.";

      throw new ApiClientError(response.status, message);
    }

    const data = await response.json();

    return schema.parse(data);
  }

  return {
    getHealth() {
      return request({
        path: "/api/health",
        schema: healthResponseSchema,
      });
    },
    getAuthSession() {
      return request({
        path: "/api/v1/auth/session",
        schema: authSessionResponseSchema,
      });
    },
    async logout() {
      await request({
        path: "/api/v1/auth/session",
        schema: authSessionResponseSchema,
        init: {
          method: "DELETE",
        },
      });
    },
    getContestOverview() {
      return request({
        path: "/api/v1/contest/overview",
        schema: contestOverviewResponseSchema,
      });
    },
    listUsers() {
      return request({
        path: "/api/v1/users",
        schema: listUsersResponseSchema,
      });
    },
    createUser(body: CreateUserBody) {
      return request({
        path: "/api/v1/users",
        schema: createUserResponseSchema,
        init: {
          method: "POST",
          body: JSON.stringify(body),
        },
      });
    },
  };
}
