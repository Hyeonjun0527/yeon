import { z } from "zod";

export const CHAT_SERVICE_DM_UNLOCK_AMOUNT = 100 as const;

export const chatServiceAskKindSchema = z.enum(["question", "poll"]);
export const chatServiceFriendStatusSchema = z.enum([
  "accepted",
  "pending_sent",
  "pending_received",
]);
export const chatServiceReportStatusSchema = z.enum(["received", "resolved"]);
export const chatServiceReportTargetTypeSchema = z.enum([
  "feed_post",
  "ask_post",
  "profile",
  "chat_message",
]);

export const chatServiceProfileSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  nickname: z.string().min(1).max(40),
  ageLabel: z.string().min(1).max(20),
  regionLabel: z.string().min(1).max(40),
  avatarUrl: z.string().url().max(2048).nullable(),
  bio: z.string().max(160),
  points: z.number().int().nonnegative(),
});

export const chatServiceSessionDtoSchema = z.object({
  token: z.string().min(32),
  expiresAt: z.string().datetime(),
  user: chatServiceProfileSummaryDtoSchema,
});

export const chatServiceRequestOtpBodySchema = z.object({
  phoneNumber: z.string().min(10).max(20),
});

export const chatServiceRequestOtpResponseSchema = z.object({
  challengeId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  debugCode: z.string().length(6).nullable(),
});

export const chatServiceVerifyOtpBodySchema = z.object({
  challengeId: z.string().uuid(),
  phoneNumber: z.string().min(10).max(20),
  code: z.string().length(6),
});

export const chatServiceVerifyOtpResponseSchema = z.object({
  session: chatServiceSessionDtoSchema,
});

export const chatServiceSessionResponseSchema = z.object({
  authenticated: z.boolean(),
  session: chatServiceSessionDtoSchema.nullable(),
});

export const chatServiceFeedPostDtoSchema = z.object({
  id: z.string().uuid(),
  body: z.string().min(1).max(400),
  replyToPostId: z.string().uuid().nullable(),
  replyCount: z.number().int().nonnegative(),
  author: chatServiceProfileSummaryDtoSchema,
  createdAt: z.string().datetime(),
});

export const chatServiceCreateFeedPostBodySchema = z.object({
  body: z.string().trim().min(1).max(400),
});

export const chatServiceListFeedResponseSchema = z.object({
  posts: z.array(chatServiceFeedPostDtoSchema),
});

export const chatServiceCreateFeedPostResponseSchema = z.object({
  post: chatServiceFeedPostDtoSchema,
});

export const chatServiceListFeedRepliesResponseSchema = z.object({
  replies: z.array(chatServiceFeedPostDtoSchema),
});

export const chatServiceAskOptionInputSchema = z.object({
  label: z.string().trim().min(1).max(80),
});

export const chatServiceAskOptionDtoSchema = z.object({
  index: z.number().int().nonnegative(),
  label: z.string().min(1).max(80),
  voteCount: z.number().int().nonnegative(),
});

export const chatServiceAskPostDtoSchema = z.object({
  id: z.string().uuid(),
  question: z.string().min(1).max(240),
  kind: chatServiceAskKindSchema,
  options: z.array(chatServiceAskOptionDtoSchema),
  totalVotes: z.number().int().nonnegative(),
  userVoteIndex: z.number().int().nonnegative().nullable(),
  author: chatServiceProfileSummaryDtoSchema,
  createdAt: z.string().datetime(),
});

export const chatServiceCreateAskPostBodySchema = z
  .object({
    question: z.string().trim().min(1).max(240),
    kind: chatServiceAskKindSchema,
    options: z.array(chatServiceAskOptionInputSchema).max(4).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "poll" && (!value.options || value.options.length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "투표글은 최소 2개의 선택지가 필요합니다.",
        path: ["options"],
      });
    }

    if (
      value.kind === "question" &&
      value.options &&
      value.options.length > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "일반 질문글에는 선택지를 넣을 수 없습니다.",
        path: ["options"],
      });
    }
  });

export const chatServiceListAskPostsResponseSchema = z.object({
  posts: z.array(chatServiceAskPostDtoSchema),
});

export const chatServiceCreateAskPostResponseSchema = z.object({
  post: chatServiceAskPostDtoSchema,
});

export const chatServiceVoteAskPostBodySchema = z.object({
  optionIndex: z.number().int().nonnegative(),
});

export const chatServiceVoteAskPostResponseSchema = z.object({
  post: chatServiceAskPostDtoSchema,
});

export const chatServiceFriendCardDtoSchema = z.object({
  profile: chatServiceProfileSummaryDtoSchema,
  status: chatServiceFriendStatusSchema,
  previewText: z.string().max(160).nullable(),
});

