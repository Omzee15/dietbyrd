import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { STATE_MEDICAL_COUNCILS } from "@/lib/medical-councils";

interface MedicalCouncilComboboxProps {
  value: string;
  onChange: (council: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

// Deliberately select-only: unlike CitySearchCombobox there is no "use what I
// typed" escape hatch, because the stored council name has to match the
// official list exactly for downstream NMC verification to work.
export function MedicalCouncilCombobox({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Search or select...",
}: MedicalCouncilComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

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
            "w-full justify-between font-normal bg-white h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-left">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {/* cmdk's default scorer is a fuzzy subsequence match, which leaves
            every council on screen for a query like "Del" (it matches
            d-e-l scattered through "Andhra Pradesh Medical Council"). A
            plain substring test is what people expect from a picker like
            this: typing "Del" should leave Delhi and nothing else. */}
        <Command
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase().trim()) ? 1 : 0
          }
        >
          <CommandInput
            placeholder="e.g., Delhi Medical Council"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No medical council found.</CommandEmpty>
            <CommandGroup>
              {STATE_MEDICAL_COUNCILS.map((council) => (
                <CommandItem
                  key={council}
                  value={council}
                  onSelect={() => {
                    onChange(council === value ? "" : council);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === council ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{council}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
