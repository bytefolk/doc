'use client'

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@fullstack-ai-infra/ui'

// The shared first-flow contract does not need radio items. Preserve the legacy exports for
// untouched administration surfaces until their own migration issue.
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup
export const DropdownMenuRadioItem = DropdownMenuPrimitive.RadioItem
