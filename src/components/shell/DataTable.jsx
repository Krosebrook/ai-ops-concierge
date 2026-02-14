import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DataTable({
  columns,
  data,
  onRowClick,
  onRowSelect,
  selectedRows = [],
  loading = false,
  emptyState
}) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSort = (columnId) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };

  const sortedData = sortColumn
    ? [...data].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      })
    : data;

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return emptyState || (
      <div className="py-12 text-center text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            {onRowSelect && (
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRows.length === data.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onRowSelect(data.map(row => row.id));
                    } else {
                      onRowSelect([]);
                    }
                  }}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead key={column.id} className={cn(column.className)}>
                {column.sortable ? (
                  <button
                    onClick={() => handleSort(column.id)}
                    className="flex items-center gap-1 font-medium hover:text-gray-900"
                  >
                    {column.header}
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="font-medium">{column.header}</span>
                )}
              </TableHead>
            ))}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-gray-50"
              )}
            >
              {onRowSelect && (
                <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(row.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onRowSelect([...selectedRows, row.id]);
                      } else {
                        onRowSelect(selectedRows.filter(id => id !== row.id));
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.id} className={cn(column.cellClassName)}>
                  {column.cell ? column.cell(row) : row[column.id]}
                </TableCell>
              ))}
              <TableCell onClick={(e) => e.stopPropagation()}>
                {row.actions && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {row.actions.map((action, idx) => (
                        action.separator ? (
                          <DropdownMenuSeparator key={idx} />
                        ) : (
                          <DropdownMenuItem
                            key={idx}
                            onClick={action.onClick}
                            className={cn(action.destructive && "text-red-600")}
                          >
                            {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                            {action.label}
                          </DropdownMenuItem>
                        )
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}