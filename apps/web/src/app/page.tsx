const endpoints = [
  {
    method: "GET",
    path: "/api/health",
    description: "앱 런타임 상태와 배포 후 헬스체크를 확인합니다.",
  },
  {
    method: "GET",
    path: "/api/v1/users",
    description: "현재 저장된 사용자 목록을 조회합니다.",
  },
  {
    method: "POST",
    path: "/api/v1/users",
    description: "이메일 기준으로 사용자를 생성합니다.",
  },
];

const deploymentSteps = [
  "main 반영 시 GitHub Actions가 이미지를 빌드합니다.",
  "GHCR에 linux/amd64, linux/arm64 이미지를 publish합니다.",
  "Raspberry Pi SSH secret이 설정되어 있으면 compose pull + up -d까지 이어집니다.",
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "56px 20px",
      }}
    >
      <section
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "32px",
          borderRadius: "24px",
          backgroundColor: "rgba(255,255,255,0.82)",
          boxShadow: "0 28px 80px rgba(15, 23, 42, 0.08)",
          backdropFilter: "blur(18px)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#2563eb",
          }}
        >
          yeon deployment check
        </p>
        <h1
          style={{
            margin: "12px 0 0",
            fontSize: "40px",
            lineHeight: 1.1,
          }}
        >
          CI, GHCR, Raspberry Pi 배포 흐름을 한 화면에서 확인할 수 있게 정리했습니다.
        </h1>
        <p
          style={{
            margin: "16px 0 0",
            maxWidth: "680px",
            fontSize: "16px",
            lineHeight: 1.7,
            color: "#4b5563",
          }}
        >
          홈 화면과 API 두 개만으로도 빌드, 컨테이너 실행, reverse proxy 뒤
          헬스체크까지 바로 검증할 수 있습니다.
        </p>

        <div
          style={{
            display: "grid",
            gap: "10px",
            marginTop: "24px",
            padding: "18px 20px",
            border: "1px solid #dbeafe",
            borderRadius: "18px",
            backgroundColor: "#eff6ff",
          }}
        >
          <strong style={{ fontSize: "15px" }}>배포 흐름</strong>
          <ol
            style={{
              margin: 0,
              paddingLeft: "20px",
              display: "grid",
              gap: "8px",
              color: "#1e3a8a",
            }}
          >
            {deploymentSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div
          style={{
            display: "grid",
            gap: "12px",
            marginTop: "28px",
          }}
        >
          {endpoints.map((endpoint) => (
            <article
              key={endpoint.path}
              style={{
                display: "grid",
                gap: "6px",
                padding: "18px 20px",
                border: "1px solid #e5e7eb",
                borderRadius: "18px",
                backgroundColor: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <strong
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "64px",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    backgroundColor:
                      endpoint.method === "GET" ? "#dbeafe" : "#dcfce7",
                    color: endpoint.method === "GET" ? "#1d4ed8" : "#166534",
                    fontSize: "12px",
                  }}
                >
                  {endpoint.method}
                </strong>
                <code>{endpoint.path}</code>
              </div>
              <span style={{ color: "#6b7280" }}>{endpoint.description}</span>
              <a
                href={endpoint.path}
                style={{
                  width: "fit-content",
                  marginTop: "4px",
                  color: "#2563eb",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                응답 확인하기
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
