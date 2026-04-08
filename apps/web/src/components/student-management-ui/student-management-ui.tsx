import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import styles from "./student-management-ui.module.css";

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export type StudentManagementBadgeTone =
  | "accent"
  | "info"
  | "danger"
  | "warning"
  | "success"
  | "neutral"
  | "ghost";

type StudentManagementSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  meta?: string;
  titleLevel?: "h2" | "h3";
  className?: string;
};

type StudentManagementLinkButtonProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  href: string;
  variant?: "primary" | "secondary";
};

type StudentManagementButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

type StudentManagementBadgeProps = {
  children: ReactNode;
  tone?: StudentManagementBadgeTone;
  className?: string;
};

const badgeToneClassNameMap: Record<StudentManagementBadgeTone, string> = {
  accent: styles.badgeAccent,
  info: styles.badgeInfo,
  danger: styles.badgeDanger,
  warning: styles.badgeWarning,
  success: styles.badgeSuccess,
  neutral: styles.badgeNeutral,
  ghost: styles.badgeGhost,
};

export function StudentManagementSectionHeader({
  eyebrow,
  title,
  description,
  meta,
  titleLevel = "h2",
  className,
}: StudentManagementSectionHeaderProps) {
  const TitleTag = titleLevel;

  return (
    <div className={cx(styles.sectionHeader, className)}>
      <div className={styles.sectionHeaderBody}>
        <p className={styles.sectionEyebrow}>{eyebrow}</p>
        <TitleTag
          className={cx(
            styles.sectionTitle,
            titleLevel === "h2" ? styles.sectionTitleH2 : styles.sectionTitleH3,
          )}
        >
          {title}
        </TitleTag>
        {description ? (
          <p className={styles.sectionDescription}>{description}</p>
        ) : null}
      </div>
      {meta ? <p className={styles.sectionMeta}>{meta}</p> : null}
    </div>
  );
}

export function StudentManagementLinkButton({
  href,
  variant = "primary",
  className,
  children,
  ...props
}: StudentManagementLinkButtonProps) {
  return (
    <Link
      href={href}
      className={cx(
        styles.actionButton,
        variant === "primary"
          ? styles.actionButtonPrimary
          : styles.actionButtonSecondary,
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function StudentManagementButton({
  variant = "primary",
  className,
  type = "button",
  children,
  ...props
}: StudentManagementButtonProps) {
  return (
    <button
      className={cx(
        styles.actionButton,
        variant === "primary"
          ? styles.actionButtonPrimary
          : styles.actionButtonSecondary,
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function StudentManagementBadge({
  children,
  tone = "neutral",
  className,
}: StudentManagementBadgeProps) {
  return (
    <span className={cx(styles.badge, badgeToneClassNameMap[tone], className)}>
      {children}
    </span>
  );
}
