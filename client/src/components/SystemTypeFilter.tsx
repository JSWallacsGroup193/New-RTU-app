import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Snowflake, Flame, Wind } from "lucide-react";

interface SystemTypeFilterProps {
  selectedType: "all" | "heat-pump" | "gas-electric" | "straight-ac";
  onTypeChange: (type: "all" | "heat-pump" | "gas-electric" | "straight-ac") => void;
}

export default function SystemTypeFilter({ selectedType, onTypeChange }: SystemTypeFilterProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-muted-foreground">Filter by system type:</span>
      <Tabs value={selectedType} onValueChange={(value) => onTypeChange(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger 
            data-testid="filter-all"
            value="all" 
            className="text-xs"
          >
            All Types
          </TabsTrigger>
          <TabsTrigger 
            data-testid="filter-heat-pump"
            value="heat-pump" 
            className="text-xs flex items-center gap-1"
          >
            <Snowflake className="h-3 w-3" />
            Heat Pump
          </TabsTrigger>
          <TabsTrigger 
            data-testid="filter-gas-electric"
            value="gas-electric" 
            className="text-xs flex items-center gap-1"
          >
            <Flame className="h-3 w-3" />
            Gas/Electric
          </TabsTrigger>
          <TabsTrigger 
            data-testid="filter-straight-ac"
            value="straight-ac" 
            className="text-xs flex items-center gap-1"
          >
            <Wind className="h-3 w-3" />
            Straight A/C
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}