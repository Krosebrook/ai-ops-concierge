import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Command } from "lucide-react";

const SHORTCUTS = [
  {
    category: "Navigation",
    items: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["⌘", "A"], description: "Go to Ask Mode" },
      { keys: ["⌘", "D"], description: "Go to Drafts" },
      { keys: ["⌘", "K"], description: "Go to Knowledge Base" },
      { keys: ["⌘", "T"], description: "Go to Tasks" },
      { keys: ["⌘", ","], description: "Go to Settings" },
    ]
  },
  {
    category: "Actions",
    items: [
      { keys: ["⌘", "Enter"], description: "Submit form / Ask question" },
      { keys: ["⌘", "S"], description: "Save changes" },
      { keys: ["Esc"], description: "Close dialog / Cancel" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ]
  },
  {
    category: "Tables & Lists",
    items: [
      { keys: ["↑", "↓"], description: "Navigate rows" },
      { keys: ["Enter"], description: "Open selected item" },
      { keys: ["⌘", "A"], description: "Select all" },
      { keys: ["Space"], description: "Toggle selection" },
    ]
  }
];

export default function KeyboardShortcuts({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Command className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {SHORTCUTS.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-gray-600">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="px-2 py-0.5 text-xs font-mono"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
          Press <Badge variant="secondary">?</Badge> anytime to open this dialog
        </div>
      </DialogContent>
    </Dialog>
  );
}