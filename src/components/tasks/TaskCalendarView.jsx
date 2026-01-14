import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

export default function TaskCalendarView({ tasks, onSelectDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysArray = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startingDayOfWeek = getDay(monthStart);
  const emptyDays = Array(startingDayOfWeek).fill(null);
  const allDays = [...emptyDays, ...daysArray];
  
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (task.due_date) {
        const dateKey = format(new Date(task.due_date), 'yyyy-MM-dd');
        map[dateKey] = (map[dateKey] || []).concat(task);
      }
    });
    return map;
  }, [tasks]);
  
  const getDayTasks = (day) => {
    if (!day) return [];
    const dateKey = format(day, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  };
  
  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-blue-100 text-blue-700",
      medium: "bg-amber-100 text-amber-700",
      high: "bg-orange-100 text-orange-700",
      urgent: "bg-red-100 text-red-700"
    };
    return colors[priority] || "bg-slate-100 text-slate-700";
  };
  
  const isToday = (day) => day && isSameDay(day, new Date());
  const isOverdue = (day) => day && isBefore(startOfDay(day), startOfDay(new Date()));

  return (
    <Card className="bg-white border-0 shadow-sm">
      <div className="p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">
            {format(currentDate, "MMMM yyyy")}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {allDays.map((day, idx) => {
            const dayTasks = getDayTasks(day);
            return (
              <div
                key={idx}
                onClick={() => day && onSelectDate?.(day)}
                className={cn(
                  "min-h-[120px] p-2 border rounded-lg cursor-pointer transition-colors",
                  !day && "bg-slate-50",
                  day && isToday(day) && "bg-blue-50 border-blue-200",
                  day && !isToday(day) && isOverdue(day) && "bg-red-50 border-red-200",
                  day && !isToday(day) && !isOverdue(day) && "bg-white border-slate-200 hover:bg-slate-50"
                )}
              >
                {day && (
                  <>
                    <div className="text-sm font-semibold text-slate-700 mb-1">
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded truncate",
                            getPriorityColor(task.priority)
                          )}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-slate-500 px-1.5">
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}