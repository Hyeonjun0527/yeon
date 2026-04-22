import { CHAT_SERVICE_DM_UNLOCK_AMOUNT } from "@yeon/api-contract/chat-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton } from "../../../components/ui/action-button";
import { AvatarCircle } from "../../../components/ui/avatar-circle";
import { SectionCard } from "../../../components/ui/section-card";
import { StateBlock } from "../../../components/ui/state-block";
import { TopBar } from "../../../components/ui/top-bar";
import { parseOptionalString } from "../../../lib/format";
import { useChatServiceSession } from "../../../providers/chat-service-session-provider";
import { chatServiceApi } from "../../../services/chat-service/client";
import { chatServiceQueryKeys } from "../../../services/chat-service/query-keys";
import { colors } from "../../../theme/colors";

export function ProfileDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profileId: rawProfileId } = useLocalSearchParams();
  const { session } = useChatServiceSession();
  const profileId = parseOptionalString(rawProfileId) ?? "";

  const profileQuery = useQuery({
    enabled: Boolean(session?.token && profileId),
    queryFn: async () => {
      return chatServiceApi.getChatServiceProfile(session!.token, profileId);
    },
    queryKey: chatServiceQueryKeys.publicProfile(profileId),
  });

  const overviewQuery = useQuery({
    enabled: Boolean(session?.token && profileId),
    queryFn: async () => {
      return chatServiceApi.getChatServiceFriendsOverview(session!.token);
    },
    queryKey: chatServiceQueryKeys.friends,
  });

  const reportDraft = "프로필 신고";

  const friendMutation = useMutation({
    mutationFn: async () => {
      return chatServiceApi.sendChatServiceFriendRequest(session!.token, {
        targetProfileId: profileId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.friends,
      });
    },
  });

  const dmMutation = useMutation({
    mutationFn: async () => {
      return chatServiceApi.openChatServiceRoom(session!.token, {
        targetProfileId: profileId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.rooms,
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.friends,
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.publicProfile(profileId),
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.profile,
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      return chatServiceApi.blockChatServiceProfile(session!.token, profileId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.friends,
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.publicProfile(profileId),
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.profile,
      });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async () => {
      return chatServiceApi.unblockChatServiceProfile(
        session!.token,
        profileId,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.friends,
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.publicProfile(profileId),
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.profile,
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      return chatServiceApi.createChatServiceReport(session!.token, {
        reason: reportDraft,
        targetId: profileId,
        targetType: "profile",
      });
    },
  });

  const isBlocked =
    overviewQuery.data?.blocked.some((blocked) => blocked.id === profileId) ??
    false;
  const profile = profileQuery.data?.profile;

  async function handleFriendRequest() {
    try {
      await friendMutation.mutateAsync();
      Alert.alert("친구 요청 전송", "상대에게 요청을 보냈습니다.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "친구 요청에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleDmOpen() {
    try {
      const response = await dmMutation.mutateAsync();
      Alert.alert(
        "대화 오픈",
        response.room.unlockedByPayment
          ? `${CHAT_SERVICE_DM_UNLOCK_AMOUNT}원이 차감되고 대화방이 열렸습니다.`
          : "이미 열린 대화방으로 이동합니다.",
      );
      router.push(`/chat/${response.room.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "대화 오픈에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleReport() {
    try {
      await reportMutation.mutateAsync();
      Alert.alert("신고 접수", "운영팀이 프로필을 검토합니다.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "프로필 신고에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleBlockToggle() {
    try {
      if (isBlocked) {
        await unblockMutation.mutateAsync();
        Alert.alert("차단 해제", "이제 다시 친구 요청과 대화가 가능합니다.");
      } else {
        await blockMutation.mutateAsync();
        Alert.alert("차단 완료", "친구 요청과 대화 열기가 차단됩니다.", [
          {
            onPress: () => {
              router.back();
            },
            text: "확인",
          },
        ]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "차단 처리에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <TopBar
        rightLabel="뒤로"
        onRightPress={() => router.back()}
        subtitle="프로필에서 친구 요청과 100원 DM 오픈을 바로 실행합니다."
        title="프로필 보기"
      />

      {!profileId ? (
        <StateBlock
          message="프로필 식별자가 없어 화면을 열 수 없습니다."
          title="프로필 진입 오류"
        />
      ) : null}

      {profileQuery.isLoading ? (
        <StateBlock
          loading
          message="프로필 정보를 불러오는 중입니다."
          title="프로필 준비 중"
        />
      ) : null}

      {profileQuery.isError ? (
        <StateBlock
          message={
            profileQuery.error instanceof Error
              ? profileQuery.error.message
              : "프로필을 불러오지 못했습니다."
          }
          title="프로필 로드 실패"
        />
      ) : null}

      {profile ? (
        <>
          <SectionCard>
            <View style={styles.hero}>
              <AvatarCircle
                imageUrl={profile.avatarUrl}
                label={profile.nickname}
                size={84}
                tone="warm"
              />
              <View style={styles.heroMeta}>
                <Text style={styles.nickname}>{profile.nickname}</Text>
                <Text style={styles.meta}>
                  {profile.regionLabel} {profile.ageLabel}
                </Text>
                <Text style={styles.points}>표시 포인트 {profile.points}P</Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>한 줄 소개</Text>
            <Text style={styles.descriptionText}>
              {profile.bio || "아직 등록된 소개가 없습니다."}
            </Text>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>바로 실행</Text>
            <View style={styles.actionStack}>
              <ActionButton label="친구 요청" onPress={handleFriendRequest} />
              <ActionButton
                label={`${CHAT_SERVICE_DM_UNLOCK_AMOUNT}원으로 대화 열기`}
                onPress={() => {
                  Alert.alert(
                    "대화를 열까요?",
                    `${CHAT_SERVICE_DM_UNLOCK_AMOUNT}원이 차감될 수 있습니다.`,
                    [
                      {
                        style: "cancel",
                        text: "취소",
                      },
                      {
                        onPress: () => {
                          void handleDmOpen();
                        },
                        text: "열기",
                      },
                    ],
                  );
                }}
                variant="secondary"
              />
              <ActionButton
                label={isBlocked ? "차단 해제" : "차단하기"}
                onPress={handleBlockToggle}
                variant={isBlocked ? "secondary" : "danger"}
              />
              <ActionButton
                label="신고하기"
                onPress={handleReport}
                variant="danger"
              />
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>운영 메모</Text>
            <Text style={styles.descriptionText}>
              상대 동의 없이도 프로필 진입 후 {CHAT_SERVICE_DM_UNLOCK_AMOUNT}원
              결제로 1:1 DM을 열 수 있습니다. 수신 거부 기능은 후속 차수에서
              추가됩니다.
            </Text>
          </SectionCard>
        </>
      ) : null}
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
  hero: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  heroMeta: {
    gap: 6,
  },
  nickname: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
  },
  points: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  actionStack: {
    gap: 10,
  },
  descriptionText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
});
