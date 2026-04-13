import type { Metadata } from "next";

import {
  SITE_BRAND_NAME,
  SITE_SUPPORT_EMAIL,
} from "@/lib/site-brand";

export const metadata: Metadata = {
  title: `개인정보 처리방침 | ${SITE_BRAND_NAME}`,
};

export default function PrivacyPage() {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "80px 24px",
        fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
        color: "#171717",
        lineHeight: 1.8,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        개인정보 처리방침
      </h1>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 48 }}>
        최종 수정일: 2026년 4월 10일
      </p>

      <Section title="1. 개인정보의 수집 및 이용 목적">
        <p>
          {SITE_BRAND_NAME}(이하 "서비스")은 교육기관 운영자 및 멘토가
          수강생을 효율적으로 관리하고 멘토링을 기록할 수 있도록 돕는
          플랫폼입니다. 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.
        </p>
      </Section>

      <Section title="2. 수집하는 개인정보 항목">
        <table style={tableStyle}>
          <thead>
            <tr>
              <Th>항목</Th>
              <Th>수집 목적</Th>
              <Th>보유 기간</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>이름, 이메일, 프로필 사진 (소셜 로그인)</Td>
              <Td>회원 식별 및 로그인</Td>
              <Td>회원 탈퇴 시까지</Td>
            </tr>
            <tr>
              <Td>수강생 이름, 이메일, 전화번호</Td>
              <Td>수강생 관리 및 상담 기록</Td>
              <Td>서비스 이용 종료 시까지</Td>
            </tr>
            <tr>
              <Td>멘토링 녹음 파일 및 AI 요약본</Td>
              <Td>상담 기록 보관 및 분석</Td>
              <Td>삭제 요청 시까지</Td>
            </tr>
            <tr>
              <Td>OneDrive · Google Drive OAuth 토큰</Td>
              <Td>클라우드 파일 연동</Td>
              <Td>연결 해제 시까지</Td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="3. 개인정보의 제3자 제공">
        <p>
          서비스는 수집한 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.
          다만, 아래의 경우는 예외로 합니다.
        </p>
        <ul style={ulStyle}>
          <li>이용자가 사전에 동의한 경우</li>
          <li>법령에 의거하거나 수사 목적으로 기관의 요청이 있는 경우</li>
        </ul>
      </Section>

      <Section title="4. 개인정보 처리 위탁">
        <table style={tableStyle}>
          <thead>
            <tr>
              <Th>수탁 업체</Th>
              <Th>위탁 업무</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>Cloudflare (R2)</Td>
              <Td>녹음 파일 저장</Td>
            </tr>
            <tr>
              <Td>OpenAI</Td>
              <Td>AI 텍스트 분석 및 요약</Td>
            </tr>
            <tr>
              <Td>Neon / PostgreSQL</Td>
              <Td>데이터베이스 운영</Td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="5. 이용자의 권리">
        <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul style={ulStyle}>
          <li>개인정보 열람 요청</li>
          <li>개인정보 정정·삭제 요청</li>
          <li>개인정보 처리 정지 요청</li>
          <li>계정 탈퇴 및 데이터 삭제 요청</li>
        </ul>
        <p>요청은 아래 연락처로 문의해주시면 지체 없이 처리하겠습니다.</p>
      </Section>

      <Section title="6. 쿠키 사용">
        <p>
          서비스는 로그인 세션 유지를 위해 쿠키를 사용합니다. 브라우저 설정에서
          쿠키를 비활성화할 수 있으나, 이 경우 서비스 이용이 제한될 수 있습니다.
        </p>
      </Section>

      <Section title="7. 개인정보 보호책임자">
        <p>개인정보 처리에 관한 문의사항은 아래로 연락해주세요.</p>
        <ul style={ulStyle}>
          <li>서비스명: {SITE_BRAND_NAME}</li>
          <li>
            이메일:{" "}
            <a
              href={`mailto:${SITE_SUPPORT_EMAIL}`}
              style={{ color: "#2563eb", textDecoration: "underline" }}
            >
              {SITE_SUPPORT_EMAIL}
            </a>
          </li>
        </ul>
      </Section>

      <Section title="8. 방침 변경">
        <p>
          본 방침은 법령 또는 서비스 변경에 따라 수정될 수 있으며, 변경 시
          서비스 내 공지를 통해 안내합니다.
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontSize: 17,
          fontWeight: 700,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: "1px solid #e5e5e5",
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 15, color: "#333" }}>{children}</div>
    </section>
  );
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  marginTop: 8,
};

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 12px",
        background: "#f5f5f5",
        borderBottom: "1px solid #e5e5e5",
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "10px 12px",
        borderBottom: "1px solid #f0f0f0",
        color: "#444",
      }}
    >
      {children}
    </td>
  );
}

const ulStyle: React.CSSProperties = {
  paddingLeft: 20,
  margin: "8px 0",
};
