"use client";

import { createContext, type ReactNode, useContext } from "react";

const CardServiceAuthContext = createContext<boolean | null>(null);

type CardServiceAuthProviderProps = {
  isAuthenticated: boolean;
  children: ReactNode;
};

export function CardServiceAuthProvider({
  isAuthenticated,
  children,
}: CardServiceAuthProviderProps) {
  return (
    <CardServiceAuthContext.Provider value={isAuthenticated}>
      {children}
    </CardServiceAuthContext.Provider>
  );
}

export function useIsAuthenticated(): boolean {
  const value = useContext(CardServiceAuthContext);
  if (value === null) {
    throw new Error(
      "useIsAuthenticated는 CardServiceAuthProvider 내부에서만 사용할 수 있습니다.",
    );
  }
  return value;
}
