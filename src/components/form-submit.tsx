"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/** Submit button that reacts the moment it's pressed: disabled + spinner while the form's server action runs. */
export function FormSubmit({
  children,
  pendingText,
  className,
  ...props
}: React.ComponentProps<"button"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending} className={cn(className, pending && "cursor-wait opacity-80")}>
      {pending ? (
        <>
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          {pendingText !== undefined ? pendingText : children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
