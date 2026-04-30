import {
  buildLifeOsReport,
  computeLifeOsDailyMetrics,
  createEmptyLifeOsEntries,
  LIFE_OS_HOUR_BLOCKS,
  LIFE_OS_ROWS,
  type LifeOsHourEntry,
} from "@yeon/domain/life-os";
import { ApiClientError } from "@yeon/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, shadow } from "../../theme/colors";
import { lifeOsApi } from "../../services/life-os/client";
import {
  clearPrimaryAuthSessionToken,
  readPrimaryAuthSessionToken,
  writePrimaryAuthSessionToken,
} from "../../services/primary-auth/storage";

type LifeOsAuthStatus = "booting" | "signed_out" | "signed_in";

function getTodayLocalDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());
}

function formatDateLabel(localDate: string) {
  const date = new Date(`${localDate}T00:00:00+09:00`);

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "long",
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(date);
}

function createInitialEntries(): LifeOsHourEntry[] {
  return createEmptyLifeOsEntries().map((entry) => ({ ...entry }));
}

function getCellText(
  row: (typeof LIFE_OS_ROWS)[number],
  entry: LifeOsHourEntry,
) {
  if (row === "MINDSET") return entry.hour === 0 ? "오늘 기준" : "";
  if (row === "TIME") return `${entry.hour}`;
  if (row === "GOAL") return entry.goalText || "계획";
  return entry.actionText || "실행";
}

