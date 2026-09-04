import type { Metadata } from "next";
import Link from "next/link";
import { Figtree, Fraunces, Space_Mono } from "next/font/google";
import "./globals.css";

import { AuthNav } from "@/components/AuthNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE_URL } from "@/lib/site";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const SITE_NAME = "烏鴉的天空 詩歌吉他譜";
const SITE_SHORT = "烏鴉的天空";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s｜${SITE_NAME}`,
  },
  description:
    "數位詩歌吉他譜：ChordPro 和弦、即時移調、Capo 建議，依原調分類、可搜尋，手機優先。",
  applicationName: SITE_NAME,
  formatDetection: { telephone: false },
};

// Apply the saved theme before first paint to avoid a flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem('hymnbook.theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant"
      suppressHydrationWarning
      className={`${figtree.variable} ${fraunces.variable} ${spaceMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2">
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-lg bg-accent font-mono text-sm font-bold text-accent-contrast"
              >
                ♪
              </span>
              <span className="font-display text-[17px] tracking-tight">
                {SITE_SHORT}
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/search"
                aria-label="搜尋"
                className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </Link>
              <ThemeToggle />
              <AuthNav />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          {children}
        </main>

        <footer className="mt-8 border-t border-border">
          <div className="mx-auto max-w-2xl px-4 py-5 text-xs text-muted">
            紙本詩歌本數位化 · 和弦以 ChordPro 儲存 · 內容持續轉錄中
          </div>
        </footer>
      </body>
    </html>
  );
}
