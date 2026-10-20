import { PublicNav } from "@/components/layout/PublicNav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-ink-100 text-txt-1">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 15% 0%, rgba(25,159,112,0.12), transparent 32rem), linear-gradient(180deg, var(--color-ink-200), var(--color-ink-100) 18rem)",
        }}
      />
      <PublicNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
