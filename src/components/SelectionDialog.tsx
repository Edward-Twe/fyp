import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Plus } from 'lucide-react'
import { DateRangePicker } from "./DateRangePicker"
import { DateRange } from "react-day-picker"
import { isWithinInterval, parseISO } from "date-fns"

interface SelectionDialogProps<T> {
  title: string
  items: T[]
  selectedItems: T[]
  getItemId: (item: T) => string | number
  getItemLabel: (item: T) => string
  getItemDate?: (item: T) => string
  onSelectionChange: (selectedItems: T[]) => void
}

export function SelectionDialog<T>({
  title,
  items,
  selectedItems,
  getItemId,
  getItemLabel,
  getItemDate,
  onSelectionChange,
}: SelectionDialogProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [filteredItems, setFilteredItems] = useState(items)

  useEffect(() => {
    let filtered = items

    if (searchQuery) {
      filtered = filtered.filter((item) =>
        getItemLabel(item).toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (getItemDate && dateRange?.from && dateRange?.to) {
      const start = dateRange.from
      const end = dateRange.to
      filtered = filtered.filter((item) => {
        const itemDate = parseISO(getItemDate(item))
        if (!start || !end) return true
        return isWithinInterval(itemDate, { start, end })
      })
    }

    setFilteredItems(filtered)
  }, [items, searchQuery, dateRange, getItemLabel, getItemDate])

  const toggleItem = (item: T) => {
    const itemId = getItemId(item)
    const isSelected = selectedItems.some((i) => getItemId(i) === itemId)
    
    if (isSelected) {
      onSelectionChange(selectedItems.filter((i) => getItemId(i) !== itemId))
    } else {
      onSelectionChange([...selectedItems, item])
    }
  }

  const toggleSelectAll = () => {
    const allFilteredIds = new Set(filteredItems.map(getItemId))
    const otherSelectedItems = selectedItems.filter(
      (item) => !allFilteredIds.has(getItemId(item))
    )
    
    const allFilteredAreSelected = filteredItems.every((item) =>
      selectedItems.some((selected) => getItemId(selected) === getItemId(item))
    )

    if (allFilteredAreSelected) {
      onSelectionChange(otherSelectedItems)
    } else {
      onSelectionChange([...otherSelectedItems, ...filteredItems])
    }
  }

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((item) =>
    selectedItems.some((selected) => getItemId(selected) === getItemId(item))
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add {title}
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => {
          if (e.target instanceof Element && 
              e.target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Select {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {getItemDate && (
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
            />
          )}
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="select-all"
              checked={allFilteredSelected}
              onCheckedChange={toggleSelectAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Select all {filteredItems.length} items
            </label>
          </div>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div key={getItemId(item)} className="flex items-center space-x-2">
                  <Checkbox
                    id={String(getItemId(item))}
                    checked={selectedItems.some(
                      (i) => getItemId(i) === getItemId(item)
                    )}
                    onCheckedChange={() => toggleItem(item)}
                  />
                  <label
                    htmlFor={String(getItemId(item))}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {getItemLabel(item)}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

