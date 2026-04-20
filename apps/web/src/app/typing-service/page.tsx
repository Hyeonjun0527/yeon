import type { Metadata } from "next";
import Script from "next/script";
import {
  TYPING_FAQS,
  TYPING_PAGE_DESCRIPTION,
  TYPING_PAGE_TITLE,
  TYPING_SEO_KEYWORDS,
  TypingServiceHome,
} from "@/features/typing-service";

export const metadata: Metadata = {
  title: TYPING_PAGE_TITLE,
  description: TYPING_PAGE_DESCRIPTION,
  keywords: [...TYPING_SEO_KEYWORDS],
  alternates: {
    canonical: "/typing-service",
  },
  openGraph: {
    title: TYPING_PAGE_TITLE,
    description: TYPING_PAGE_DESCRIPTION,
    url: "/typing-service",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TYPING_PAGE_TITLE,
    description: TYPING_PAGE_DESCRIPTION,
  },
};

function getTypingServiceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "YEON 타자연습",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        description: TYPING_PAGE_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KRW",
        },
        url: "https://yeon.world/typing-service",
      },
      {
        "@type": "FAQPage",
        mainEntity: TYPING_FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };
}

export default function TypingServicePage() {
  return (
    <>
      <Script
        id="typing-service-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getTypingServiceJsonLd()),
        }}
      />
      <TypingServiceHome />
    </>
  );
}
