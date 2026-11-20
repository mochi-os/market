// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  cn,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@mochi/web'
import { Check, ChevronsUpDown } from 'lucide-react'
import {
  isGroup,
  regionChoices,
  useRegionName,
  useRegions,
} from '@/lib/shipping'

interface RegionSelectProps {
  value: string
  onChange: (value: string) => void
  // Offer the groups as well as the countries: a shipping option's region.
  groups?: boolean
  id?: string
  label?: string
  // Shown while nothing is chosen, with its own classes.
  placeholder?: string
  placeholderClassName?: string
  className?: string
}

// A country, or with groups a shipping region, chosen by name from the codes
// the Comptroller knows. A value stored as free text before codes is shown as
// it was written until something is chosen in its place.
export function RegionSelect({
  value,
  onChange,
  groups = false,
  id,
  label,
  placeholder,
  placeholderClassName,
  className,
}: RegionSelectProps) {
  const { t } = useLingui()
  const [open, setOpen] = useState(false)
  const { data: regions } = useRegions()
  const name = useRegionName()
  const choices = useMemo(
    () => regionChoices(regions, name, groups),
    [regions, name, groups]
  )
  const groupChoices = choices.filter((choice) => isGroup(choice.value))
  const countryChoices = choices.filter((choice) => !isGroup(choice.value))

  const item = (choice: { value: string; label: string }) => (
    <CommandItem
      key={choice.value}
      value={choice.value}
      keywords={[choice.label]}
      onSelect={() => {
        onChange(choice.value)
        setOpen(false)
      }}
    >
      <Check
        className={cn(
          'me-2 size-4 shrink-0',
          value === choice.value ? 'opacity-100' : 'opacity-0'
        )}
      />
      <span className='truncate'>{choice.label}</span>
    </CommandItem>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-label={label}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className='min-w-0 flex-1 truncate text-start'>
            {value ? (
              name(value)
            ) : (
              <span
                className={cn('text-muted-foreground', placeholderClassName)}
              >
                {placeholder}
              </span>
            )}
          </span>
          <ChevronsUpDown className='ms-2 size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-[--radix-popover-trigger-width] min-w-56 p-0'
        align='start'
      >
        <Command>
          <CommandInput aria-label={t`Search`} placeholder={t`Search`} />
          <CommandList>
            <CommandEmpty>
              <Trans>No options found.</Trans>
            </CommandEmpty>
            {groupChoices.length > 0 && (
              <>
                <CommandGroup>{groupChoices.map(item)}</CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup>{countryChoices.map(item)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
