import type { ChatServiceAskKind } from "@yeon/api-contract/chat-service";
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

const defaultPollOptions = ["", ""];

export function AskScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useChatServiceSession();
  const [question, setQuestion] = useState("");
  const [kind, setKind] = useState<ChatServiceAskKind>("question");
  const [options, setOptions] = useState<string[]>(defaultPollOptions);

  const askQuery = useQuery({
    enabled: Boolean(session?.token),
    queryFn: async () => {
      return chatServiceApi.listChatServiceAskPosts(session!.token);
    },
    queryKey: chatServiceQueryKeys.ask,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return chatServiceApi.createChatServiceAskPost(session!.token, {
        kind,
        options:
          kind === "poll"
            ? options
                .map((label) => label.trim())
                .filter((label) => label.length > 0)
                .map((label) => ({ label }))
            : undefined,
        question: question.trim(),
      });
    },
    onSuccess: async () => {
      setQuestion("");
      setOptions(defaultPollOptions);
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.ask,
      });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({
      optionIndex,
      postId,
    }: {
      postId: string;
      optionIndex: number;
    }) => {
      return chatServiceApi.voteChatServiceAskPost(session!.token, postId, {
        optionIndex,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.ask,
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (postId: string) => {
      return chatServiceApi.createChatServiceReport(session!.token, {
        reason: "에스크 게시글 신고",
        targetId: postId,
        targetType: "ask_post",
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (profileId: string) => {
      return chatServiceApi.blockChatServiceProfile(session!.token, profileId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.ask,
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.friends,
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.profile,
      });
    },
  });

  async function handleCreate() {
    try {
      await createMutation.mutateAsync();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "에스크 작성에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleVote(postId: string, optionIndex: number) {
    try {
      await voteMutation.mutateAsync({ optionIndex, postId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "투표 처리에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleReport(postId: string) {
    try {
      await reportMutation.mutateAsync(postId);
      Alert.alert("신고 완료", "운영팀이 게시글을 검토합니다.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "신고 처리에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleBlock(profileId: string) {
    try {
      await blockMutation.mutateAsync(profileId);
      Alert.alert("차단 완료", "이 사용자의 게시글은 더 이상 보이지 않습니다.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "차단 처리에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  function pushProfile({ id }: { id: string }) {
    router.push(`/profile/${id}`);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <TopBar
        subtitle="질문과 투표를 따로 모아 반응을 모으는 공간"
        title="에스크"
      />

      <SectionCard>
        <View style={styles.segmentRow}>
          <SegmentButton
            active={kind === "question"}
            label="질문"
            onPress={() => setKind("question")}
          />
          <SegmentButton
            active={kind === "poll"}
            label="투표"
            onPress={() => setKind("poll")}
          />
        </View>

        <TextField
          label={kind === "poll" ? "투표 주제" : "질문"}
          multiline
          onChangeText={setQuestion}
          placeholder={
            kind === "poll"
              ? "둘 중 어떤 선택이 더 끌리는지 물어보세요"
              : "친구들에게 묻고 싶은 질문을 적어보세요"
          }
          value={question}
        />

        {kind === "poll" ? (
          <View style={styles.optionStack}>
            {options.map((option, index) => (
              <TextField
                key={`${index}`}
                label={`선택지 ${index + 1}`}
                onChangeText={(next) => {
                  setOptions((current) =>
                    current.map((value, currentIndex) =>
                      currentIndex === index ? next : value,
                    ),
                  );
                }}
                placeholder={`선택지 ${index + 1}`}
                value={option}
              />
            ))}
            {options.length < 4 ? (
              <ActionButton
                label="선택지 추가"
                onPress={() => {
                  setOptions((current) => [...current, ""]);
                }}
                variant="secondary"
              />
            ) : null}
          </View>
        ) : null}

        <ActionButton
          disabled={createMutation.isPending || question.trim().length < 1}
          label={kind === "poll" ? "투표 올리기" : "질문 올리기"}
          onPress={handleCreate}
        />
      </SectionCard>

      {askQuery.isLoading ? (
        <StateBlock
          loading
          message="에스크 목록을 준비하고 있습니다."
          title="질문 불러오는 중"
        />
      ) : null}

      {askQuery.isError ? (
        <StateBlock
          message="목록을 가져오지 못했습니다. 잠시 뒤 다시 시도해 주세요."
          title="에스크 로드 실패"
        />
      ) : null}

      {askQuery.data?.posts.map((post) => (
        <SectionCard key={post.id}>
          <View style={styles.postHeader}>
            <Pressable
              onPress={() => pushProfile(post.author)}
              style={styles.authorRow}
            >
              <AvatarCircle
                imageUrl={post.author.avatarUrl}
                label={post.author.nickname}
                size={42}
              />
              <View style={styles.authorMeta}>
                <Text style={styles.authorName}>{post.author.nickname}</Text>
                <Text style={styles.authorSub}>
                  {post.author.regionLabel} {post.author.ageLabel} ·{" "}
                  {formatRelativeTime(post.createdAt)}
                </Text>
              </View>
            </Pressable>
            <View style={styles.postActions}>
              <Text
                style={[
                  styles.kindBadge,
                  post.kind === "poll"
                    ? styles.pollBadge
                    : styles.questionBadge,
                ]}
              >
                {post.kind === "poll" ? "투표" : "질문"}
              </Text>
              <Pressable onPress={() => void handleReport(post.id)}>
                <Text style={styles.actionLink}>신고</Text>
              </Pressable>
              <Pressable onPress={() => void handleBlock(post.author.id)}>
                <Text style={styles.actionLink}>차단</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.questionText}>{post.question}</Text>

          {post.kind === "poll" ? (
            <View style={styles.optionList}>
              {post.options.map((option) => {
                const selected = post.userVoteIndex === option.index;

                return (
                  <Pressable
                    key={option.index}
                    onPress={() => void handleVote(post.id, option.index)}
                    style={[
                      styles.optionButton,
                      selected ? styles.optionButtonSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        selected ? styles.optionLabelSelected : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionCount,
                        selected ? styles.optionLabelSelected : null,
                      ]}
                    >
                      {option.voteCount}표
                    </Text>
                  </Pressable>
                );
              })}
              <Text style={styles.voteSummary}>
                총 {post.totalVotes}명 참여
              </Text>
            </View>
          ) : (
            <Text style={styles.questionHint}>
              공개 피드에서 이어서 대화를 열거나 친구 탭에서 관계를 이어갈 수
              있습니다.
            </Text>
          )}
        </SectionCard>
      ))}
    </ScrollView>
  );
}

function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
    >
      <Text
        style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}
      >
        {label}
      </Text>
    </Pressable>
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
  segmentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  segmentButton: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: colors.accent,
  },
  segmentLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  segmentLabelActive: {
    color: colors.white,
  },
  optionStack: {
    gap: 10,
  },
  postHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  authorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  authorMeta: {
    gap: 4,
  },
  postActions: {
    alignItems: "flex-end",
    gap: 8,
    marginLeft: 12,
  },
  authorName: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "900",
  },
  authorSub: {
    color: colors.textMuted,
    fontSize: 12,
  },
  kindBadge: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pollBadge: {
    backgroundColor: colors.accentSoft,
    color: colors.accent,
  },
  questionBadge: {
    backgroundColor: colors.warmSoft,
    color: colors.warm,
  },
  actionLink: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  questionText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28,
  },
  optionList: {
    gap: 10,
    marginTop: 14,
  },
  optionButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionButtonSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  optionLabelSelected: {
    color: colors.white,
  },
  optionCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  voteSummary: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "right",
  },
  questionHint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
});
