import { ApiClientError } from "@yeon/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import { ActionButton } from "../../components/ui/action-button";
import { StateBlock } from "../../components/ui/state-block";
import { TextField } from "../../components/ui/text-field";
import { TopBar } from "../../components/ui/top-bar";
import { cardServiceApi } from "../../services/card-service/client";
import { cardServiceQueryKeys } from "../../services/card-service/query-keys";
import {
  clearPrimaryAuthSessionToken,
  readPrimaryAuthSessionToken,
  writePrimaryAuthSessionToken,
} from "../../services/primary-auth/storage";
import { colors, shadow } from "../../theme/colors";

type PrimaryAuthStatus = "booting" | "signed_out" | "signed_in";

const CARD_SERVICE_DECK_DETAIL_ROUTE = "/card-service/decks/[deckId]" as Href;

function getCardServiceDeckDetailHref(deckId: string): Href {
  return {
    pathname: CARD_SERVICE_DECK_DETAIL_ROUTE,
    params: { deckId },
  } as Href;
}

export function CardDeckListScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<PrimaryAuthStatus>("booting");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");

  const decksQuery = useQuery({
    enabled: authStatus === "signed_in" && Boolean(sessionToken),
    queryFn: async () => cardServiceApi.listCardDecks(sessionToken!),
    queryKey: cardServiceQueryKeys.decks(sessionToken),
  });
  const loginMutation = useMutation({
    mutationFn: async () =>
      cardServiceApi.loginWithCredential({
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
  const createDeckMutation = useMutation({
    mutationFn: async (nextTitle: string) => {
      if (!sessionToken) {
        throw new Error("로그인이 필요합니다.");
      }
      return cardServiceApi.createCardDeck({ title: nextTitle }, sessionToken);
    },
    onSuccess: async (response) => {
      setTitle("");
      await queryClient.invalidateQueries({
        queryKey: cardServiceQueryKeys.decks(sessionToken),
      });
      router.push(getCardServiceDeckDetailHref(response.deck.id));
    },
  });

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  async function bootstrapAuth() {
    try {
      const storedToken = await readPrimaryAuthSessionToken();

      if (!storedToken) {
        setAuthStatus("signed_out");
        return;
      }

      const response = await cardServiceApi.getAuthSession(storedToken);

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
    if (sessionToken) {
      try {
        await cardServiceApi.logout(sessionToken);
      } catch {
        // Local sign-out should still win.
      }
    }

    await clearPrimaryAuthSessionToken();
    setSessionToken(null);
    setAuthStatus("signed_out");
    queryClient.removeQueries({ queryKey: cardServiceQueryKeys.all });
  }

  async function handleCreateDeck() {
    try {
      await createDeckMutation.mutateAsync(title.trim());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "덱 생성에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  if (authStatus === "booting") {
    return (
      <View style={[styles.screen, styles.center]}>
        <StateBlock
          loading
          message="Yeon 계정 세션을 확인하고 있습니다."
          title="카드 서비스 준비 중"
        />
      </View>
    );
  }

  if (authStatus === "signed_out") {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          style={styles.screen}
        >
          <TopBar
            subtitle="웹에서 만든 카드 덱을 모바일 앱에서도 학습할 수 있게 Yeon 계정으로 동기화합니다."
            title="카드 서비스"
          />
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Yeon 계정 로그인</Text>
            <TextField
              keyboardType="default"
              label="이메일"
              onChangeText={setEmail}
              placeholder="email@example.com"
              value={email}
            />
            <TextField
              label="비밀번호"
              onChangeText={setPassword}
              placeholder="비밀번호"
              secureTextEntry
              value={password}
            />
            <ActionButton
              disabled={loginMutation.isPending || !email.trim() || !password}
              label={loginMutation.isPending ? "로그인 중..." : "로그인"}
              onPress={handleLogin}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const decks = decksQuery.data?.decks ?? [];

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <TopBar
        onRightPress={handleLogout}
        rightLabel="로그아웃"
        subtitle="카드를 누르면 바로 상세/편집 화면으로 이동합니다."
        title="카드 덱"
      />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>새 덱 만들기</Text>
        <TextField
          label="덱 이름"
          onChangeText={setTitle}
          placeholder="예: 면접 질문, 독서 카드"
          value={title}
        />
        <ActionButton
          disabled={createDeckMutation.isPending || title.trim().length === 0}
          label={createDeckMutation.isPending ? "생성 중..." : "덱 추가"}
          onPress={handleCreateDeck}
        />
      </View>

      {decksQuery.isPending ? (
        <StateBlock
          loading
          message="덱 목록을 불러오는 중입니다."
          title="로딩"
        />
      ) : decksQuery.isError ? (
        <StateBlock
          message={
            decksQuery.error instanceof Error
              ? decksQuery.error.message
              : "덱 목록을 불러오지 못했습니다."
          }
          title="오류"
        />
      ) : decks.length === 0 ? (
        <StateBlock
          message="첫 덱을 만들고 질문/답변 카드를 추가해 보세요."
          title="아직 덱이 없습니다"
        />
      ) : (
        <View style={styles.deckList}>
          {decks.map((deck) => (
            <Pressable
              accessibilityRole="button"
              key={deck.id}
              onPress={() => router.push(getCardServiceDeckDetailHref(deck.id))}
              style={({ pressed }) => [
                styles.deckCard,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={styles.deckHeader}>
                <Text style={styles.deckTitle}>{deck.title}</Text>
                <Text style={styles.deckCount}>{deck.itemCount}장</Text>
              </View>
              {deck.description ? (
                <Text style={styles.deckDescription}>{deck.description}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
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
  center: {
    justifyContent: "center",
    padding: 24,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    ...shadow,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  deckCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  deckCount: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800",
  },
  deckDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  deckHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deckList: {
    gap: 12,
  },
  deckTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
  },
});
