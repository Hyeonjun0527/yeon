import { authSessionResponseSchema } from "@yeon/api-contract/auth";
import {
  chatServiceBlockProfileResponseSchema,
  chatServiceCreateAskPostBodySchema,
  chatServiceCreateAskPostResponseSchema,
  chatServiceCreateFeedPostBodySchema,
  chatServiceCreateFeedPostResponseSchema,
  chatServiceCreateReportBodySchema,
  chatServiceCreateReportResponseSchema,
  chatServiceDeleteAccountResponseSchema,
  chatServiceFriendMutationResponseSchema,
  chatServiceFriendsOverviewResponseSchema,
  chatServiceGetChatRoomResponseSchema,
  chatServiceGetProfileResponseSchema,
  chatServiceGetMyProfileResponseSchema,
  chatServiceListAskPostsResponseSchema,
  chatServiceListChatRoomsResponseSchema,
  chatServiceListFeedRepliesResponseSchema,
  chatServiceListFeedResponseSchema,
  chatServiceOpenChatBodySchema,
  chatServiceOpenChatResponseSchema,
  chatServiceRequestOtpBodySchema,
  chatServiceRequestOtpResponseSchema,
  chatServiceSendChatMessageBodySchema,
  chatServiceSendChatMessageResponseSchema,
  chatServiceSendFriendRequestBodySchema,
  chatServiceSessionResponseSchema,
  chatServiceUpdateMyProfileBodySchema,
  chatServiceUpdateMyProfileResponseSchema,
  chatServiceVerifyOtpBodySchema,
  chatServiceVerifyOtpResponseSchema,
  chatServiceVoteAskPostBodySchema,
  chatServiceVoteAskPostResponseSchema,
  type ChatServiceCreateAskPostBody,
  type ChatServiceCreateFeedPostBody,
  type ChatServiceCreateReportBody,
  type ChatServiceOpenChatBody,
  type ChatServiceRequestOtpBody,
  type ChatServiceSendChatMessageBody,
  type ChatServiceSendFriendRequestBody,
  type ChatServiceUpdateMyProfileBody,
  type ChatServiceVerifyOtpBody,
  type ChatServiceVoteAskPostBody,
} from "@yeon/api-contract/chat-service";
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

