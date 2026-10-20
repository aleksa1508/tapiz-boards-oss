import type { Metadata } from "next";
import "@tapizlabs/ui/fonts";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppToastProvider } from "@/components/layout/AppToastProvider";
import { DevEnvironmentBadge } from "@/components/layout/DevEnvironmentBadge";
import { HTML_LANGS } from "@/i18n/config";
import { getDict, getLocale } from "@/i18n/server";
import { I18nProvider } from "@/i18n/I18nProvider";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  const name = "Tapiz Boards OSS";
  const description = dict.meta.description;
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3004";
  return {
    title: { default: name, template: `%s | ${name}` },
    description,
    metadataBase: new URL(url),
    openGraph: {
      title: name,
      description,
      url,
      siteName: name,
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      images: ["/og-image.png"],
    },
  };
}

const themeInitScript = `
var root = document.documentElement;
try {
  var t = localStorage.getItem("tb-theme");
  root.classList.toggle("dark", t === "dark");
} catch (e) {
  // default light
}
// Apply the chosen skin synchronously, before hydration, so the app never
// flashes the default brand for a frame before useApplySkin swaps to the
// user's skin. Skins only apply where useApplySkin is mounted (app shell +
// auth); landing/public routes keep the fixed brand, so gate on path. The
// root "/" is landing-or-dashboard, so treat it as public to protect the
// logged-out landing (a logged-in root dashboard may flash brand for a frame).
try {
  var p = location.pathname;
  var isPublic =
    p === "/" ||
    p === "/changelog" ||
    p === "/status" ||
    p === "/privacy-policy" ||
    p === "/terms-of-service" ||
    p.indexOf("/board/") === 0;
  var skin = localStorage.getItem("tb-skin");
  if (!isPublic && skin && skin !== "default") {
    root.setAttribute("data-skin", skin);
  } else {
    root.removeAttribute("data-skin");
  }
} catch (e) {
  root.removeAttribute("data-skin");
}
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = await getDict();
  return (
    <html
      lang={HTML_LANGS[locale]}
      className="h-full antialiased"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Inline <script>, ne next/script: beforeInteractive se u App Routeru učitava
            kao zaseban fajl pa stigne tek posle prvog paint-a → flash pogrešne teme. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale} dict={dict}>
          <ThemeProvider>
            <AppToastProvider>{children}</AppToastProvider>
          </ThemeProvider>
        </I18nProvider>
        <DevEnvironmentBadge />
      </body>
    </html>
  );
}
