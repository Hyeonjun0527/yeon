import type {
  ChatServiceFriendCardDto,
  ChatServiceProfileSummaryDto,
} from "@yeon/api-contract/chat-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
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
import { TopBar } from "../../../components/ui/top-bar";
import { useChatServiceSession } from "../../../providers/chat-service-session-provider";
import { chatServiceApi } from "../../../services/chat-service/client";
import { chatServiceQueryKeys } from "../../../services/chat-service/query-keys";
import { colors } from "../../../theme/colors";

export function FriendsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useChatServiceSession();

  const overviewQuery = useQuery({
    enabled: Boolean(session?.token),
    queryFn: async () => {
      return chatServiceApi.getChatServiceFriendsOverview(session!.token);
    },
    queryKey: chatServiceQueryKeys.friends,
  });

  const friendRequestMutation = useMutation({
    mutationFn: async (targetProfileId: string) => {
      return chatServiceApi.sendChatServiceFriendRequest(session!.token, {
        targetProfileId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.friends,
      });
    },
  });

  async function handleFriendRequest(profileId: string) {
    try {
      await friendRequestMutation.mutateAsync(profileId);
      Alert.alert("친구 요청 전송", "상대에게 요청이 전달됐습니다.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "친구 요청 전송에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  function pushProfile(profile: ChatServiceProfileSummaryDto) {
    router.push(`/profile/${profile.id}`);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <TopBar
        rightLabel="새로고침"
        onRightPress={() => {
          void overviewQuery.refetch();
        }}
        subtitle="친구 목록, 요청 현황, 추천 사용자를 한 번에 보는 공간"
        title="친구"
      />

      {overviewQuery.isLoading ? (
        <StateBlock
          loading
          message="친구 정보를 가져오는 중입니다."
          title="목록 준비 중"
        />
      ) : null}

      {overviewQuery.isError ? (
        <StateBlock
          message="친구 목록을 가져오지 못했습니다."
          title="친구 로드 실패"
        />
      ) : null}

      {overviewQuery.data ? (
        <>
          <FriendsSection title="친구 목록">
            {overviewQuery.data.friends.length > 0 ? (
              overviewQuery.data.friends.map((friend) => (
                <FriendRow
                  key={friend.profile.id}
                  actionLabel="프로필"
                  card={friend}
                  onAction={() => pushProfile(friend.profile)}
                  onPress={() => pushProfile(friend.profile)}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>아직 연결된 친구가 없습니다.</Text>
            )}
          </FriendsSection>

          <FriendsSection title="내가 보낸 요청">
            {overviewQuery.data.pendingSent.length > 0 ? (
              overviewQuery.data.pendingSent.map((friend) => (
                <FriendRow
                  key={friend.profile.id}
                  actionLabel="대기중"
                  card={friend}
                  onPress={() => pushProfile(friend.profile)}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>보낸 요청이 없습니다.</Text>
            )}
          </FriendsSection>

          <FriendsSection title="받은 요청">
            {overviewQuery.data.pendingReceived.length > 0 ? (
              overviewQuery.data.pendingReceived.map((friend) => (
                <FriendRow
                  key={friend.profile.id}
                  actionLabel="프로필"
                  card={friend}
                  onAction={() => pushProfile(friend.profile)}
                  onPress={() => pushProfile(friend.profile)}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>받은 요청이 없습니다.</Text>
            )}
          </FriendsSection>

          <FriendsSection title="추천 사용자">
            {overviewQuery.data.suggested.map((profile) => (
              <SuggestedRow
                key={profile.id}
                onAdd={() => void handleFriendRequest(profile.id)}
                onPress={() => pushProfile(profile)}
                profile={profile}
              />
            ))}
          </FriendsSection>
        </>
      ) : null}
    </ScrollView>
  );
}

function FriendsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <SectionCard>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </SectionCard>
  );
}

function FriendRow({
  card,
  actionLabel,
  onAction,
  onPress,
}: {
  card: ChatServiceFriendCardDto;
  actionLabel: string;
  onAction?: () => void;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onPress} style={styles.profileRow}>
        <AvatarCircle
          imageUrl={card.profile.avatarUrl}
          label={card.profile.nickname}
        />
        <View style={styles.rowText}>
          <Text style={styles.nickname}>{card.profile.nickname}</Text>
          <Text style={styles.meta}>
            {card.profile.regionLabel} {card.profile.ageLabel}
          </Text>
          {card.previewText ? (
            <Text style={styles.preview}>{card.previewText}</Text>
          ) : null}
        </View>
      </Pressable>
      {onAction ? (
        <Pressable onPress={onAction} style={styles.inlineAction}>
          <Text style={styles.inlineActionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.inlineAction}>
          <Text style={styles.inlineActionLabel}>{actionLabel}</Text>
        </View>
      )}
    </View>
  );
}

function SuggestedRow({
  onAdd,
  onPress,
  profile,
}: {
  profile: ChatServiceProfileSummaryDto;
  onAdd: () => void;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onPress} style={styles.profileRow}>
        <AvatarCircle imageUrl={profile.avatarUrl} label={profile.nickname} />
        <View style={styles.rowText}>
          <Text style={styles.nickname}>{profile.nickname}</Text>
          <Text style={styles.meta}>
            {profile.regionLabel} {profile.ageLabel}
          </Text>
        </View>
      </Pressable>
      <ActionButton label="친구추가" onPress={onAdd} variant="secondary" />
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
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  sectionBody: {
    gap: 12,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  profileRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  nickname: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "900",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  preview: {
    color: colors.text,
    fontSize: 14,
  },
  inlineAction: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineActionLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
