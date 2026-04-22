import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AvatarCircle } from "../../../components/ui/avatar-circle";
import { SectionCard } from "../../../components/ui/section-card";
import { StateBlock } from "../../../components/ui/state-block";
import { TopBar } from "../../../components/ui/top-bar";
import { formatRelativeTime } from "../../../lib/format";
import { useChatServiceSession } from "../../../providers/chat-service-session-provider";
import { chatServiceApi } from "../../../services/chat-service/client";
import { chatServiceQueryKeys } from "../../../services/chat-service/query-keys";
import { colors } from "../../../theme/colors";

export function ChatListScreen() {
  const router = useRouter();
  const { session } = useChatServiceSession();

  const roomsQuery = useQuery({
    enabled: Boolean(session?.token),
    queryFn: async () => {
      return chatServiceApi.listChatServiceRooms(session!.token);
    },
    queryKey: chatServiceQueryKeys.rooms,
  });

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <TopBar
        rightLabel="새로고침"
        onRightPress={() => {
          void roomsQuery.refetch();
        }}
        subtitle="프로필에서 100원으로 연 대화와 기존 친구 대화를 모아봅니다."
        title="대화"
      />

      {roomsQuery.isLoading ? (
        <StateBlock
          loading
          message="채팅방 목록을 준비하고 있습니다."
          title="대화 불러오는 중"
        />
      ) : null}

      {roomsQuery.isError ? (
        <StateBlock
          message="채팅방 목록을 가져오지 못했습니다."
          title="대화 로드 실패"
        />
      ) : null}

      {roomsQuery.data?.rooms.length ? (
        roomsQuery.data.rooms.map((room) => (
          <SectionCard key={room.id}>
            <Pressable
              onPress={() => router.push(`/chat/${room.id}`)}
              style={styles.roomRow}
            >
              <View style={styles.peerRow}>
                <AvatarCircle
                  imageUrl={room.peer.avatarUrl}
                  label={room.peer.nickname}
                  size={56}
                />
                <View style={styles.metaColumn}>
                  <View style={styles.titleRow}>
                    <Text style={styles.peerName}>{room.peer.nickname}</Text>
                    <Text style={styles.timeLabel}>
                      {room.lastMessageAt
                        ? formatRelativeTime(room.lastMessageAt)
                        : "대화 준비"}
                    </Text>
                  </View>
                  <Text style={styles.peerMeta}>
                    {room.peer.regionLabel} {room.peer.ageLabel}
                  </Text>
                  <Text style={styles.preview}>
                    {room.lastMessagePreview ?? "첫 메시지를 보내보세요."}
                  </Text>
                </View>
              </View>
              <View style={styles.badges}>
                {room.unlockedByPayment ? (
                  <Text style={styles.paymentBadge}>100원 오픈</Text>
                ) : null}
                {room.unreadCount > 0 ? (
                  <Text style={styles.unreadBadge}>{room.unreadCount}</Text>
                ) : null}
              </View>
            </Pressable>
          </SectionCard>
        ))
      ) : (
        <StateBlock
          message="친구 탭이나 프로필 화면에서 먼저 대화를 열어보세요."
          title="아직 열린 대화가 없습니다"
        />
      )}
    </ScrollView>
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
  roomRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  peerRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  metaColumn: {
    flex: 1,
    gap: 5,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  peerName: {
    color: colors.accent,
    fontSize: 19,
    fontWeight: "900",
  },
  timeLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  peerMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  preview: {
    color: colors.text,
    fontSize: 14,
  },
  badges: {
    alignItems: "flex-end",
    gap: 8,
    marginLeft: 12,
  },
  paymentBadge: {
    backgroundColor: colors.warmSoft,
    borderRadius: 999,
    color: colors.warm,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unreadBadge: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
