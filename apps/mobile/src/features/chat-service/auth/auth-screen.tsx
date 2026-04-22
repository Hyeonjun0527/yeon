import { Redirect } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { useChatServiceSession } from "../../../providers/chat-service-session-provider";
import { colors } from "../../../theme/colors";

export function AuthScreen() {
  const { challenge, requestOtp, status, verifyOtp } = useChatServiceSession();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === "signed_in") {
    return <Redirect href="/(tabs)/feed" />;
  }

  async function handleRequestOtp() {
    try {
      setIsSubmitting(true);
      await requestOtp(phoneNumber.trim());
      Alert.alert("인증번호 전송", "전화번호 인증 준비가 완료됐습니다.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "인증번호 요청에 실패했습니다.";
      Alert.alert("오류", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    try {
      setIsSubmitting(true);
      await verifyOtp(code.trim());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "인증번호 확인에 실패했습니다.";
      Alert.alert("오류", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboard}
    >
      <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
        <TopBar
          subtitle="전화번호 인증으로 바로 입장하는 모바일 전용 커뮤니티"
          title="chat-service"
        />

        {status === "booting" ? (
          <StateBlock
            loading
            message="저장된 세션을 확인하고 있습니다."
            title="세션 확인 중"
          />
        ) : null}

        <SectionCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>1단계</Text>
            <Text style={styles.sectionTitle}>전화번호 입력</Text>
            <Text style={styles.sectionDescription}>
              소셜로그인 없이 서비스 전용 인증만 사용합니다.
            </Text>
          </View>

          <TextField
            keyboardType="phone-pad"
            label="전화번호"
            onChangeText={setPhoneNumber}
            placeholder="01012345678"
            value={phoneNumber}
          />

          <ActionButton
            disabled={isSubmitting || phoneNumber.trim().length < 10}
            label="인증번호 요청"
            onPress={handleRequestOtp}
          />
        </SectionCard>

        {challenge ? (
          <SectionCard>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>2단계</Text>
              <Text style={styles.sectionTitle}>인증번호 확인</Text>
              <Text style={styles.sectionDescription}>
                {challenge.phoneNumber} 로 요청한 인증을 마무리합니다.
              </Text>
            </View>

            <TextField
              keyboardType="number-pad"
              label="6자리 코드"
              maxLength={6}
              onChangeText={setCode}
              placeholder="123456"
              value={code}
            />

            {challenge.debugCode ? (
              <View style={styles.debugPanel}>
                <Text style={styles.debugLabel}>개발용 코드</Text>
                <Text style={styles.debugCode}>{challenge.debugCode}</Text>
                <Text style={styles.debugHint}>
                  운영 환경에서는 이 값이 내려오지 않습니다.
                </Text>
              </View>
            ) : null}

            <ActionButton
              disabled={isSubmitting || code.trim().length !== 6}
              label="입장하기"
              onPress={handleVerifyOtp}
            />
          </SectionCard>
        ) : null}
      </ScrollView>
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
  content: {
    gap: 18,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionHeader: {
    gap: 6,
    marginBottom: 14,
  },
  sectionEyebrow: {
    color: colors.warm,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  sectionDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  debugPanel: {
    backgroundColor: colors.backgroundMuted,
    borderRadius: 18,
    gap: 4,
    padding: 14,
  },
  debugLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  debugCode: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 8,
  },
  debugHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
