"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

function Sheet({ ...props }: React.ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof Dialog.Trigger>) {
  return <Dialog.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof Dialog.Close>) {
  return <Dialog.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({
  className,
  side = "left",
  children,
  ...props
}: React.ComponentProps<typeof Dialog.Content> & { side?: "left" | "right" }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(42,33,28,0.45)]" />
      <Dialog.Content
        aria-describedby={undefined}
        className={cn(
          "fixed z-50 flex h-full w-[min(100%,22rem)] flex-col gap-3 bg-card p-4 shadow-xl outline-none",
          side === "left" ? "inset-y-0 left-0 border-r border-border" : "inset-y-0 right-0 border-l border-border",
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close
          className="absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close"
        >
          ×
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("pr-10", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title className={cn("font-serif text-xl text-foreground", className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle };
