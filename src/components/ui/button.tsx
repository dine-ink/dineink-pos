import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Sizes are built around a 44px default (--size-touch) rather than the 32px
 * this file originally shipped with. The app runs on mounted tablets and
 * phones as much as on a desktop till, and a 32px control is comfortable with
 * a mouse but genuinely hard to hit with a wet or gloved finger mid-service.
 * `xs`/`sm` still exist for dense table rows, but never fall below 38px.
 *
 * The variant tokens (primary/muted/border/destructive…) are defined in
 * index.css. Before that they were undefined, so every utility here generated
 * no CSS and the component rendered unstyled — see the note in index.css.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-red-600",
        outline:
          "border-border bg-card text-foreground hover:bg-muted aria-expanded:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-border",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        success: "bg-success text-success-foreground hover:brightness-110",
        warning: "bg-warning text-warning-foreground hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110",
        "destructive-outline":
          "border-destructive/40 bg-card text-destructive hover:bg-destructive/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4",
        xs: "h-[2.375rem] gap-1 rounded-lg px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-10 px-3 text-[0.8125rem]",
        lg: "h-13 px-5 text-base",
        icon: "size-11",
        "icon-xs": "size-[2.375rem] rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-10",
        "icon-lg": "size-13",
        /** Full-width primary action — the standard shape for a form footer on a phone. */
        block: "h-12 w-full px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
