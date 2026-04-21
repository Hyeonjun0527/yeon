/**
 * card-service feature 내부의 공용 fetch 헬퍼.
 * 응답이 실패(2xx 외)일 때 서버의 한국어 message를 꺼내 Error로 던진다.
 */
export async function cardServiceFetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackErrorMessage: string,
): Promise<T> {
  const res = await fetch(input, { credentials: "include", ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    try {
      const parsed = text ? (JSON.parse(text) as { message?: string }) : null;
      throw new Error(parsed?.message || fallbackErrorMessage);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(fallbackErrorMessage);
    }
  }
  return (await res.json()) as T;
}

export async function cardServiceFetchVoid(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackErrorMessage: string,
): Promise<void> {
  const res = await fetch(input, { credentials: "include", ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    try {
      const parsed = text ? (JSON.parse(text) as { message?: string }) : null;
      throw new Error(parsed?.message || fallbackErrorMessage);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(fallbackErrorMessage);
    }
  }
}
