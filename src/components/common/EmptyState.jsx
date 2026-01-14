import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

/**
 * Reusable empty state component
 * @param {Object} props - Component props
 * @param {React.Component} props.icon - Icon component
 * @param {string} props.title - Empty state title
 * @param {string} props.description - Empty state description
 * @param {Object} props.action - Optional action object { label, onClick }
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-6">
      {Icon && (
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-6">
          <Plus className="w-4 h-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
}