import { useState } from 'react';
import SystemTypeFilter from '../SystemTypeFilter';

export default function SystemTypeFilterExample() {
  const [selectedType, setSelectedType] = useState<"all" | "heat-pump" | "gas-electric" | "straight-ac">("all");

  return (
    <div className="p-8 bg-background space-y-4">
      <div>
        <h3 className="font-medium mb-4">System Type Filter</h3>
        <SystemTypeFilter 
          selectedType={selectedType}
          onTypeChange={setSelectedType}
        />
        <p className="mt-4 text-sm text-muted-foreground">
          Current selection: {selectedType}
        </p>
      </div>
    </div>
  );
}