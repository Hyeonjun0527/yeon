import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
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
import {
  chatServiceApi,
  chatServiceApiBaseUrl,
} from "../../../services/chat-service/client";
import { chatServiceQueryKeys } from "../../../services/chat-service/query-keys";
import { colors } from "../../../theme/colors";

export function ProfileScreen() {
  const queryClient = useQueryClient();
  const { logout, refreshSession, session } = useChatServiceSession();
  const [nickname, setNickname] = useState("");
  const [ageLabel, setAgeLabel] = useState("");
  const [regionLabel, setRegionLabel] = useState("");
  const [bio, setBio] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const profileQuery = useQuery({
    enabled: Boolean(session?.token),
    queryFn: async () => {
      return chatServiceApi.getMyChatServiceProfile(session!.token);
    },
    queryKey: chatServiceQueryKeys.profile,
  });

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    setNickname(profileQuery.data.profile.nickname);
    setAgeLabel(profileQuery.data.profile.ageLabel);
    setRegionLabel(profileQuery.data.profile.regionLabel);
    setBio(profileQuery.data.profile.bio);
    setNotificationsEnabled(profileQuery.data.profile.notificationsEnabled);
  }, [profileQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return chatServiceApi.updateMyChatServiceProfile(session!.token, {
        ageLabel: ageLabel.trim(),
        bio: bio.trim(),
        nickname: nickname.trim(),
        notificationsEnabled,
        regionLabel: regionLabel.trim(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.profile,
      });
      await refreshSession();
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (profileId: string) => {
      return chatServiceApi.unblockChatServiceProfile(
        session!.token,
        profileId,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.profile,
      });
      await queryClient.invalidateQueries({
        queryKey: chatServiceQueryKeys.friends,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return chatServiceApi.deleteMyChatServiceProfile(session!.token);
    },
    onSuccess: async () => {
      await logout();
    },
  });

  async function handleSave() {
    try {
      await updateMutation.mutateAsync();
      Alert.alert("저장 완료", "프로필 설정이 반영됐습니다.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "프로필 저장에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleDeleteAccount() {
    try {
      await deleteMutation.mutateAsync();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "계정 삭제에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleUnblock(profileId: string) {
    try {
      await unblockMutation.mutateAsync(profileId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "차단 해제에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <TopBar
        rightLabel="로그아웃"
        onRightPress={() => {
          void logout();
        }}
        subtitle="프로필, 알림, 차단, 신고, 운영 연락처를 한 곳에서 관리합니다."
        title="프로필"
      />

      {profileQuery.isLoading ? (
        <StateBlock
          loading
          message="프로필을 불러오는 중입니다."
          title="내 정보 준비 중"
        />
      ) : null}

      {profileQuery.isError ? (
        <StateBlock
          message="프로필을 가져오지 못했습니다."
          title="프로필 로드 실패"
        />
      ) : null}

      {profileQuery.data ? (
        <>
          <SectionCard>
            <View style={styles.profileHero}>
              <AvatarCircle
                imageUrl={profileQuery.data.profile.avatarUrl}
                label={profileQuery.data.profile.nickname}
                size={72}
                tone="warm"
              />
              <View style={styles.heroText}>
                <Text style={styles.heroName}>
                  {profileQuery.data.profile.nickname}
                </Text>
                <Text style={styles.heroMeta}>
                  {profileQuery.data.profile.regionLabel} ·{" "}
                  {profileQuery.data.profile.ageLabel}
                </Text>
                <Text style={styles.heroPoints}>
                  보유 포인트 {profileQuery.data.profile.points}P
                </Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>프로필 편집</Text>
            <View style={styles.formStack}>
              <TextField
                label="닉네임"
                onChangeText={setNickname}
                value={nickname}
              />
              <TextField
                label="나이 표기"
                onChangeText={setAgeLabel}
                value={ageLabel}
              />
              <TextField
                label="지역 표기"
                onChangeText={setRegionLabel}
                value={regionLabel}
              />
              <TextField
                label="소개"
                multiline
                onChangeText={setBio}
                value={bio}
              />

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>알림 받기</Text>
                  <Text style={styles.switchHint}>
                    친구 요청, DM 오픈, 새 메시지를 앱 알림으로 받습니다.
                  </Text>
                </View>
                <Switch
                  onValueChange={setNotificationsEnabled}
                  trackColor={{
                    false: colors.border,
                    true: colors.accent,
                  }}
                  value={notificationsEnabled}
                />
              </View>

              <ActionButton
                disabled={updateMutation.isPending}
                label="프로필 저장"
                onPress={handleSave}
              />
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>차단 목록</Text>
            <View style={styles.formStack}>
              {profileQuery.data.blockedProfiles.length > 0 ? (
                profileQuery.data.blockedProfiles.map((blocked) => (
                  <View key={blocked.id} style={styles.blockedRow}>
                    <View style={styles.blockedMeta}>
                      <Text style={styles.blockedName}>{blocked.nickname}</Text>
                      <Text style={styles.blockedSub}>
                        {blocked.regionLabel} {blocked.ageLabel}
                      </Text>
                    </View>
                    <ActionButton
                      label="해제"
                      onPress={() => void handleUnblock(blocked.id)}
                      variant="secondary"
                    />
                  </View>
                ))
              ) : (
                <Text style={styles.descriptionText}>
                  차단한 사용자가 없습니다.
                </Text>
              )}
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>신고 내역</Text>
            <View style={styles.formStack}>
              {profileQuery.data.reports.length > 0 ? (
                profileQuery.data.reports.map((report) => (
                  <View key={report.id} style={styles.reportRow}>
                    <Text style={styles.reportTarget}>
                      {report.targetType} · {report.status}
                    </Text>
                    <Text style={styles.reportReason}>{report.reason}</Text>
                    <Text style={styles.reportDate}>
                      {formatRelativeTime(report.createdAt)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.descriptionText}>
                  아직 접수한 신고가 없습니다.
                </Text>
              )}
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>운영 안내</Text>
            <View style={styles.formStack}>
              <Text style={styles.descriptionText}>
                운영 연락처: support@yeon.world
              </Text>
              <Text style={styles.descriptionText}>
                API 기본 주소: {chatServiceApiBaseUrl}
              </Text>
              <Text style={styles.descriptionText}>
                계정 인증 전화번호:{" "}
                {profileQuery.data.profile.phoneNumberMasked}
              </Text>
            </View>
          </SectionCard>

          <SectionCard>
            <Text style={styles.sectionTitle}>계정 관리</Text>
            <View style={styles.formStack}>
              <ActionButton
                label="계정 삭제"
                onPress={() => {
                  Alert.alert(
                    "계정을 삭제할까요?",
                    "채팅, 친구, 신고 기록이 모두 제거됩니다.",
                    [
                      {
                        style: "cancel",
                        text: "취소",
                      },
                      {
                        onPress: () => {
                          void handleDeleteAccount();
                        },
                        style: "destructive",
                        text: "삭제",
                      },
                    ],
                  );
                }}
                variant="danger"
              />
            </View>
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
  profileHero: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  heroText: {
    gap: 6,
  },
  heroName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  heroMeta: {
    color: colors.textMuted,
    fontSize: 14,
  },
  heroPoints: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },
  formStack: {
    gap: 12,
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  switchLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  switchHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    maxWidth: 240,
  },
  blockedRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  blockedMeta: {
    gap: 4,
  },
  blockedName: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "800",
  },
  blockedSub: {
    color: colors.textMuted,
    fontSize: 13,
  },
  reportRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: 10,
  },
  reportTarget: {
    color: colors.warm,
    fontSize: 12,
    fontWeight: "800",
  },
  reportReason: {
    color: colors.text,
    fontSize: 14,
  },
  reportDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  descriptionText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
