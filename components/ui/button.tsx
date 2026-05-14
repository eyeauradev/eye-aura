import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_18px_36px_rgba(15,79,75,0.22)] hover:-translate-y-0.5 hover:bg-[#0b403d]",
        secondary:
          "bg-secondary text-white shadow-[0_18px_36px_rgba(181,150,77,0.22)] hover:-translate-y-0.5 hover:bg-[#9f833f]",
        outline:
          "border border-primary/20 bg-white/50 text-primary backdrop-blur hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/80",
        ghost: "text-primary hover:bg-primary/8",
      },
      size: {
        default: "min-h-12 px-6",
        lg: "min-h-14 px-8 text-base",
        icon: "h-12 w-12 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
