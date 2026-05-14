import * as React from "react";
import { cn } from "@/lib/utils";

type SectionContainerProps = React.HTMLAttributes<HTMLElement> & {
  id?: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
};

export function SectionContainer({
  id,
  eyebrow,
  title,
  intro,
  className,
  children,
  ...props
}: SectionContainerProps) {
  return (
    <section id={id} className={cn("relative px-5 py-20 sm:px-8 lg:py-28", className)} {...props}>
      <div className="mx-auto max-w-7xl">
        {(eyebrow || title || intro) && (
          <div className="mx-auto mb-12 max-w-3xl text-center">
            {eyebrow ? (
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-secondary">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="font-display text-4xl leading-tight text-primary sm:text-5xl">
                {title}
              </h2>
            ) : null}
            {intro ? (
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                {intro}
              </p>
            ) : null}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
