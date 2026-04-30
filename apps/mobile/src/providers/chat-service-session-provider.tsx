import type { ChatServiceSessionDto } from "@yeon/api-contract/chat-service";
import { ApiClientError } from "@yeon/api-client";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

import { chatServiceApi } from "../services/chat-service/client";
import {
  clearChatServiceSessionToken,
  readChatServiceSessionToken,
  writeChatServiceSessionToken,
} from "../services/chat-service/storage";

type ChallengeState = {
  challengeId: string;
  phoneNumber: string;
  expiresAt: string;
  acceptAnyCode: boolean;
  debugCode: string | null;
};

type ChatServiceSessionStatus =
  | "booting"
  | "signed_out"
  | "awaiting_otp"
  | "signed_in";

type ChatServiceSessionContextValue = {
  status: ChatServiceSessionStatus;
  session: ChatServiceSessionDto | null;
  challenge: ChallengeState | null;
  requestOtp: (phoneNumber: string) => Promise<ChallengeState>;
  verifyOtp: (code: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

const ChatServiceSessionContext =
  createContext<ChatServiceSessionContextValue | null>(null);

type ChatServiceSessionProviderProps = {
  children: ReactNode;
};

export function ChatServiceSessionProvider({
  children,
}: ChatServiceSessionProviderProps) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<ChatServiceSessionDto | null>(null);
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [status, setStatus] = useState<ChatServiceSessionStatus>("booting");

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const token = await readChatServiceSessionToken();

      if (!token) {
        setStatus("signed_out");
        return;
      }

      await restoreSession(token);
    } catch {
      setSession(null);
      setChallenge(null);
      setStatus("signed_out");
    }
  }

  async function restoreSession(token: string) {
    try {
      const response = await chatServiceApi.getChatServiceSession(token);

      if (!response.authenticated || !response.session) {
        await clearChatServiceSessionToken();
        setSession(null);
        setStatus("signed_out");
        return;
      }

      setSession(response.session);
      await writeChatServiceSessionToken(response.session.token);
      setStatus("signed_in");
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.status === 401 || error.status === 403)
      ) {
        await clearChatServiceSessionToken();
      }

      setSession(null);
      setStatus("signed_out");
    }
  }

  async function requestOtp(phoneNumber: string) {
    const response = await chatServiceApi.requestChatServiceOtp({
      phoneNumber,
    });

    const nextChallenge = {
      challengeId: response.challengeId,
      phoneNumber,
      expiresAt: response.expiresAt,
      acceptAnyCode: response.acceptAnyCode,
      debugCode: response.debugCode,
    };

    setChallenge(nextChallenge);
    setStatus("awaiting_otp");
    return nextChallenge;
  }

  async function verifyOtp(code: string) {
    if (!challenge) {
      throw new Error("인증 요청이 먼저 필요합니다.");
    }

    const response = await chatServiceApi.verifyChatServiceOtp({
      challengeId: challenge.challengeId,
      phoneNumber: challenge.phoneNumber,
      code,
    });

    await writeChatServiceSessionToken(response.session.token);
    setSession(response.session);
    setChallenge(null);
    setStatus("signed_in");
    queryClient.clear();
  }

  async function refreshSession() {
    const token = await readChatServiceSessionToken();

    if (!token) {
      setSession(null);
      setStatus("signed_out");
      return;
    }

    await restoreSession(token);
  }

  async function logout() {
    const token = session?.token;

    if (token) {
      try {
        await chatServiceApi.logoutChatService(token);
      } catch {
        // noop - local sign-out should still win
      }
    }

    await clearChatServiceSessionToken();
    setSession(null);
    setChallenge(null);
    setStatus("signed_out");
    queryClient.clear();
  }

  return (
    <ChatServiceSessionContext.Provider
      value={{
        status,
        session,
        challenge,
        requestOtp,
        verifyOtp,
        refreshSession,
        logout,
      }}
    >
      {children}
    </ChatServiceSessionContext.Provider>
  );
}

export function useChatServiceSession() {
  const context = useContext(ChatServiceSessionContext);

  if (!context) {
    throw new Error(
      "ChatServiceSessionProvider 내부에서만 사용할 수 있습니다.",
    );
  }

  return context;
}
