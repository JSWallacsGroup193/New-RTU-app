import ReplacementGrid from '../ReplacementGrid';

export default function ReplacementGridExample() {
  const mockReplacements = [
    {
      id: "1",
      modelNumber: "DZ14SA0361A",
      systemType: "Heat Pump" as const,
      btuCapacity: 36000,
      voltage: "460",
      phases: "3",
      specifications: [
        { label: "SEER Rating", value: "16" },
        { label: "Sound Level", value: "70", unit: "dB" }
      ],
      sizeMatch: "smaller" as const
    },
    {
      id: "2", 
      modelNumber: "DZ14SA0481A",
      systemType: "Heat Pump" as const,
      btuCapacity: 48000,
      voltage: "460", 
      phases: "3",
      specifications: [
        { label: "SEER Rating", value: "16" },
        { label: "Sound Level", value: "72", unit: "dB" }
      ],
      sizeMatch: "direct" as const
    },
    {
      id: "3",
      modelNumber: "DZ14SA0601A", 
      systemType: "Heat Pump" as const,
      btuCapacity: 60000,
      voltage: "460",
      phases: "3",
      specifications: [
        { label: "SEER Rating", value: "16" },
        { label: "Sound Level", value: "74", unit: "dB" }
      ],
      sizeMatch: "larger" as const
    }
  ];

  const handleViewDetails = (replacement: any) => {
    console.log('Viewing details for:', replacement.modelNumber);
  };

  return (
    <div className="p-8 bg-background">
      <ReplacementGrid 
        replacements={mockReplacements}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
}