export function LifeOsScreen() {
  const queryClient = useQueryClient();
  const [authStatus, setAuthStatus] = useState<LifeOsAuthStatus>("booting");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localDate] = useState(getTodayLocalDate);
  const [mindset, setMindset] = useState("");
  const [backlogText, setBacklogText] = useState("");
  const [selectedHour, setSelectedHour] = useState(9);
  const [entries, setEntries] = useState(createInitialEntries);

  const selectedEntry =
    entries[selectedHour] ?? createInitialEntries()[selectedHour]!;
  const dayQuery = useQuery({
    enabled: authStatus === "signed_in" && Boolean(sessionToken),
    queryFn: async () => lifeOsApi.getLifeOsDay(localDate, sessionToken!),
    queryKey: ["life-os", "day", localDate, sessionToken],
  });
  const loginMutation = useMutation({
    mutationFn: async () =>
      lifeOsApi.loginWithCredential({
        email: email.trim(),
        password,
      }),
    onSuccess: async (response) => {
      await writePrimaryAuthSessionToken(response.sessionToken);
      setSessionToken(response.sessionToken);
      setAuthStatus("signed_in");
      setPassword("");
    },
  });
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!sessionToken) {
        throw new Error("로그인이 필요합니다.");
      }

      return lifeOsApi.upsertLifeOsDay(
        {
          backlogText,
          entries,
          localDate,
          mindset,
          timezone: "Asia/Seoul",
        },
        sessionToken,
      );
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: ["life-os", "day", response.day.localDate, sessionToken],
      });
      Alert.alert("저장 완료", "Life OS 기록이 동기화되었습니다.");
    },
  });

  useEffect(() => {
    void bootstrapLifeOsAuth();
  }, []);

  useEffect(() => {
    const day = dayQuery.data?.day;

    if (!day) {
      return;
    }

    setMindset(day.mindset);
    setBacklogText(day.backlogText);
    setEntries(
      createInitialEntries().map((entry) => ({
        ...entry,
        ...day.entries.find((dayEntry) => dayEntry.hour === entry.hour),
      })),
    );
  }, [dayQuery.data]);

  async function bootstrapLifeOsAuth() {
    try {
      const storedToken = await readPrimaryAuthSessionToken();

      if (!storedToken) {
        setAuthStatus("signed_out");
        return;
      }

      const response = await lifeOsApi.getAuthSession(storedToken);

      if (!response.authenticated) {
        await clearPrimaryAuthSessionToken();
        setSessionToken(null);
        setAuthStatus("signed_out");
        return;
      }

      setSessionToken(storedToken);
      setAuthStatus("signed_in");
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.status === 401 || error.status === 403)
      ) {
        await clearPrimaryAuthSessionToken();
      }

      setSessionToken(null);
      setAuthStatus("signed_out");
    }
  }

  async function handleLogin() {
    try {
      await loginMutation.mutateAsync();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "로그인에 실패했습니다.";
      Alert.alert("로그인 실패", message);
    }
  }

  async function handleLogout() {
    const token = sessionToken;

    if (token) {
      try {
        await lifeOsApi.logout(token);
      } catch {
        // Local sign-out should still win.
      }
    }

    await clearPrimaryAuthSessionToken();
    setSessionToken(null);
    setAuthStatus("signed_out");
    queryClient.removeQueries({ queryKey: ["life-os"] });
  }

  async function handleSave() {
    try {
      await saveMutation.mutateAsync();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "저장에 실패했습니다.";
      Alert.alert("저장 실패", message);
    }
  }

  function updateEntry(field: "goalText" | "actionText", value: string) {
    setEntries((current) =>
      current.map((entry) =>
        entry.hour === selectedHour ? { ...entry, [field]: value } : entry,
      ),
    );
  }

  const report = useMemo(() => {
    const metrics = computeLifeOsDailyMetrics({ entries, localDate });

    return buildLifeOsReport({
      metrics,
      periodEnd: localDate,
      periodStart: localDate,
      periodType: "daily",
    });
  }, [entries, localDate]);
  const isEditorDisabled = dayQuery.isLoading || saveMutation.isPending;

  if (authStatus === "booting") {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.metricText}>Life OS 세션을 확인하는 중입니다.</Text>
      </View>
    );
  }

  if (authStatus === "signed_out") {
    return (
      <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SELF-FIRST LIFE OS</Text>
          <Text style={styles.title}>로그인 후 기록 동기화</Text>
          <Text style={styles.subtitle}>
            모바일 앱에서는 세션 토큰을 SecureStore에 저장하고, 공용 Life OS
            API로 웹과 같은 기록을 동기화합니다.
          </Text>
        </View>
        <View style={styles.editorCard}>
          <Text style={styles.cardTitle}>Yeon 계정 로그인</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="email@example.com"
            style={styles.textInput}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="비밀번호"
            secureTextEntry
            style={styles.textInput}
            value={password}
          />
          <Pressable
            accessibilityRole="button"
            disabled={loginMutation.isPending}
            onPress={handleLogin}
            style={[
              styles.primaryButton,
              loginMutation.isPending && styles.disabledButton,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {loginMutation.isPending ? "로그인 중" : "로그인"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SELF-FIRST LIFE OS</Text>
        <Text style={styles.title}>시간별 기록장</Text>
        <Text style={styles.subtitle}>
          캘린더나 투두가 아니라, 계획과 실제 행동의 차이를 시간 단위로 남기는
          개인 실행 리포트입니다.
        </Text>
        <Pressable accessibilityRole="button" onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </View>

      <View style={styles.sheetShell}>
        <View style={styles.dayBand}>
          <Text style={styles.dayBandText}>{formatDateLabel(localDate)}</Text>
          <Text style={styles.dayBandText}>수동 hourly record</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {LIFE_OS_HOUR_BLOCKS.map((block) => (
              <View key={block.key} style={styles.block}>
                <Text style={styles.blockTitle}>{block.label}</Text>
                {LIFE_OS_ROWS.map((row) => (
                  <View key={`${block.key}-${row}`} style={styles.row}>
                    <Text style={styles.rowLabel}>{row}</Text>
                    {block.hours.map((hour) => {
                      const entry =
                        entries[hour] ?? createInitialEntries()[hour]!;
                      const isSelected = hour === selectedHour;

                      return (
                        <Pressable
                          key={`${block.key}-${row}-${hour}`}
                          accessibilityRole="button"
                          disabled={isEditorDisabled}
                          onPress={() => setSelectedHour(hour)}
                          style={[
                            styles.cell,
                            isSelected && styles.selectedCell,
                          ]}
                        >
                          <Text
                            numberOfLines={2}
                            style={[
                              styles.cellText,
                              isSelected && styles.selectedCellText,
                            ]}
                          >
                            {getCellText(row, entry)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.editorCard}>
        <Text style={styles.cardTitle}>{selectedHour}시 기록</Text>
        <TextInput
          editable={!isEditorDisabled}
          multiline
          onChangeText={(value) => updateEntry("goalText", value)}
          placeholder="GOAL"
          style={styles.textArea}
          value={selectedEntry.goalText}
        />
        <TextInput
          editable={!isEditorDisabled}
          multiline
          onChangeText={(value) => updateEntry("actionText", value)}
          placeholder="ACTION"
          style={styles.textArea}
          value={selectedEntry.actionText}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isEditorDisabled}
          onPress={handleSave}
          style={[
            styles.primaryButton,
            isEditorDisabled && styles.disabledButton,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {saveMutation.isPending ? "저장 중" : "저장"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.memoGrid}>
        <View style={styles.memoCard}>
          <Text style={styles.cardTitle}>MINDSET</Text>
          <TextInput
            editable={!isEditorDisabled}
            multiline
            onChangeText={setMindset}
            placeholder="오늘 버릴 것 / 지킬 것"
            style={styles.memoInput}
            value={mindset}
          />
        </View>
        <View style={styles.memoCard}>
          <Text style={styles.cardTitle}>Memo / Backlog</Text>
          <TextInput
            editable={!isEditorDisabled}
            multiline
            onChangeText={setBacklogText}
            placeholder="아직 시간표에 넣지 않을 생각"
            style={styles.memoInput}
            value={backlogText}
          />
        </View>
      </View>

      <View style={styles.reportCard}>
        <Text style={styles.cardTitle}>Daily report</Text>
        <Text style={styles.metricText}>
          planned {report.metrics.plannedHours}h · matched{" "}
          {report.metrics.matchedHours}h · overplanned{" "}
          {report.metrics.overplannedHours}h
        </Text>
        <Text style={styles.reportText}>
          {report.patterns[0]?.evidence ??
            "GOAL/ACTION을 기록하면 패턴이 보입니다."}
        </Text>
        <Text style={styles.reportText}>
          {report.recommendations[0]?.suggestedAdjustment ??
            "먼저 4칸만 채워도 충분합니다."}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  block: {
    borderBottomColor: colors.borderStrong,
    borderBottomWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
  },
  blockTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
    paddingLeft: 74,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },
  cell: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    marginRight: 4,
    paddingHorizontal: 6,
    width: 62,
  },
  cellText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 36,
  },
  dayBand: {
    alignItems: "center",
    backgroundColor: "#fff533",
    borderBottomColor: colors.borderStrong,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dayBandText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.5,
  },
  editorCard: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    ...shadow,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  header: {
    gap: 8,
    paddingTop: 8,
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  memoCard: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: 14,
  },
  memoGrid: {
    flexDirection: "row",
    gap: 10,
  },
  memoInput: {
    color: colors.text,
    minHeight: 92,
    textAlignVertical: "top",
  },
  metricText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  reportCard: {
    backgroundColor: "#fffde1",
    borderColor: "#f2e65a",
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  reportText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 4,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900",
    width: 70,
  },
  screen: {
    backgroundColor: colors.backgroundMuted,
    flex: 1,
  },
  selectedCell: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  selectedCellText: {
    color: colors.white,
  },
  sheetShell: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.borderStrong,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    ...shadow,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  textArea: {
    backgroundColor: colors.backgroundMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    marginBottom: 10,
    minHeight: 78,
    padding: 12,
    textAlignVertical: "top",
  },
  textInput: {
    backgroundColor: colors.backgroundMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    marginBottom: 10,
    minHeight: 48,
    padding: 12,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
  },
});
