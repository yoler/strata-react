import { Toggle as TogglePrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "@/shared/lib/utils"
import { toggleVariants, type ToggleVariantProps } from "@/shared/ui/toggle-variants"

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  ToggleVariantProps) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Toggle, toggleVariants }
export type { ToggleVariantProps }