function createChatServiceHeaders(sessionToken?: string): HeadersInit {
  if (!sessionToken) {
    return {};
  }

  return {
    authorization: `Bearer ${sessionToken}`,
  };
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
    requestChatServiceOtp(body: ChatServiceRequestOtpBody) {
      const parsedBody = chatServiceRequestOtpBodySchema.parse(body);

      return request({
        path: "/api/v1/chat-service/auth/request-otp",
        schema: chatServiceRequestOtpResponseSchema,
        init: {
          method: "POST",
          body: JSON.stringify(parsedBody),
        },
      });
    },
    verifyChatServiceOtp(body: ChatServiceVerifyOtpBody) {
      const parsedBody = chatServiceVerifyOtpBodySchema.parse(body);

      return request({
        path: "/api/v1/chat-service/auth/verify-otp",
        schema: chatServiceVerifyOtpResponseSchema,
        init: {
          method: "POST",
          body: JSON.stringify(parsedBody),
        },
      });
    },
    getChatServiceSession(sessionToken?: string) {
      return request({
        path: "/api/v1/chat-service/auth/session",
        schema: chatServiceSessionResponseSchema,
        init: {
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    logoutChatService(sessionToken?: string) {
      return request({
        path: "/api/v1/chat-service/auth/session",
        schema: chatServiceSessionResponseSchema,
        init: {
          method: "DELETE",
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    listChatServiceFeed(sessionToken: string) {
      return request({
        path: "/api/v1/chat-service/feed",
        schema: chatServiceListFeedResponseSchema,
        init: {
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    createChatServiceFeedPost(
      sessionToken: string,
      body: ChatServiceCreateFeedPostBody,
    ) {
      const parsedBody = chatServiceCreateFeedPostBodySchema.parse(body);

      return request({
        path: "/api/v1/chat-service/feed",
        schema: chatServiceCreateFeedPostResponseSchema,
        init: {
          method: "POST",
          headers: createChatServiceHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    listChatServiceFeedReplies(sessionToken: string, postId: string) {
      return request({
        path: `/api/v1/chat-service/feed/${postId}/replies`,
        schema: chatServiceListFeedRepliesResponseSchema,
        init: {
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    replyToChatServiceFeedPost(
      sessionToken: string,
      postId: string,
      body: ChatServiceCreateFeedPostBody,
    ) {
      const parsedBody = chatServiceCreateFeedPostBodySchema.parse(body);

      return request({
        path: `/api/v1/chat-service/feed/${postId}/replies`,
        schema: chatServiceCreateFeedPostResponseSchema,
        init: {
          method: "POST",
          headers: createChatServiceHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    listChatServiceAskPosts(sessionToken: string) {
      return request({
        path: "/api/v1/chat-service/ask",
        schema: chatServiceListAskPostsResponseSchema,
        init: {
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    createChatServiceAskPost(
      sessionToken: string,
      body: ChatServiceCreateAskPostBody,
    ) {
      const parsedBody = chatServiceCreateAskPostBodySchema.parse(body);

      return request({
        path: "/api/v1/chat-service/ask",
        schema: chatServiceCreateAskPostResponseSchema,
        init: {
          method: "POST",
          headers: createChatServiceHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    voteChatServiceAskPost(
      sessionToken: string,
      postId: string,
      body: ChatServiceVoteAskPostBody,
    ) {
      const parsedBody = chatServiceVoteAskPostBodySchema.parse(body);

      return request({
        path: `/api/v1/chat-service/ask/${postId}/vote`,
        schema: chatServiceVoteAskPostResponseSchema,
        init: {
          method: "POST",
          headers: createChatServiceHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    getChatServiceFriendsOverview(sessionToken: string) {
      return request({
        path: "/api/v1/chat-service/friends/overview",
        schema: chatServiceFriendsOverviewResponseSchema,
        init: {
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    sendChatServiceFriendRequest(
      sessionToken: string,
      body: ChatServiceSendFriendRequestBody,
    ) {
      const parsedBody = chatServiceSendFriendRequestBodySchema.parse(body);

      return request({
        path: "/api/v1/chat-service/friends/requests",
        schema: chatServiceFriendMutationResponseSchema,
        init: {
          method: "POST",
          headers: createChatServiceHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    openChatServiceRoom(sessionToken: string, body: ChatServiceOpenChatBody) {
      const parsedBody = chatServiceOpenChatBodySchema.parse(body);

      return request({
        path: "/api/v1/chat-service/chat/open",
        schema: chatServiceOpenChatResponseSchema,
        init: {
          method: "POST",
          headers: createChatServiceHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    listChatServiceRooms(sessionToken: string) {
      return request({
        path: "/api/v1/chat-service/chat/rooms",
        schema: chatServiceListChatRoomsResponseSchema,
        init: {
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    getChatServiceRoom(sessionToken: string, roomId: string) {
      return request({
        path: `/api/v1/chat-service/chat/rooms/${roomId}`,
        schema: chatServiceGetChatRoomResponseSchema,
        init: {
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    sendChatServiceMessage(
      sessionToken: string,
      roomId: string,
      body: ChatServiceSendChatMessageBody,
    ) {
      const parsedBody = chatServiceSendChatMessageBodySchema.parse(body);

      return request({
        path: `/api/v1/chat-service/chat/rooms/${roomId}/messages`,
        schema: chatServiceSendChatMessageResponseSchema,
        init: {
          method: "POST",
          headers: createChatServiceHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    getMyChatServiceProfile(sessionToken: string) {
      return request({
        path: "/api/v1/chat-service/profile/me",
        schema: chatServiceGetMyProfileResponseSchema,
        init: {
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    getChatServiceProfile(sessionToken: string, profileId: string) {
      return request({
        path: `/api/v1/chat-service/profiles/${profileId}`,
        schema: chatServiceGetProfileResponseSchema,
        init: {
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    updateMyChatServiceProfile(
      sessionToken: string,
      body: ChatServiceUpdateMyProfileBody,
    ) {
      const parsedBody = chatServiceUpdateMyProfileBodySchema.parse(body);

      return request({
        path: "/api/v1/chat-service/profile/me",
        schema: chatServiceUpdateMyProfileResponseSchema,
        init: {
          method: "PATCH",
          headers: createChatServiceHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    deleteMyChatServiceProfile(sessionToken: string) {
      return request({
        path: "/api/v1/chat-service/profile/me",
        schema: chatServiceDeleteAccountResponseSchema,
        init: {
          method: "DELETE",
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    createChatServiceReport(
      sessionToken: string,
      body: ChatServiceCreateReportBody,
    ) {
      const parsedBody = chatServiceCreateReportBodySchema.parse(body);

      return request({
        path: "/api/v1/chat-service/reports",
        schema: chatServiceCreateReportResponseSchema,
        init: {
          method: "POST",
          headers: createChatServiceHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    blockChatServiceProfile(sessionToken: string, profileId: string) {
      return request({
        path: `/api/v1/chat-service/profiles/${profileId}/block`,
        schema: chatServiceBlockProfileResponseSchema,
        init: {
          method: "POST",
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
    unblockChatServiceProfile(sessionToken: string, profileId: string) {
      return request({
        path: `/api/v1/chat-service/profiles/${profileId}/block`,
        schema: chatServiceBlockProfileResponseSchema,
        init: {
          method: "DELETE",
          headers: createChatServiceHeaders(sessionToken),
        },
      });
    },
  };
}
