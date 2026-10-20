import Link from "next/link";
import { AuthLeftPanel } from "@/features/auth/AuthLeftPanel";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { OSSBrandMark } from "@/components/layout/OSSBrandMark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page min-h-screen flex">
      <AuthLeftPanel />
      <main className="auth-main relative flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="auth-controls absolute top-4 right-4 flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <div className="auth-mobile-brand lg:hidden mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight">
            <OSSBrandMark size={30} />
            <span>Tapiz Boards <span className="oss-text-tag">OSS</span></span>
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
