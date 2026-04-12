"use client";

import { createApiClient } from "@yeon/api-client";
import { useCallback, useState } from "react";

const apiClient = createApiClient();

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await apiClient.logout();
      window.location.assign("/");
    } catch (error) {
      console.error(error);
      setIsLoggingOut(false);
      window.alert("로그아웃을 처리하지 못했습니다. 다시 시도해 주세요.");
    }
  }, [isLoggingOut]);

  return {
    isLoggingOut,
    logout,
  };
}
