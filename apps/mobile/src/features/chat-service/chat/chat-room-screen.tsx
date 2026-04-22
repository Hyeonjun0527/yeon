import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ActionButton } from "../../../components/ui/action-button";
import { SectionCard } from "../../../components/ui/section-card";
import { StateBlock } from "../../../components/ui/state-block";
import { TextField } from "../../../components/ui/text-field";
import { TopBar } from "../../../components/ui/top-bar";
import { formatRelativeTime, parseOptionalString } from "../../../lib/format";
import { useChatServiceSession } from "../../../providers/chat-service-session-provider";
import { chatServiceApi } from "../../../services/chat-service/client";
import { chatServiceQueryKeys } from "../../../services/chat-service/query-keys";
import { colors } from "../../../theme/colors";

export function ChatRoomScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView | null>(null);
  const { roomId: rawRoomId } = useLocalSearchParams();
  const roomId = parseOptionalString(rawRoomId) ?? "";
  const { session } = useChatServiceSession();
  const [draft, setDraft] = useState("");

  const roomQuery = useQuery({
    enabled: Boolean(session?.token && roomId),
    queryFn: async () => {
      return chatServiceApi.getChatServiceRoom(session!.token, roomId);
    },
    queryKey: chatServiceQueryKeys.room(roomId),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      return chatServiceApi.sendChatServiceMessage(session!.token, roomId, {
        body: draft.trim(),
      });
    },
    onSuccess: async () => {
      setDraft("");
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.room(roomId),
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.rooms,
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (profileId: string) => {
      return chatServiceApi.blockChatServiceProfile(session!.token, profileId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.friends,
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.profile,
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.rooms,
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return chatServiceApi.createChatServiceReport(session!.token, {
        reason: "채팅 메시지 신고",
        targetId: messageId,
        targetType: "chat_message",
      });
    },
  });

  async function handleSend() {
    try {
      await sendMutation.mutateAsync();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "메시지 전송에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleBlockPeer() {
    if (!roomQuery.data) {
      return;
    }

    try {
      await blockMutation.mutateAsync(roomQuery.data.room.peer.id);
      Alert.alert("차단 완료", "이제 이 상대와의 대화가 차단됩니다.");
      router.replace("/(tabs)/chat");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "차단 처리에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleReportMessage(messageId: string) {
    try {
      await reportMutation.mutateAsync(messageId);
      Alert.alert("신고 접수", "메시지 신고가 접수됐습니다.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "메시지 신고에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboard}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <TopBar
            rightLabel="목록"
            onRightPress={() => router.replace("/(tabs)/chat")}
            subtitle={roomQuery.data?.room.peer.nickname ?? "대화"}
            title="대화방"
          />
          {roomQuery.data ? (
            <View style={styles.headerActions}>
              <ActionButton
                label="프로필"
                onPress={() =>
                  router.push(`/profile/${roomQuery.data.room.peer.id}`)
                }
                variant="secondary"
              />
              <ActionButton
                label="차단"
                onPress={() => {
                  Alert.alert(
                    "이 사용자를 차단할까요?",
                    "친구 요청과 추가 대화 열기가 모두 막힙니다.",
                    [
                      {
                        style: "cancel",
                        text: "취소",
                      },
                      {
                        onPress: () => {
                          void handleBlockPeer();
                        },
                        style: "destructive",
                        text: "차단",
                      },
                    ],
                  );
                }}
                variant="danger"
              />
            </View>
          ) : null}
        </View>

        {roomQuery.isLoading ? (
          <View style={styles.body}>
            <StateBlock
              loading
              message="대화 내용을 불러오는 중입니다."
              title="대화 준비 중"
            />
          </View>
        ) : null}

        {roomQuery.isError ? (
          <View style={styles.body}>
            <StateBlock
              message="대화 내용을 불러오지 못했습니다."
              title="대화 로드 실패"
            />
          </View>
        ) : null}

        {roomQuery.data ? (
          <>
            <ScrollView
              contentContainerStyle={styles.messages}
              onContentSizeChange={() => {
                scrollRef.current?.scrollToEnd({ animated: false });
              }}
              ref={scrollRef}
            >
              {roomQuery.data.messages.map((message) => {
                const mine = message.senderId === session?.user.id;

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageRow,
                      mine ? styles.messageRowMine : styles.messageRowPeer,
                    ]}
                  >
                    <SectionCard>
                      <Text
                        style={[
                          styles.messageBody,
                          mine ? styles.messageBodyMine : null,
                        ]}
                      >
                        {message.body}
                      </Text>
                      <View style={styles.messageMetaRow}>
                        <Text style={styles.messageMeta}>
                          {formatRelativeTime(message.createdAt)}
                        </Text>
                        {!mine ? (
                          <Pressable
                            onPress={() => void handleReportMessage(message.id)}
                          >
                            <Text style={styles.messageReport}>신고</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </SectionCard>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.composer}>
              <TextField
                label="메시지"
                multiline
                onChangeText={setDraft}
                placeholder="대화를 입력해 주세요"
                value={draft}
              />
              <ActionButton
                disabled={sendMutation.isPending || draft.trim().length < 1}
                label="보내기"
                onPress={handleSend}
              />
            </View>
          </>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  messages: {
    gap: 12,
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowPeer: {
    justifyContent: "flex-start",
  },
  messageBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  messageBodyMine: {
    color: colors.accent,
  },
  messageMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  messageMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  messageReport: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  composer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 12,
    padding: 18,
  },
});
