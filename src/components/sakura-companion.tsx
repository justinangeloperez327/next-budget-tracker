import { Flower2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SakuraCat({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 110"
      className={cn("text-foreground", className)}
      fill="none"
    >
      <path
        d="M27 36 24 12Q24 7 29 11L47 25Q60 21 73 25L91 11Q96 7 96 12L93 36Q103 48 100 66Q97 88 60 90Q23 88 20 66Q17 48 27 36Z"
        fill="var(--card)"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="m30 20 2 14 9-5M90 20l-2 14-9-5" fill="var(--sakura)" />
      <path
        d="M40 53q5-5 10 0M70 53q5-5 10 0"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="35" cy="63" rx="7" ry="4" fill="var(--sakura)" />
      <ellipse cx="85" cy="63" rx="7" ry="4" fill="var(--sakura)" />
      <path
        d="m57 61 3 3 3-3M60 64v4q-5 5-8 0m8 0q5 5 8 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m22 58-12-3m12 10-12 2m88-9 12-3m-12 10 12 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="37"
        y="79"
        width="46"
        height="25"
        rx="4"
        fill="var(--sakura)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M60 81v20m-16-12h9m13 0h9m-31 7h9m13 0h9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function NotebookNote({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "notebook-note flex items-center gap-4 rounded-xl border p-5",
        className,
      )}
    >
      <SakuraCat className="w-16 shrink-0" />
      <div>
        <p className="font-medium">{title}</p>
        <div className="mt-1 text-sm leading-6 text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}
export function SakuraStamp() {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-dashed bg-card px-3 py-1.5 text-xs text-primary">
      <Flower2 size={14} aria-hidden="true" />
      Sakura notebook
    </span>
  );
}
