import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex !h-7 !min-h-0 !w-14 !min-w-0 shrink-0 cursor-pointer items-center rounded-full border p-0 shadow-inner transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-emerald-200 data-[state=checked]:bg-emerald-50 data-[state=unchecked]:border-slate-300 data-[state=unchecked]:bg-slate-200 data-[state=checked]:hover:bg-emerald-100 data-[state=unchecked]:hover:bg-slate-300",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute left-1 top-1/2 block h-5 w-5 -translate-y-1/2 rounded-full bg-slate-500 shadow-md ring-0 transition-transform data-[state=checked]:translate-x-7 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
