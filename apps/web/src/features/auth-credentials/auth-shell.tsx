import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main
      className="min-h-screen text-[#f8f7f3]"
      style={{
        background:
          "radial-gradient(circle at top, rgba(232,99,10,0.16), transparent 28%), linear-gradient(180deg, #080808 0%, #0f0f11 100%)",
      }}
    >
      <div className="w-[min(560px,calc(100%-32px))] mx-auto min-h-screen grid place-items-center py-10">
        <section className="w-full grid gap-6 p-8 rounded-[28px] border border-white/[0.08] bg-[rgba(16,17,20,0.88)] shadow-[0_28px_80px_rgba(0,0,0,0.32)] md:p-6">
          <div className="grid gap-2">
            {eyebrow ? (
              <p className="m-0 text-xs font-bold tracking-[0.16em] uppercase text-white/[0.58]">
                {eyebrow}
              </p>
            ) : null}
            <h1
              className="m-0 leading-[1.04] tracking-[-0.04em]"
              style={{ fontSize: "clamp(26px, 4.2vw, 40px)" }}
            >
              {title}
            </h1>
            {description ? (
              <p className="m-0 text-base leading-[1.65] text-white/[0.74]">
                {description}
              </p>
            ) : null}
          </div>
          {children}
          {footer ? <div className="grid gap-2">{footer}</div> : null}
        </section>
      </div>
    </main>
  );
}
