import type { CardDeckItemDto } from "@yeon/api-contract/card-decks";
import { ApiClientError } from "@yeon/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButton } from "../../components/ui/action-button";
import { StateBlock } from "../../components/ui/state-block";
import { cardServiceApi } from "../../services/card-service/client";
import { cardServiceQueryKeys } from "../../services/card-service/query-keys";
import {
  clearPrimaryAuthSessionToken,
  readPrimaryAuthSessionToken,
} from "../../services/primary-auth/storage";
import { colors } from "../../theme/colors";

const CARD_SERVICE_ROUTE = "/card-service" as Href;
const PREVIEW_MAX_LENGTH = 72;
const CARD_SERVICE_DECK_PLAY_ROUTE =
  "/card-service/decks/[deckId]/play" as Href;

const SHEET_MODES = {
  bulk: "bulk",
  manual: "manual",
} as const;

type SheetMode = (typeof SHEET_MODES)[keyof typeof SHEET_MODES];
type SheetState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; item: CardDeckItemDto };

interface ParsedCardInput {
  backText: string;
  frontText: string;
}

interface CardDeckDetailScreenProps {
  deckId?: string;
}

function getCardServiceDeckPlayHref(deckId: string): Href {
  return {
    pathname: CARD_SERVICE_DECK_PLAY_ROUTE,
    params: { deckId },
  } as Href;
}

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/\. /g, ". ")
    .replace(/\.$/, ".");
}

