"use client";

/**
 * MultiSelectCombobox
 * --------------------
 * Generic multi-select with a searchable list, used today by the Job
 * Matching toolbar (country + department filters).
 *
 * Props:
 *   - options:   list of { value, label } pairs.
 *   - selected:  array of currently selected values.
 *   - onChange:  fires with the next selected array on every toggle.
 *   - placeholder, searchPlaceholder, emptyMessage: copy.
 *   - widthClassName: Tailwind class for the trigger width.
 *
 * UX:
 *   - Click an item to toggle. Multiple values can be active.
 *   - Type in the search box to filter.
 *   - Clear button on the trigger when something is selected.
 *   - Trigger label summarises selection ("Portugal +1" when >1).
 */

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@client/lib/utils";
import { Button } from "@client/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@client/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@client/components/ui/popover";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectComboboxProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  widthClassName?: string;
  disabled?: boolean;
}

export function MultiSelectCombobox({
  options,
  selected,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  widthClassName = "w-full md:w-[220px]",
  disabled,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Trigger label: "Portugal", "Portugal +2", or placeholder.
  const triggerLabel = React.useMemo(() => {
    if (selected.length === 0) return placeholder;
    const firstLabel =
      options.find((o) => o.value === selected[0])?.label ?? selected[0];
    if (selected.length === 1) return firstLabel;
    return `${firstLabel} +${selected.length - 1}`;
  }, [selected, options, placeholder]);

  const hasSelection = selected.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between font-normal",
            !hasSelection && "text-muted-foreground",
            widthClassName
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {hasSelection && (
              <span
                role="button"
                aria-label="Clear selection"
                onClick={clearAll}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = selected.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggle(opt.value)}
                  >
                    <span
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
