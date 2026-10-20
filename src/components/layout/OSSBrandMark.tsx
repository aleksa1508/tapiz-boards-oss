/** Distinct pixel-board mark for the self-hosted OSS edition. */
export function OSSBrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="oss-brand-mark relative inline-block shrink-0 overflow-hidden rounded-[7px] border-2 border-current text-(--tapiz-accent)"
      style={{ width: size, height: size }}
    >
      <span className="absolute left-[19%] top-[19%] h-[23%] w-[23%] rounded-[1px] bg-current" />
      <span className="absolute right-[19%] top-[19%] h-[23%] w-[23%] rounded-[1px] bg-current opacity-40" />
      <span className="absolute bottom-[19%] left-[19%] h-[23%] w-[23%] rounded-[1px] bg-current opacity-40" />
      <span className="absolute bottom-[19%] right-[19%] h-[23%] w-[23%] rounded-[1px] bg-current" />
    </span>
  );
}