function toPreviewText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= PREVIEW_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, PREVIEW_MAX_LENGTH).trimEnd()}...`;
}

function parseAiCardInput(input: string): ParsedCardInput[] {
  const cards: ParsedCardInput[] = [];
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  let frontLines: string[] = [];
  let backLines: string[] = [];
  let currentSection: "front" | "back" | null = null;

  function flushCard() {
    const frontText = frontLines.join("\n").trim();
    const backText = backLines.join("\n").trim();
    if (frontText && backText) {
      cards.push({ backText, frontText });
    }
    frontLines = [];
    backLines = [];
    currentSection = null;
  }

  for (const line of lines) {
    const marker = line.trim();
    if (marker === "[[CARD]]") {
      flushCard();
      continue;
    }
    if (marker === "[[Q]]") {
      if (frontLines.length > 0 || backLines.length > 0) {
        flushCard();
      }
      currentSection = "front";
      continue;
    }
    if (marker === "[[A]]") {
      currentSection = "back";
      continue;
    }

    if (currentSection === "front") {
      frontLines.push(line);
      continue;
    }
    if (currentSection === "back") {
      backLines.push(line);
    }
  }

  flushCard();
  return cards;
}

export function CardDeckDetailScreen({ deckId }: CardDeckDetailScreenProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<
    "booting" | "signed_out" | "signed_in"
  >("booting");
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [sheetMode, setSheetMode] = useState<SheetMode>(SHEET_MODES.manual);
  const [sheetState, setSheetState] = useState<SheetState>({ kind: "closed" });
  const [activeMenuItemId, setActiveMenuItemId] = useState<string | null>(null);

  const detailQuery = useQuery({
    enabled:
      authStatus === "signed_in" && Boolean(sessionToken) && Boolean(deckId),
    queryFn: async () =>
      cardServiceApi.getCardDeckDetail(deckId!, sessionToken!),
    queryKey: deckId
      ? cardServiceQueryKeys.deck(deckId, sessionToken)
      : ["card-service", "deck", "missing"],
  });
  const createMutation = useMutation({
    mutationFn: async (params: ParsedCardInput) => {
      if (!deckId || !sessionToken) {
        throw new Error("로그인이 필요합니다.");
      }
      return cardServiceApi.createCardDeckItem(deckId, params, sessionToken);
    },
    onSuccess: async () => {
      await invalidateDeck();
    },
  });
  const bulkCreateMutation = useMutation({
    mutationFn: async () => {
      if (!deckId || !sessionToken) {
        throw new Error("로그인이 필요합니다.");
      }
      const cards = parseAiCardInput(bulkText);
      if (cards.length === 0) {
        throw new Error("인식할 수 있는 카드가 없습니다.");
      }
      for (const card of cards) {
        await cardServiceApi.createCardDeckItem(deckId, card, sessionToken);
      }
      return cards.length;
    },
    onSuccess: async (createdCount) => {
      setBulkText("");
      closeSheet();
      await invalidateDeck();
      Alert.alert("추가 완료", `${createdCount}장의 카드를 추가했습니다.`);
    },
  });
  const updateMutation = useMutation({
    mutationFn: async (params: ParsedCardInput & { itemId: string }) => {
      if (!deckId || !sessionToken) {
        throw new Error("로그인이 필요합니다.");
      }
      return cardServiceApi.updateCardDeckItem(
        deckId,
        params.itemId,
        { backText: params.backText, frontText: params.frontText },
        sessionToken,
      );
    },
    onSuccess: async () => {
      closeSheet();
      await invalidateDeck();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!deckId || !sessionToken) {
        throw new Error("로그인이 필요합니다.");
      }
      await cardServiceApi.deleteCardDeckItem(deckId, itemId, sessionToken);
    },
    onSuccess: async () => {
      setActiveMenuItemId(null);
      await invalidateDeck();
    },
  });

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  async function invalidateDeck() {
    if (!deckId) {
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: cardServiceQueryKeys.deck(deckId, sessionToken),
    });
    await queryClient.invalidateQueries({
      queryKey: cardServiceQueryKeys.decks(sessionToken),
    });
  }

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

  function openCreateSheet() {
    setFrontText("");
    setBackText("");
    setSheetMode(SHEET_MODES.manual);
    setSheetState({ kind: "create" });
  }

  function openEditSheet(item: CardDeckItemDto) {
    setFrontText(item.frontText);
    setBackText(item.backText);
    setSheetMode(SHEET_MODES.manual);
    setActiveMenuItemId(null);
    setSheetState({ item, kind: "edit" });
  }

  function closeSheet() {
    setSheetState({ kind: "closed" });
    setFrontText("");
    setBackText("");
  }

  async function handleCreateCard() {
    if (!frontText.trim() || !backText.trim()) {
      Alert.alert("입력 필요", "질문과 답변을 모두 입력해 주세요.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        backText: backText.trim(),
        frontText: frontText.trim(),
      });
      closeSheet();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "카드 추가에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleBulkCreateCards() {
    try {
      await bulkCreateMutation.mutateAsync();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "카드 추가에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  async function handleUpdateCard() {
    if (sheetState.kind !== "edit") {
      return;
    }
    if (!frontText.trim() || !backText.trim()) {
      Alert.alert("입력 필요", "질문과 답변을 모두 입력해 주세요.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        backText: backText.trim(),
        frontText: frontText.trim(),
        itemId: sheetState.item.id,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "카드 수정에 실패했습니다.";
      Alert.alert("오류", message);
    }
  }

  function handleDeleteCard(itemId: string) {
    Alert.alert("카드 삭제", "이 카드를 삭제할까요?", [
      { style: "cancel", text: "취소" },
      {
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(itemId);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "카드 삭제에 실패했습니다.";
            Alert.alert("오류", message);
          }
        },
        style: "destructive",
        text: "삭제",
      },
    ]);
  }

  if (authStatus === "booting") {
    return (
      <View style={[styles.screen, styles.center]}>
        <StateBlock loading message="세션을 확인하고 있습니다." title="로딩" />
      </View>
    );
  }

  if (authStatus === "signed_out") {
    return (
      <View style={[styles.screen, styles.center]}>
        <StateBlock
          message="카드 서비스를 먼저 로그인한 뒤 다시 열어주세요."
          title="로그인이 필요합니다"
        />
        <ActionButton
          label="카드 서비스로 이동"
          onPress={() => router.replace(CARD_SERVICE_ROUTE)}
        />
      </View>
    );
  }

  const detail = detailQuery.data;
  const cardCount = detail?.items.length ?? detail?.deck.itemCount ?? 0;
  const canSubmitManual =
    frontText.trim().length > 0 &&
    backText.trim().length > 0 &&
    !createMutation.isPending &&
    !updateMutation.isPending;
  const canSubmitBulk =
    bulkText.trim().length > 0 && !bulkCreateMutation.isPending;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
        <View style={styles.mobileHeader}>
          <Pressable
            accessibilityLabel="카드 덱 목록으로 돌아가기"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.headerIconButton}
          >
            <Text style={styles.headerIconText}>←</Text>
          </Pressable>
          <View style={styles.headerTitleBox}>
            <Text numberOfLines={1} style={styles.deckTitle}>
              {detail?.deck.title ?? "카드 덱"}
            </Text>
            <Text style={styles.deckMeta}>
              카드 {cardCount}장 · 생성일 {formatDate(detail?.deck.createdAt)}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="덱 작업 더보기"
            accessibilityRole="button"
            onPress={() =>
              Alert.alert("덱 설정", "모바일 덱 설정은 준비 중입니다.")
            }
            style={styles.headerIconButton}
          >
            <Text style={styles.headerIconText}>⋮</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!detail || cardCount === 0}
          onPress={() => {
            if (!deckId) {
              return;
            }
            router.push(getCardServiceDeckPlayHref(deckId));
          }}
          style={({ pressed }) => [
            styles.playButton,
            (!detail || cardCount === 0) && styles.disabledButton,
            pressed && detail && cardCount > 0 ? styles.pressedButton : null,
          ]}
        >
          <Text style={styles.playButtonLabel}>▶ 학습 시작</Text>
        </Pressable>

        {detailQuery.isPending ? (
          <StateBlock
            loading
            message="카드를 불러오는 중입니다."
            title="로딩"
          />
        ) : detailQuery.isError ? (
          <StateBlock
            message={
              detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "카드를 불러오지 못했습니다."
            }
            title="오류"
          />
        ) : detail && detail.items.length === 0 ? (
          <StateBlock
            message="오른쪽 아래 + 버튼으로 첫 카드를 추가해 보세요."
            title="카드가 없습니다"
          />
        ) : detail ? (
          <View style={styles.cardList}>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>카드 목록</Text>
              <Text style={styles.sectionMeta}>전체 {detail.items.length}</Text>
            </View>
            {detail.items.map((item, index) => (
              <CompactCardRow
                index={index + 1}
                isBusy={updateMutation.isPending || deleteMutation.isPending}
                isMenuOpen={activeMenuItemId === item.id}
                item={item}
                key={item.id}
                onDelete={handleDeleteCard}
                onEdit={openEditSheet}
                onToggleMenu={() =>
                  setActiveMenuItemId((current) =>
                    current === item.id ? null : item.id,
                  )
                }
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityLabel="새 카드 추가"
        accessibilityRole="button"
        onPress={openCreateSheet}
        style={styles.fab}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={closeSheet}
        transparent
        visible={sheetState.kind !== "closed"}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.backdrop} onPress={closeSheet} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTabs}>
              <Pressable
                accessibilityRole="button"
                disabled={sheetState.kind === "edit"}
                onPress={() => setSheetMode(SHEET_MODES.manual)}
                style={[
                  styles.sheetTab,
                  sheetMode === SHEET_MODES.manual && styles.sheetTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.sheetTabText,
                    sheetMode === SHEET_MODES.manual &&
                      styles.sheetTabTextActive,
                  ]}
                >
                  직접 입력
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={sheetState.kind === "edit"}
                onPress={() => setSheetMode(SHEET_MODES.bulk)}
                style={[
                  styles.sheetTab,
                  sheetMode === SHEET_MODES.bulk && styles.sheetTabActive,
                  sheetState.kind === "edit" && styles.disabledTab,
                ]}
              >
                <Text
                  style={[
                    styles.sheetTabText,
                    sheetMode === SHEET_MODES.bulk && styles.sheetTabTextActive,
                    sheetState.kind === "edit" && styles.disabledTabText,
                  ]}
                >
                  AI 형식 붙여넣기
                </Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
            >
              {sheetState.kind === "edit" ||
              sheetMode === SHEET_MODES.manual ? (
                <>
                  <Text style={styles.sheetTitle}>
                    {sheetState.kind === "edit" ? "카드 편집" : "카드 추가"}
                  </Text>
                  <LabeledTextarea
                    label="질문"
                    maxLength={500}
                    onChangeText={setFrontText}
                    placeholder="질문을 입력하세요"
                    value={frontText}
                  />
                  <LabeledTextarea
                    label="답변"
                    maxLength={1000}
                    onChangeText={setBackText}
                    placeholder="답변을 입력하세요"
                    value={backText}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={!canSubmitManual}
                    onPress={
                      sheetState.kind === "edit"
                        ? handleUpdateCard
                        : handleCreateCard
                    }
                    style={({ pressed }) => [
                      styles.sheetPrimaryButton,
                      !canSubmitManual && styles.disabledButton,
                      pressed && canSubmitManual ? styles.pressedButton : null,
                    ]}
                  >
                    <Text style={styles.sheetPrimaryLabel}>
                      {sheetState.kind === "edit"
                        ? updateMutation.isPending
                          ? "저장 중..."
                          : "수정 저장"
                        : createMutation.isPending
                          ? "추가 중..."
                          : "카드 추가"}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.sheetTitle}>AI 형식 붙여넣기</Text>
                  <Text style={styles.sheetHelp}>
                    마커가 한 줄 전체가 [[Q]], [[A]], [[CARD]]일 때만 카드로
                    인식합니다.
                  </Text>
                  <TextInput
                    multiline
                    onChangeText={setBulkText}
                    placeholder={
                      "[[Q]]\n문제\n[[A]]\n정답\n[[CARD]]\n[[Q]]\n문제\n[[A]]\n정답"
                    }
                    placeholderTextColor={colors.textMuted}
                    style={[styles.textarea, styles.bulkTextarea]}
                    textAlignVertical="top"
                    value={bulkText}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={!canSubmitBulk}
                    onPress={handleBulkCreateCards}
                    style={({ pressed }) => [
                      styles.sheetPrimaryButton,
                      !canSubmitBulk && styles.disabledButton,
                      pressed && canSubmitBulk ? styles.pressedButton : null,
                    ]}
                  >
                    <Text style={styles.sheetPrimaryLabel}>
                      {bulkCreateMutation.isPending
                        ? "추가 중..."
                        : "미리보기 후 추가"}
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

interface LabeledTextareaProps {
  label: string;
  maxLength: number;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}

function LabeledTextarea({
  label,
  maxLength,
  onChangeText,
  placeholder,
  value,
}: LabeledTextareaProps) {
  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputHeader}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Text style={styles.inputCounter}>
          {value.length}/{maxLength}
        </Text>
      </View>
      <TextInput
        maxLength={maxLength}
        multiline
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.textarea}
        textAlignVertical="top"
        value={value}
      />
    </View>
  );
}

interface CompactCardRowProps {
  index: number;
  isBusy: boolean;
  isMenuOpen: boolean;
  item: CardDeckItemDto;
  onDelete: (itemId: string) => void;
  onEdit: (item: CardDeckItemDto) => void;
  onToggleMenu: () => void;
}

function CompactCardRow({
  index,
  isBusy,
  isMenuOpen,
  item,
  onDelete,
  onEdit,
  onToggleMenu,
}: CompactCardRowProps) {
  const [isDeleteRevealed, setDeleteRevealed] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);

  function handlePressIn(event: GestureResponderEvent) {
    setStartX(event.nativeEvent.pageX);
  }

  function handlePressOut(event: GestureResponderEvent) {
    if (startX === null) {
      return;
    }

    const deltaX = event.nativeEvent.pageX - startX;
    setStartX(null);

    if (deltaX < -42) {
      setDeleteRevealed(true);
      return;
    }

    if (deltaX > 24) {
      setDeleteRevealed(false);
    }
  }

  return (
    <View style={styles.swipeShell}>
      <View style={styles.deleteRail}>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => onDelete(item.id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonLabel}>삭제</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (isDeleteRevealed) {
            setDeleteRevealed(false);
            return;
          }
          onEdit(item);
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.itemCard,
          isDeleteRevealed ? styles.itemCardRevealed : null,
        ]}
      >
        <View style={styles.indexBox}>
          <Text style={styles.indexText}>{index}</Text>
        </View>
        <View style={styles.itemContent}>
          <View style={styles.qaLine}>
            <Text style={styles.qaBadge}>질문</Text>
            <Text numberOfLines={1} style={styles.questionText}>
              {toPreviewText(item.frontText)}
            </Text>
          </View>
          <View style={styles.qaLine}>
            <Text style={styles.qaBadge}>답변</Text>
            <Text numberOfLines={1} style={styles.answerText}>
              {toPreviewText(item.backText)}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={(event) => {
            event.stopPropagation();
            onToggleMenu();
          }}
          style={styles.moreButton}
        >
          <Text style={styles.moreButtonText}>⋮</Text>
        </Pressable>
      </Pressable>
      {isMenuOpen ? (
        <View style={styles.rowMenu}>
          <Pressable onPress={() => onEdit(item)} style={styles.rowMenuButton}>
            <Text style={styles.rowMenuText}>편집</Text>
          </Pressable>
          <Pressable
            disabled={isBusy}
            onPress={() => onDelete(item.id)}
            style={styles.rowMenuButton}
          >
            <Text style={styles.rowMenuDangerText}>삭제</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  answerText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
  },
  bulkTextarea: {
    minHeight: 210,
  },
  cardList: {
    gap: 12,
    marginTop: 22,
  },
  center: {
    gap: 14,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    padding: 24,
    paddingBottom: 110,
  },
  deckMeta: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    textAlign: "center",
  },
  deckTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 32,
    textAlign: "center",
  },
  deleteButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  deleteButtonLabel: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "900",
  },
  deleteRail: {
    backgroundColor: "#FFF0EF",
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: 88,
  },
  disabledButton: {
    opacity: 0.45,
  },
  disabledTab: {
    opacity: 0.45,
  },
  disabledTabText: {
    color: colors.textMuted,
  },
  fab: {
    alignItems: "center",
    backgroundColor: colors.black,
    borderRadius: 32,
    bottom: 28,
    height: 64,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    width: 64,
  },
  fabText: {
    color: colors.white,
    fontSize: 38,
    fontWeight: "300",
    lineHeight: 42,
  },
  headerIconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerIconText: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "300",
    lineHeight: 36,
  },
  headerTitleBox: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  indexBox: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRightColor: colors.border,
    borderRightWidth: 1,
    justifyContent: "center",
    width: 58,
  },
  indexText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "500",
  },
  inputCounter: {
    color: colors.textMuted,
    fontSize: 12,
  },
  inputGroup: {
    gap: 10,
  },
  inputHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  itemCard: {
    alignItems: "stretch",
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 92,
    overflow: "hidden",
    transform: [{ translateX: 0 }],
  },
  itemCardRevealed: {
    transform: [{ translateX: -88 }],
  },
  itemContent: {
    flex: 1,
    gap: 10,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  mobileHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  moreButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  moreButtonText: {
    color: colors.textMuted,
    fontSize: 28,
    lineHeight: 30,
  },
  playButton: {
    alignItems: "center",
    backgroundColor: colors.black,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 34,
    minHeight: 88,
  },
  playButtonLabel: {
    color: colors.white,
    fontSize: 27,
    fontWeight: "800",
  },
  pressedButton: {
    opacity: 0.84,
  },
  qaBadge: {
    borderColor: colors.borderStrong,
    borderRadius: 7,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  qaLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minWidth: 0,
  },
  questionText: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 26,
  },
  rowMenu: {
    alignSelf: "flex-end",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 8,
    overflow: "hidden",
  },
  rowMenuButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowMenuDangerText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800",
  },
  rowMenuText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: 17,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  sheetContent: {
    gap: 22,
    paddingBottom: 34,
    paddingTop: 26,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "#D4D4D4",
    borderRadius: 999,
    height: 6,
    width: 66,
  },
  sheetHelp: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  sheetPrimaryButton: {
    alignItems: "center",
    backgroundColor: colors.black,
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 66,
  },
  sheetPrimaryLabel: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
  },
  sheetTab: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flex: 1,
    paddingBottom: 16,
    paddingTop: 18,
  },
  sheetTabActive: {
    borderBottomColor: colors.black,
    borderBottomWidth: 3,
  },
  sheetTabText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: "800",
  },
  sheetTabTextActive: {
    color: colors.text,
  },
  sheetTabs: {
    flexDirection: "row",
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  swipeShell: {
    borderRadius: 12,
    overflow: "hidden",
  },
  textarea: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    minHeight: 136,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
});
