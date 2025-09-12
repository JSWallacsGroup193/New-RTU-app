import { Badge } from "@/components/ui/badge";

interface ManufacturerBadgeProps {
  manufacturer: string;
  confidence?: number;
}

const manufacturerColors: Record<string, string> = {
  carrier: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  trane: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
  york: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  lennox: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  goodman: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  rheem: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  daikin: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground",
};

export default function ManufacturerBadge({ manufacturer, confidence }: ManufacturerBadgeProps) {
  const colorClass = manufacturerColors[manufacturer.toLowerCase()] || "bg-secondary text-secondary-foreground";
  
  return (
    <div className="flex items-center gap-2">
      <Badge 
        data-testid={`badge-manufacturer-${manufacturer.toLowerCase()}`}
        className={colorClass}
        variant="secondary"
      >
        {manufacturer}
      </Badge>
      {confidence && (
        <span className="text-sm text-muted-foreground">
          {confidence}% confidence
        </span>
      )}
    </div>
  );
}