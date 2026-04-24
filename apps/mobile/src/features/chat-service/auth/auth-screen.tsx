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
import { TextField } from "../../../components/ui/text-field";
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
      const nextChallenge = await requestOtp(phoneNumber.trim());

      if (nextChallenge.acceptAnyCode) {
        Alert.alert(
          "개발환경 인증",
          "개발환경에서는 인증번호에 아무 값이나 입력해도 입장됩니다.",
        );
      } else {
        Alert.alert("인증번호 전송", "문자로 인증번호를 보냈습니다.");
      }
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.screen}
      >
        <View style={styles.shell}>
          <View style={styles.header}>
            <Text style={styles.headerBrand}>연챗 - 익명 친구 만들기</Text>
            <Text style={styles.headerTitle}>회원가입</Text>
          </View>

          <View style={styles.formStack}>
            <View style={styles.formBlock}>
              <Text style={styles.blockTitle}>전화번호</Text>
              <TextField
                keyboardType="phone-pad"
                label="휴대폰 번호"
                onChangeText={setPhoneNumber}
                placeholder="01012345678"
                value={phoneNumber}
              />

              <ActionButton
                disabled={isSubmitting || phoneNumber.trim().length < 10}
                label={challenge ? "인증번호 다시 요청" : "인증번호 요청"}
                onPress={handleRequestOtp}
              />
            </View>

            {challenge ? (
              <View style={styles.formBlock}>
                <Text style={styles.blockTitle}>인증번호</Text>
                <TextField
                  keyboardType={
                    challenge.acceptAnyCode ? "default" : "number-pad"
                  }
                  label={challenge.acceptAnyCode ? "임의 값" : "인증번호"}
                  maxLength={challenge.acceptAnyCode ? undefined : 6}
                  onChangeText={setCode}
                  placeholder={
                    challenge.acceptAnyCode ? "아무 값이나 입력" : "6자리 숫자"
                  }
                  value={code}
                />

                <ActionButton
                  disabled={
                    isSubmitting ||
                    code.trim().length < (challenge.acceptAnyCode ? 1 : 6)
                  }
                  label="입장하기"
                  onPress={handleVerifyOtp}
                />
              </View>
            ) : null}
          </View>
        </View>
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
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  shell: {
    alignSelf: "center",
    gap: 40,
    maxWidth: 360,
    width: "100%",
  },
  header: {
    alignItems: "center",
    gap: 10,
  },
  headerBrand: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  formStack: {
    gap: 16,
  },
  formBlock: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  blockTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
});
