import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  FileText, 
  MessageSquare, 
  Settings,
  Users,
  ClipboardList,
  BarChart3,
  Zap,
  Book,
  Command
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAVIGATION_ITEMS = [
  { id: "ask", label: "Ask Mode", page: "Home", icon: MessageSquare, shortcut: "A" },
  { id: "drafts", label: "Drafts", page: "Drafts", icon: FileText, shortcut: "D" },
  { id: "kb", label: "Knowledge Base", page: "KnowledgeBase", icon: Book, shortcut: "K" },
  { id: "tasks", label: "Tasks", page: "Tasks", icon: ClipboardList, shortcut: "T" },
  { id: "analytics", label: "Analytics", page: "Analytics", icon: BarChart3, shortcut: "Y" },
  { id: "automation", label: "Automation", page: "WorkflowAutomation", icon: Zap },
  { id: "audit", label: "Audit Log", page: "AuditLog", icon: ClipboardList },
  { id: "settings", label: "Settings", page: "Settings", icon: Settings, shortcut: "," },
];

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();

  const filteredItems = NAVIGATION_ITEMS.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === "Enter" && filteredItems[selected]) {
        e.preventDefault();
        handleSelect(filteredItems[selected]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selected, filteredItems]);

  const handleSelect = (item) => {
    navigate(createPageUrl(item.page));
    onClose();
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-2xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <Input
            autoFocus
            placeholder="Search or jump to..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base"
          />
          <kbd className="px-2 py-1 text-xs bg-gray-100 rounded border border-gray-200">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No results found
            </div>
          ) : (
            <div className="py-2">
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelected(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      idx === selected
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <Icon className="w-5 h-5 text-gray-500" />
                    <span className="flex-1 text-sm font-medium text-gray-900">
                      {item.label}
                    </span>
                    {item.shortcut && (
                      <Badge variant="secondary" className="text-xs">
                        <Command className="w-3 h-3 mr-1" />
                        {item.shortcut}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Navigate with ↑↓ • Select with ↵</span>
            <span>Press ? for keyboard shortcuts</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}