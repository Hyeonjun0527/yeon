import type { ChatServiceFeedPostDto } from "@yeon/api-contract/chat-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ActionButton } from "../../../components/ui/action-button";
import { AvatarCircle } from "../../../components/ui/avatar-circle";
import { SectionCard } from "../../../components/ui/section-card";
import { StateBlock } from "../../../components/ui/state-block";
import { TextField } from "../../../components/ui/text-field";
import { TopBar } from "../../../components/ui/top-bar";
import { formatRelativeTime } from "../../../lib/format";
import { useChatServiceSession } from "../../../providers/chat-service-session-provider";
import { chatServiceApi } from "../../../services/chat-service/client";
import { chatServiceQueryKeys } from "../../../services/chat-service/query-keys";
import { colors } from "../../../theme/colors";

export function FeedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useChatServiceSession();
  const [draft, setDraft] = useState("");
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(
    null,
  );
  const [replyDraft, setReplyDraft] = useState("");

  const feedQuery = useQuery({
    enabled: Boolean(session?.token),
    queryFn: async () => {
      return chatServiceApi.listChatServiceFeed(session!.token);
    },
    queryKey: chatServiceQueryKeys.feed,
  });

  const createPostMutation = useMutation({
    mutationFn: async (body: string) => {
      return chatServiceApi.createChatServiceFeedPost(session!.token, { body });
    },
    onSuccess: async () => {
      setDraft("");
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.feed,
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ body, postId }: { postId: string; body: string }) => {
      return chatServiceApi.replyToChatServiceFeedPost(session!.token, postId, {
        body,
      });
    },
    onSuccess: async (_result, variables) => {
      setReplyDraft("");
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.replies(variables.postId),
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.feed,
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (postId: string) => {
      return chatServiceApi.createChatServiceReport(session!.token, {
        reason: "피드 게시글 신고",
        targetId: postId,
        targetType: "feed_post",
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (profileId: string) => {
      return chatServiceApi.blockChatServiceProfile(session!.token, profileId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.feed,
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.friends,
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.profile,
      });
    },
  });

  async function handleCreatePost() {
    try {
      await createPostMutation.mutateAsync(draft.trim());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "글 작성에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleReply(postId: string) {
    try {
      await replyMutation.mutateAsync({ body: replyDraft.trim(), postId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "답글 작성에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleReport(postId: string) {
    try {
      await reportMutation.mutateAsync(postId);
      Alert.alert("신고 완료", "운영팀이 내용을 검토합니다.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "신고 처리에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleBlock(profileId: string) {
    try {
      await blockMutation.mutateAsync(profileId);
      Alert.alert(
        "차단 완료",
        "이 사용자는 더 이상 피드에 보이지 않게 처리됩니다.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "차단 처리에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  function pushProfile(post: ChatServiceFeedPostDto) {
    router.push(`/profile/${post.author.id}`);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <TopBar
        rightLabel="새로고침"
        onRightPress={() => {
          void feedQuery.refetch();
        }}
        subtitle="모두의 짧은 대화가 빠르게 쌓이는 공개 피드"
        title="피드"
      />

      <SectionCard>
        <View style={styles.composeHeader}>
          <Text style={styles.composeTitle}>한 줄 올리기</Text>
          <Text style={styles.composeHint}>400자 이하 공개 글</Text>
        </View>
        <TextField
          label="내용"
          multiline
          onChangeText={setDraft}
          placeholder="지금 생각나는 말을 남겨보세요"
          value={draft}
        />
        <ActionButton
          disabled={createPostMutation.isPending || draft.trim().length < 1}
          label="피드에 올리기"
          onPress={handleCreatePost}
        />
      </SectionCard>

      {feedQuery.isLoading ? (
        <StateBlock
          loading
          message="피드를 불러오는 중입니다."
          title="목록 준비 중"
        />
      ) : null}

      {feedQuery.isError ? (
        <StateBlock
          message="공개 대화를 가져오지 못했습니다. 상단 새로고침으로 다시 시도해 주세요."
          title="피드 로드 실패"
        />
      ) : null}

      {feedQuery.data?.posts.map((post) => (
        <SectionCard key={post.id}>
          <View style={styles.postHeader}>
            <Pressable
              onPress={() => pushProfile(post)}
              style={styles.authorRow}
            >
              <AvatarCircle
                imageUrl={post.author.avatarUrl}
                label={post.author.nickname}
                tone="warm"
              />
              <View style={styles.authorMeta}>
                <Text style={styles.authorName}>{post.author.nickname}</Text>
                <Text style={styles.authorSub}>
                  {post.author.regionLabel} {post.author.ageLabel} ·{" "}
                  {formatRelativeTime(post.createdAt)}
                </Text>
              </View>
            </Pressable>
            <View style={styles.actionRow}>
              <Pressable onPress={() => void handleReport(post.id)}>
                <Text style={styles.linkText}>신고</Text>
              </Pressable>
              <Pressable onPress={() => void handleBlock(post.author.id)}>
                <Text style={styles.linkText}>차단</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.postBody}>{post.body}</Text>

          <View style={styles.postFooter}>
            <Text style={styles.footerText}>답글 {post.replyCount}</Text>
            <Pressable
              onPress={() => {
                setReplyDraft("");
                setActiveReplyPostId((current) =>
                  current === post.id ? null : post.id,
                );
              }}
            >
              <Text style={styles.replyToggle}>
                {activeReplyPostId === post.id ? "답글 닫기" : "답글 보기"}
              </Text>
            </Pressable>
          </View>

          {activeReplyPostId === post.id ? (
            <FeedRepliesPanel
              onReply={() => void handleReply(post.id)}
              postId={post.id}
              replyDraft={replyDraft}
              replyDraftPending={replyMutation.isPending}
              setReplyDraft={setReplyDraft}
              sessionToken={session!.token}
            />
          ) : null}
        </SectionCard>
      ))}
    </ScrollView>
  );
}

function FeedRepliesPanel({
  onReply,
  postId,
  replyDraft,
  replyDraftPending,
  sessionToken,
  setReplyDraft,
}: {
  postId: string;
  sessionToken: string;
  replyDraft: string;
  setReplyDraft: (value: string) => void;
  onReply: () => void;
  replyDraftPending: boolean;
}) {
  const repliesQuery = useQuery({
    queryFn: async () => {
      return chatServiceApi.listChatServiceFeedReplies(sessionToken, postId);
    },
    queryKey: chatServiceQueryKeys.replies(postId),
  });

  return (
    <View style={styles.replyPanel}>
      {repliesQuery.data?.replies.map((reply) => (
        <View key={reply.id} style={styles.replyItem}>
          <View style={styles.replyAuthorRow}>
            <AvatarCircle
              imageUrl={reply.author.avatarUrl}
              label={reply.author.nickname}
              size={34}
            />
            <Text style={styles.replyAuthorName}>
              {reply.author.nickname} · {formatRelativeTime(reply.createdAt)}
            </Text>
          </View>
          <Text style={styles.replyBody}>{reply.body}</Text>
        </View>
      ))}

      {repliesQuery.isLoading ? (
        <Text style={styles.replyMeta}>답글을 불러오는 중입니다.</Text>
      ) : null}

      <TextField
        label="답글 작성"
        multiline
        onChangeText={setReplyDraft}
        placeholder="답글을 남겨보세요"
        value={replyDraft}
      />
      <ActionButton
        disabled={replyDraftPending || replyDraft.trim().length < 1}
        label="답글 등록"
        onPress={onReply}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 16,
    paddingBottom: 120,
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  composeHeader: {
    gap: 4,
    marginBottom: 12,
  },
  composeTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  composeHint: {
    color: colors.textMuted,
    fontSize: 13,
  },
  postHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  authorRow: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 12,
  },
  authorMeta: {
    flexShrink: 1,
    gap: 4,
  },
  authorName: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "900",
  },
  authorSub: {
    color: colors.textMuted,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  postBody: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 30,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  replyToggle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
  },
  replyPanel: {
    gap: 12,
    marginTop: 14,
  },
  replyItem: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: 18,
    gap: 8,
    padding: 12,
  },
  replyAuthorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  replyAuthorName: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  replyBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  replyMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
