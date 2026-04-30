import { authSessionResponseSchema } from "@yeon/api-contract/auth";
import {
  cardDeckDetailResponseSchema,
  cardDeckItemResponseSchema,
  cardDeckListResponseSchema,
  cardDeckResponseSchema,
  createCardDeckBodySchema,
  createCardDeckItemBodySchema,
  updateCardDeckBodySchema,
  updateCardDeckItemBodySchema,
  type CreateCardDeckBody,
  type CreateCardDeckItemBody,
  type UpdateCardDeckBody,
  type UpdateCardDeckItemBody,
} from "@yeon/api-contract/card-decks";
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
import {
  credentialLoginBodySchema,
  mobileCredentialLoginResponseSchema,
  type CredentialLoginBody,
} from "@yeon/api-contract/credential";
import { errorResponseSchema } from "@yeon/api-contract/error";
import { healthResponseSchema } from "@yeon/api-contract/health";
import {
  LIFE_OS_API_PATHS,
  lifeOsDayResponseSchema,
  lifeOsDaysResponseSchema,
  lifeOsReportResponseSchema,
  upsertLifeOsDayBodySchema,
  type UpsertLifeOsDayBody,
} from "@yeon/api-contract/life-os";
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

function createAuthSessionHeaders(sessionToken?: string): HeadersInit {
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

  async function requestNoContent(path: string, init?: RequestInit) {
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
  }

  return {
    getHealth() {
      return request({
        path: "/api/health",
        schema: healthResponseSchema,
      });
    },
    getAuthSession(sessionToken?: string) {
      return request({
        path: "/api/v1/auth/session",
        schema: authSessionResponseSchema,
        init: {
          headers: createAuthSessionHeaders(sessionToken),
        },
      });
    },
    async logout(sessionToken?: string) {
      await request({
        path: "/api/v1/auth/session",
        schema: authSessionResponseSchema,
        init: {
          method: "DELETE",
          headers: createAuthSessionHeaders(sessionToken),
        },
      });
    },
    loginWithCredential(body: CredentialLoginBody) {
      const parsedBody = credentialLoginBodySchema.parse(body);

      return request({
        path: "/api/v1/mobile/auth/credentials/login",
        schema: mobileCredentialLoginResponseSchema,
        init: {
          method: "POST",
          body: JSON.stringify(parsedBody),
        },
      });
    },
    getContestOverview() {
      return request({
        path: "/api/v1/contest/overview",
        schema: contestOverviewResponseSchema,
      });
    },
    listCardDecks(sessionToken?: string) {
      return request({
        path: "/api/v1/card-decks",
        schema: cardDeckListResponseSchema,
        init: {
          headers: createAuthSessionHeaders(sessionToken),
        },
      });
    },
    createCardDeck(body: CreateCardDeckBody, sessionToken?: string) {
      const parsedBody = createCardDeckBodySchema.parse(body);

      return request({
        path: "/api/v1/card-decks",
        schema: cardDeckResponseSchema,
        init: {
          method: "POST",
          headers: createAuthSessionHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    getCardDeckDetail(deckId: string, sessionToken?: string) {
      return request({
        path: `/api/v1/card-decks/${deckId}`,
        schema: cardDeckDetailResponseSchema,
        init: {
          headers: createAuthSessionHeaders(sessionToken),
        },
      });
    },
    updateCardDeck(
      deckId: string,
      body: UpdateCardDeckBody,
      sessionToken?: string,
    ) {
      const parsedBody = updateCardDeckBodySchema.parse(body);

      return request({
        path: `/api/v1/card-decks/${deckId}`,
        schema: cardDeckResponseSchema,
        init: {
          method: "PATCH",
          headers: createAuthSessionHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    deleteCardDeck(deckId: string, sessionToken?: string) {
      return requestNoContent(`/api/v1/card-decks/${deckId}`, {
        method: "DELETE",
        headers: createAuthSessionHeaders(sessionToken),
      });
    },
    createCardDeckItem(
      deckId: string,
      body: CreateCardDeckItemBody,
      sessionToken?: string,
    ) {
      const parsedBody = createCardDeckItemBodySchema.parse(body);

      return request({
        path: `/api/v1/card-decks/${deckId}/items`,
        schema: cardDeckItemResponseSchema,
        init: {
          method: "POST",
          headers: createAuthSessionHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    updateCardDeckItem(
      deckId: string,
      itemId: string,
      body: UpdateCardDeckItemBody,
      sessionToken?: string,
    ) {
      const parsedBody = updateCardDeckItemBodySchema.parse(body);

      return request({
        path: `/api/v1/card-decks/${deckId}/items/${itemId}`,
        schema: cardDeckItemResponseSchema,
        init: {
          method: "PATCH",
          headers: createAuthSessionHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    deleteCardDeckItem(deckId: string, itemId: string, sessionToken?: string) {
      return requestNoContent(`/api/v1/card-decks/${deckId}/items/${itemId}`, {
        method: "DELETE",
        headers: createAuthSessionHeaders(sessionToken),
      });
    },
    listLifeOsDays(sessionToken?: string) {
      return request({
        path: LIFE_OS_API_PATHS.days,
        schema: lifeOsDaysResponseSchema,
        init: {
          headers: createAuthSessionHeaders(sessionToken),
        },
      });
    },
    getLifeOsDay(localDate: string, sessionToken?: string) {
      return request({
        path: LIFE_OS_API_PATHS.dayByDate(localDate),
        schema: lifeOsDayResponseSchema,
        init: {
          headers: createAuthSessionHeaders(sessionToken),
        },
      });
    },
    upsertLifeOsDay(body: UpsertLifeOsDayBody, sessionToken?: string) {
      const parsedBody = upsertLifeOsDayBodySchema.parse(body);

      return request({
        path: LIFE_OS_API_PATHS.dayByDate(parsedBody.localDate),
        schema: lifeOsDayResponseSchema,
        init: {
          method: "PUT",
          headers: createAuthSessionHeaders(sessionToken),
          body: JSON.stringify(parsedBody),
        },
      });
    },
    getLifeOsDailyReport(localDate: string, sessionToken?: string) {
      return request({
        path: LIFE_OS_API_PATHS.dailyReport(localDate),
        schema: lifeOsReportResponseSchema,
        init: {
          headers: createAuthSessionHeaders(sessionToken),
        },
      });
    },
    getLifeOsWeeklyReport(
      periodStart: string,
      periodEnd: string,
      sessionToken?: string,
    ) {
      return request({
        path: LIFE_OS_API_PATHS.weeklyReport(periodStart, periodEnd),
        schema: lifeOsReportResponseSchema,
        init: {
          headers: createAuthSessionHeaders(sessionToken),
        },
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
