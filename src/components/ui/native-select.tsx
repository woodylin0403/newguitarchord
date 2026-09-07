import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A native <select> styled to match <Input>. Native is deliberate — the OS
 * picker is the better mobile UX for a short, flat option list.
 */
function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-9 rounded-md border border-border bg-surface px-3 text-sm outline-none transition-colors",
        "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