export const chatServiceFriendsOverviewResponseSchema = z.object({
  friends: z.array(chatServiceFriendCardDtoSchema),
  pendingSent: z.array(chatServiceFriendCardDtoSchema),
  pendingReceived: z.array(chatServiceFriendCardDtoSchema),
  suggested: z.array(chatServiceProfileSummaryDtoSchema),
  blocked: z.array(chatServiceProfileSummaryDtoSchema),
});

export const chatServiceSendFriendRequestBodySchema = z.object({
  targetProfileId: z.string().uuid(),
});

export const chatServiceFriendMutationResponseSchema = z.object({
  ok: z.literal(true),
});

export const chatServiceChatRoomDtoSchema = z.object({
  id: z.string().uuid(),
  peer: chatServiceProfileSummaryDtoSchema,
  lastMessagePreview: z.string().max(200).nullable(),
  lastMessageAt: z.string().datetime().nullable(),
  unreadCount: z.number().int().nonnegative(),
  unlockedByPayment: z.boolean(),
});

export const chatServiceChatMessageDtoSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string().min(1).max(1000),
  createdAt: z.string().datetime(),
});

export const chatServiceListChatRoomsResponseSchema = z.object({
  rooms: z.array(chatServiceChatRoomDtoSchema),
});

export const chatServiceOpenChatBodySchema = z.object({
  targetProfileId: z.string().uuid(),
});

export const chatServiceOpenChatResponseSchema = z.object({
  room: chatServiceChatRoomDtoSchema,
});

export const chatServiceGetChatRoomResponseSchema = z.object({
  room: chatServiceChatRoomDtoSchema,
  messages: z.array(chatServiceChatMessageDtoSchema),
});

export const chatServiceSendChatMessageBodySchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

export const chatServiceSendChatMessageResponseSchema = z.object({
  message: chatServiceChatMessageDtoSchema,
});

export const chatServiceProfileDtoSchema = z.object({
  id: z.string().uuid(),
  phoneNumberMasked: z.string().min(8).max(20),
  nickname: z.string().min(1).max(40),
  ageLabel: z.string().min(1).max(20),
  regionLabel: z.string().min(1).max(40),
  avatarUrl: z.string().url().max(2048).nullable(),
  bio: z.string().max(160),
  points: z.number().int().nonnegative(),
  notificationsEnabled: z.boolean(),
});

export const chatServicePublicProfileDtoSchema = z.object({
  id: z.string().uuid(),
  nickname: z.string().min(1).max(40),
  ageLabel: z.string().min(1).max(20),
  regionLabel: z.string().min(1).max(40),
  avatarUrl: z.string().url().max(2048).nullable(),
  bio: z.string().max(160),
  points: z.number().int().nonnegative(),
});

export const chatServiceReportDtoSchema = z.object({
  id: z.string().uuid(),
  targetType: chatServiceReportTargetTypeSchema,
  targetId: z.string().min(1),
  reason: z.string().min(1).max(240),
  status: chatServiceReportStatusSchema,
  createdAt: z.string().datetime(),
});

export const chatServiceGetMyProfileResponseSchema = z.object({
  profile: chatServiceProfileDtoSchema,
  blockedProfiles: z.array(chatServiceProfileSummaryDtoSchema),
  reports: z.array(chatServiceReportDtoSchema),
});

export const chatServiceGetProfileResponseSchema = z.object({
  profile: chatServicePublicProfileDtoSchema,
});

export const chatServiceUpdateMyProfileBodySchema = z.object({
  nickname: z.string().trim().min(1).max(40),
  ageLabel: z.string().trim().min(1).max(20),
  regionLabel: z.string().trim().min(1).max(40),
  bio: z.string().trim().max(160),
  notificationsEnabled: z.boolean(),
});

export const chatServiceUpdateMyProfileResponseSchema = z.object({
  profile: chatServiceProfileDtoSchema,
});

export const chatServiceCreateReportBodySchema = z.object({
  targetType: chatServiceReportTargetTypeSchema,
  targetId: z.string().min(1),
  reason: z.string().trim().min(1).max(240),
});

export const chatServiceCreateReportResponseSchema = z.object({
  report: chatServiceReportDtoSchema,
});

export const chatServiceBlockProfileResponseSchema = z.object({
  blockedProfiles: z.array(chatServiceProfileSummaryDtoSchema),
});

export const chatServiceDeleteAccountResponseSchema = z.object({
  deleted: z.literal(true),
});

export type ChatServiceAskKind = z.infer<typeof chatServiceAskKindSchema>;
export type ChatServiceFriendStatus = z.infer<
  typeof chatServiceFriendStatusSchema
>;
export type ChatServiceReportStatus = z.infer<
  typeof chatServiceReportStatusSchema
>;
export type ChatServiceReportTargetType = z.infer<
  typeof chatServiceReportTargetTypeSchema
>;
export type ChatServiceProfileSummaryDto = z.infer<
  typeof chatServiceProfileSummaryDtoSchema
>;
export type ChatServiceSessionDto = z.infer<typeof chatServiceSessionDtoSchema>;
export type ChatServiceRequestOtpBody = z.infer<
  typeof chatServiceRequestOtpBodySchema
>;
export type ChatServiceRequestOtpResponse = z.infer<
  typeof chatServiceRequestOtpResponseSchema
>;
export type ChatServiceVerifyOtpBody = z.infer<
  typeof chatServiceVerifyOtpBodySchema
>;
export type ChatServiceVerifyOtpResponse = z.infer<
  typeof chatServiceVerifyOtpResponseSchema
>;
export type ChatServiceSessionResponse = z.infer<
  typeof chatServiceSessionResponseSchema
>;
export type ChatServiceFeedPostDto = z.infer<
  typeof chatServiceFeedPostDtoSchema
>;
export type ChatServiceCreateFeedPostBody = z.infer<
  typeof chatServiceCreateFeedPostBodySchema
>;
export type ChatServiceListFeedResponse = z.infer<
  typeof chatServiceListFeedResponseSchema
>;
export type ChatServiceCreateFeedPostResponse = z.infer<
  typeof chatServiceCreateFeedPostResponseSchema
>;
export type ChatServiceListFeedRepliesResponse = z.infer<
  typeof chatServiceListFeedRepliesResponseSchema
>;
export type ChatServiceAskOptionInput = z.infer<
  typeof chatServiceAskOptionInputSchema
>;
export type ChatServiceAskOptionDto = z.infer<
  typeof chatServiceAskOptionDtoSchema
>;
export type ChatServiceAskPostDto = z.infer<typeof chatServiceAskPostDtoSchema>;
export type ChatServiceCreateAskPostBody = z.infer<
  typeof chatServiceCreateAskPostBodySchema
>;
export type ChatServiceListAskPostsResponse = z.infer<
  typeof chatServiceListAskPostsResponseSchema
>;
export type ChatServiceCreateAskPostResponse = z.infer<
  typeof chatServiceCreateAskPostResponseSchema
>;
export type ChatServiceVoteAskPostBody = z.infer<
  typeof chatServiceVoteAskPostBodySchema
>;
export type ChatServiceVoteAskPostResponse = z.infer<
  typeof chatServiceVoteAskPostResponseSchema
>;
export type ChatServiceFriendCardDto = z.infer<
  typeof chatServiceFriendCardDtoSchema
>;
export type ChatServiceFriendsOverviewResponse = z.infer<
  typeof chatServiceFriendsOverviewResponseSchema
>;
export type ChatServiceSendFriendRequestBody = z.infer<
  typeof chatServiceSendFriendRequestBodySchema
>;
export type ChatServiceChatRoomDto = z.infer<
  typeof chatServiceChatRoomDtoSchema
>;
export type ChatServiceChatMessageDto = z.infer<
  typeof chatServiceChatMessageDtoSchema
>;
export type ChatServiceListChatRoomsResponse = z.infer<
  typeof chatServiceListChatRoomsResponseSchema
>;
export type ChatServiceOpenChatBody = z.infer<
  typeof chatServiceOpenChatBodySchema
>;
export type ChatServiceOpenChatResponse = z.infer<
  typeof chatServiceOpenChatResponseSchema
>;
export type ChatServiceGetChatRoomResponse = z.infer<
  typeof chatServiceGetChatRoomResponseSchema
>;
export type ChatServiceSendChatMessageBody = z.infer<
  typeof chatServiceSendChatMessageBodySchema
>;
export type ChatServiceSendChatMessageResponse = z.infer<
  typeof chatServiceSendChatMessageResponseSchema
>;
export type ChatServiceProfileDto = z.infer<typeof chatServiceProfileDtoSchema>;
export type ChatServicePublicProfileDto = z.infer<
  typeof chatServicePublicProfileDtoSchema
>;
export type ChatServiceReportDto = z.infer<typeof chatServiceReportDtoSchema>;
export type ChatServiceGetMyProfileResponse = z.infer<
  typeof chatServiceGetMyProfileResponseSchema
>;
export type ChatServiceGetProfileResponse = z.infer<
  typeof chatServiceGetProfileResponseSchema
>;
export type ChatServiceUpdateMyProfileBody = z.infer<
  typeof chatServiceUpdateMyProfileBodySchema
>;
export type ChatServiceUpdateMyProfileResponse = z.infer<
  typeof chatServiceUpdateMyProfileResponseSchema
>;
export type ChatServiceCreateReportBody = z.infer<
  typeof chatServiceCreateReportBodySchema
>;
export type ChatServiceCreateReportResponse = z.infer<
  typeof chatServiceCreateReportResponseSchema
>;
export type ChatServiceBlockProfileResponse = z.infer<
  typeof chatServiceBlockProfileResponseSchema
>;
export type ChatServiceDeleteAccountResponse = z.infer<
  typeof chatServiceDeleteAccountResponseSchema
>;
