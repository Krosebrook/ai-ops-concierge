import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function DateRangeFilter({ dateRange, onDateRangeChange }) {
  const [tempRange, setTempRange] = useState(dateRange);

  const handleApply = () => {
    onDateRangeChange(tempRange);
  };

  const handleClear = () => {
    setTempRange({ from: null, to: null });
    onDateRangeChange({ from: null, to: null });
  };

  const displayText = dateRange.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
      : format(dateRange.from, "MMM d, yyyy")
    : "Select date range";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !dateRange.from && "text-slate-500"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
          {dateRange.from && (
            <X
              className="ml-2 h-3 w-3 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          <Calendar
            mode="range"
            selected={tempRange}
            onSelect={setTempRange}
            numberOfMonths={2}
            className="rounded-md"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="flex-1 bg-violet-600 hover:bg-violet-700"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}