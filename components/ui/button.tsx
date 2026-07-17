import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "motion-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-[14.5px] font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-larimar-deep focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:translate-y-0",
  {
    variants: {
      variant: {
        primary: "bg-amber text-white shadow-sm hover:bg-amber-deep hover:shadow-md",
        ghost: "bg-transparent border border-line-2 text-text hover:border-primary hover:bg-white",
        dark: "bg-primary text-white hover:bg-primary-2",
        outline: "border border-line bg-white text-text hover:border-larimar-deep",
      },
      size: {
        default: "h-11 px-5 py-3",
        lg: "h-12 px-6 py-3.5 text-[15.5px]",
        sm: "h-9 px-3.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
);
Button.displayName = "Button";

export interface AnchorButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof buttonVariants> {}

export function ButtonLink({ className, variant, size, ...props }: AnchorButtonProps) {
  return <a className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
