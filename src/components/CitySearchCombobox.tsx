import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { INDIAN_CITIES } from "@/lib/indian-cities"

interface CitySearchComboboxProps {
  value: string;
  onChange: (city: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function CitySearchCombobox({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Select city..."
}: CitySearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal bg-white", !value && "text-muted-foreground", className)}
        >
          {value
            ? INDIAN_CITIES.find((city) => city.toLowerCase() === value.toLowerCase()) || value
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search city..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {search ? (
                <div 
                  className="px-2 py-1.5 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm"
                  onClick={() => { onChange(search); setOpen(false); setSearch(""); }}
                >
                  Use "{search}"
                </div>
              ) : (
                "No city found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {search && !INDIAN_CITIES.find(c => c.toLowerCase() === search.toLowerCase()) && (
                <CommandItem
                  value={search}
                  onSelect={(currentValue) => {
                    onChange(search)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Use "{search}"
                </CommandItem>
              )}
              {INDIAN_CITIES.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : city)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() === city.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
