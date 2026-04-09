import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 이용약관 | Yeon",
};

export default function TermsPage() {
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
        서비스 이용약관
      </h1>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 48 }}>
        최종 수정일: 2026년 4월 10일
      </p>

      <Section title="제1조 (목적)">
        <p>
          본 약관은 Yeon(이하 "서비스")이 제공하는 교육기관 관리 플랫폼의 이용과
          관련하여 서비스와 이용자 간의 권리, 의무 및 책임 사항을 규정함을
          목적으로 합니다.
        </p>
      </Section>

      <Section title="제2조 (정의)">
        <ul style={ulStyle}>
          <li>
            <strong>"서비스"</strong>란 Yeon이 제공하는 수강생 관리, 멘토링 기록,
            AI 분석 등 일체의 서비스를 말합니다.
          </li>
          <li>
            <strong>"이용자"</strong>란 본 약관에 동의하고 서비스를 이용하는
            운영자 및 멘토를 말합니다.
          </li>
          <li>
            <strong>"수강생"</strong>이란 이용자가 서비스 내에서 관리하는
            교육 프로그램 참여자를 말합니다.
          </li>
        </ul>
      </Section>

      <Section title="제3조 (약관의 효력 및 변경)">
        <p>
          본 약관은 서비스 내 공지 또는 이메일을 통해 이용자에게 공시함으로써
          효력이 발생합니다. 서비스는 필요한 경우 약관을 변경할 수 있으며,
          변경된 약관은 공지 후 7일이 경과하면 효력이 발생합니다.
        </p>
      </Section>

      <Section title="제4조 (서비스 제공)">
        <p>서비스는 다음과 같은 기능을 제공합니다.</p>
        <ul style={ulStyle}>
          <li>수강생 등록 및 관리 (스페이스 단위 그룹핑)</li>
          <li>멘토링·상담 녹음 및 AI 자동 전사·요약</li>
          <li>OneDrive · Google Drive 연동을 통한 수강생 일괄 가져오기</li>
          <li>수강생 위험도 분석 및 상담 기록 관리</li>
        </ul>
        <p>
          서비스는 점검, 장애, 또는 기타 사유로 일시적으로 중단될 수 있습니다.
        </p>
      </Section>

      <Section title="제5조 (이용자의 의무)">
        <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul style={ulStyle}>
          <li>타인의 개인정보를 무단으로 수집·이용하는 행위</li>
          <li>서비스의 정상적인 운영을 방해하는 행위</li>
          <li>서비스를 통해 얻은 정보를 무단으로 제3자에게 제공하는 행위</li>
          <li>서비스의 지적재산권을 침해하는 행위</li>
          <li>법령 또는 공서양속에 반하는 행위</li>
        </ul>
      </Section>

      <Section title="제6조 (개인정보 보호)">
        <p>
          서비스의 개인정보 처리에 관한 사항은{" "}
          <a
            href="/privacy"
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            개인정보 처리방침
          </a>
          에 따릅니다.
        </p>
      </Section>

      <Section title="제7조 (서비스 이용 제한)">
        <p>
          서비스는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을
          방해하는 경우 서비스 이용을 제한하거나 계정을 해지할 수 있습니다.
        </p>
      </Section>

      <Section title="제8조 (면책 조항)">
        <p>
          서비스는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로
          인한 서비스 장애에 대해 책임을 지지 않습니다. 또한 이용자의 귀책사유로
          인한 손해에 대해서도 책임을 지지 않습니다.
        </p>
      </Section>

      <Section title="제9조 (분쟁 해결)">
        <p>
          서비스 이용과 관련하여 발생한 분쟁은 대한민국 법률에 따르며, 관할
          법원은 민사소송법에 따른 법원으로 합니다.
        </p>
      </Section>

      <Section title="문의">
        <ul style={ulStyle}>
          <li>서비스명: Yeon</li>
          <li>이메일: wschoi809@naver.com</li>
        </ul>
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

const ulStyle: React.CSSProperties = {
  paddingLeft: 20,
  margin: "8px 0",
};
