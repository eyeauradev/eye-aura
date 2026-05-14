export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F3EE]">
      <div className="flex flex-col items-center gap-6" role="status" aria-live="polite">
        <div className="relative h-28 w-40">
          <div className="absolute inset-x-3 top-9 h-12 rounded-[100%] border-[3px] border-[#0F4F4B]" />
          <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0F4F4B] shadow-[0_0_34px_rgba(15,79,75,0.25)]" />
          <div className="absolute left-[58%] top-[36%] h-4 w-4 rounded-full bg-white" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border border-[#B5964D]/40" />
          <div className="absolute right-1 top-2 h-5 w-5 rotate-45 bg-[#B5964D]" />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.34em] text-[#0F4F4B]">
          Eye Aura
        </p>
        <span className="sr-only">Loading Eye Aura</span>
      </div>
    </main>
  );
}
