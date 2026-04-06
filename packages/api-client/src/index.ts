import {
  contestOverviewResponseSchema,
  createUserResponseSchema,
  errorResponseSchema,
  healthResponseSchema,
  instructorDashboardResponseSchema,
  listUsersResponseSchema,
  type CreateUserBody,
} from "@yeon/api-contract";

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
    getContestOverview() {
      return request({
        path: "/api/v1/contest/overview",
        schema: contestOverviewResponseSchema,
      });
    },
    getInstructorDashboard() {
      return request({
        path: "/api/v1/instructor-dashboard",
        schema: instructorDashboardResponseSchema,
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
