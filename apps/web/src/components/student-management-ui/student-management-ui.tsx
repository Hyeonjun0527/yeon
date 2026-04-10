import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

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

const badgeToneStyles: Record<StudentManagementBadgeTone, string> = {
  accent: "bg-[#153b50] text-[#f9f6ef] border-[#153b50]",
  info: "bg-[rgba(37,99,235,0.1)] text-[#1d4ed8]",
  danger: "bg-[rgba(190,24,93,0.1)] text-[#9d174d]",
  warning: "bg-[rgba(202,138,4,0.14)] text-[#854d0e]",
  success: "bg-[rgba(22,101,52,0.1)] text-[#166534]",
  neutral: "bg-[rgba(21,59,80,0.08)] text-[#153b50]",
  ghost: "bg-[rgba(255,255,255,0.72)] text-[#153b50]",
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
    <div
      className={cx(
        "flex flex-wrap justify-between gap-4 items-start max-[720px]:justify-start",
        className,
      )}
    >
      <div className="grid gap-2">
        <p className="m-0 text-xs font-bold tracking-[0.12em] uppercase text-[#153b50]">
          {eyebrow}
        </p>
        <TitleTag
          className={cx(
            "m-0 text-[#132238] tracking-[-0.03em]",
            titleLevel === "h2"
              ? "text-[clamp(22px,3vw,30px)] leading-[1.25]"
              : "text-lg leading-[1.45]",
          )}
        >
          {title}
        </TitleTag>
        {description ? (
          <p className="m-0 text-sm leading-[1.65] text-[rgba(19,34,56,0.72)]">
            {description}
          </p>
        ) : null}
      </div>
      {meta ? (
        <p className="m-0 text-sm leading-[1.65] text-[rgba(19,34,56,0.72)]">
          {meta}
        </p>
      ) : null}
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
        "inline-flex items-center justify-center min-h-[46px] px-[18px] rounded-[999px] no-underline font-[inherit] cursor-pointer transition-[background-color,border-color,color,box-shadow] duration-[180ms] ease-out",
        variant === "primary"
          ? "border border-[#153b50] bg-[#153b50] text-[#f8fafc] shadow-[0_14px_28px_rgba(21,59,80,0.16)] hover:bg-[#0f2e3f] hover:border-[#0f2e3f] focus-visible:bg-[#0f2e3f] focus-visible:border-[#0f2e3f]"
          : "border border-[rgba(19,34,56,0.14)] bg-transparent text-[#132238] hover:bg-[rgba(255,255,255,0.7)] hover:border-[rgba(19,34,56,0.28)] focus-visible:bg-[rgba(255,255,255,0.7)] focus-visible:border-[rgba(19,34,56,0.28)]",
        "max-[720px]:w-full",
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
        "inline-flex items-center justify-center min-h-[46px] px-[18px] rounded-[999px] font-[inherit] cursor-pointer transition-[background-color,border-color,color,box-shadow] duration-[180ms] ease-out",
        variant === "primary"
          ? "border border-[#153b50] bg-[#153b50] text-[#f8fafc] shadow-[0_14px_28px_rgba(21,59,80,0.16)] hover:bg-[#0f2e3f] hover:border-[#0f2e3f] focus-visible:bg-[#0f2e3f] focus-visible:border-[#0f2e3f]"
          : "border border-[rgba(19,34,56,0.14)] bg-transparent text-[#132238] hover:bg-[rgba(255,255,255,0.7)] hover:border-[rgba(19,34,56,0.28)] focus-visible:bg-[rgba(255,255,255,0.7)] focus-visible:border-[rgba(19,34,56,0.28)]",
        "max-[720px]:w-full",
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
    <span
      className={cx(
        "inline-flex items-center justify-center min-h-[32px] px-3 rounded-[999px] border border-[rgba(19,34,56,0.12)] text-xs font-bold",
        badgeToneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
