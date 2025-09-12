import SearchResults from '../SearchResults';

export default function SearchResultsExample() {
  const mockOriginalUnit = {
    modelNumber: "50TCQA04",
    manufacturer: "Carrier",
    confidence: 95,
    systemType: "Heat Pump" as const,
    btuCapacity: 48000,
    voltage: "460",
    phases: "3",
    specifications: [
      { label: "SEER Rating", value: "16" },
      { label: "Refrigerant", value: "R-410A" },
      { label: "Sound Level", value: "72", unit: "dB" },
      { label: "Dimensions", value: "48 x 48 x 36", unit: "in" },
      { label: "Weight", value: "485", unit: "lbs" },
      { label: "Warranty", value: "10", unit: "years" }
    ]
  };

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

  const handleNewSearch = () => {
    console.log('Starting new search');
  };

  return (
    <div className="p-8 bg-background">
      <SearchResults
        originalUnit={mockOriginalUnit}
        replacements={mockReplacements}
        onNewSearch={handleNewSearch}
      />
    </div>
  );
}