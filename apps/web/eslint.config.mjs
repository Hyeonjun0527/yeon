import baseConfig from "../../packages/config/eslint/base.mjs";

export default [
  ...baseConfig,

  // ── 클라이언트 전체 적용 ────────────────────────────────────────────
  // 렌더링 여부와 관계없이 어디서나 금지할 패턴
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/__tests__/**", "src/**/*.test.*", "src/server/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        // ViewState: query 플래그 JSX 직접 접근 금지
        {
          selector:
            "JSXExpressionContainer MemberExpression[property.name='isLoading']",
          message:
            "JSX에서 .isLoading 직접 접근 금지. ViewState 변환 함수를 거쳐라.",
        },
        {
          selector:
            "JSXExpressionContainer MemberExpression[property.name='isPending']",
          message:
            "JSX에서 .isPending 직접 접근 금지. ViewState 변환 함수를 거쳐라.",
        },
        {
          selector:
            "JSXExpressionContainer MemberExpression[property.name='isFetching']",
          message:
            "JSX에서 .isFetching 직접 접근 금지. ViewState 변환 함수를 거쳐라.",
        },
        // ViewState: data ?? [] 기본값 금지 (미확정/빈 결과 구분 불가)
        {
          selector:
            "LogicalExpression[operator='??'][right.type='ArrayExpression'][right.elements.length=0]",
          message:
            "`data ?? []` 패턴 금지. '아직 미확정'과 '진짜 빈 결과'를 구분할 수 없게 만든다. ViewState 변환 함수에서만 처리하라.",
        },
        // async/fetch: useEffect async 콜백 금지
        {
          selector:
            "CallExpression[callee.name='useEffect'] > ArrowFunctionExpression[async=true]",
          message:
            "useEffect 콜백은 async일 수 없다. cleanup 반환값이 무시되어 race condition이 생긴다. 내부에서 즉시실행 async 함수를 선언하거나 useQuery를 사용하라.",
        },
        // async/fetch: useEffect 내부 fetch 직접 호출 금지
        // queryFn 내부의 fetch는 별도 함수로 분리하거나 queryClient.prefetchQuery 사용
        {
          selector:
            "CallExpression[callee.name='useEffect'] > :first-child CallExpression[callee.name='fetch']",
          message:
            "useEffect 안에서 fetch 직접 호출 금지. useQuery를 사용하거나 queryClient 메서드를 통해 fetch를 위임하라.",
        },
      ],
    },
  },

  // ── 페이지/화면 레벨 전용 ──────────────────────────────────────────
  // fetch 결과가 아직 미확정일 수 있는 컨텍스트에서만 적용
  // 서브 컴포넌트가 이미 확정된 props를 .length로 체크하는 건 정당함
  {
    files: [
      "src/app/**/page.tsx",
      "src/app/**/layout.tsx",
      "src/features/**/*screen*.tsx",
      "src/features/**/*page*.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXExpressionContainer BinaryExpression[operator='==='][right.value=0][left.type='MemberExpression'][left.property.name='length']",
          message:
            "페이지 레벨에서 .length === 0으로 empty 판정 금지. ViewState 변환 함수를 사용하라.",
        },
        {
          selector:
            "JSXExpressionContainer BinaryExpression[operator='>'][right.value=0][left.type='MemberExpression'][left.property.name='length']",
          message:
            "페이지 레벨에서 .length > 0으로 데이터 존재 판정 금지. ViewState 변환 함수를 사용하라.",
        },
      ],
    },
  },
];
