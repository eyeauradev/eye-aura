"use client";

import Image from "next/image";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F3EE]">
      <div className="flex flex-col items-center gap-6" role="status" aria-live="polite">
        <div className="relative h-32 w-32">
          {/* Pulse ring effect */}
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#B5964D]/30" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-2 animate-ping rounded-full border border-[#0F4F4B]/20" style={{ animationDuration: '3s' }} />
          
          {/* Background circle */}
          <div className="absolute inset-0 rounded-full bg-[#f7f3ee] shadow-[0_0_40px_rgba(15,79,75,0.15)]" />
          
          {/* Eye image with blink animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-eye-blink">
              <Image
                src="/eye.png"
                alt="Eye Aura"
                width={96}
                height={96}
                className="rounded-full object-contain drop-shadow-lg"
                priority
              />
            </div>
          </div>
          </div>
        <span className="sr-only">Loading Eye Aura</span>
      </div>

      <style jsx>{`
        @keyframes eyeBlink {
          0%, 88%, 100% {
            transform: scaleY(1);
            opacity: 1;
          }
          92%, 96% {
            transform: scaleY(0.05);
            opacity: 0.8;
          }
        }

        .animate-eye-blink {
          animation: eyeBlink 4s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>
    </main>
  );
}
