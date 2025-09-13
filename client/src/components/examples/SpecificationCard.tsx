import SpecificationCard from '../SpecificationCard';

export default function SpecificationCardExample() {
  const mockSpecs = [
    { label: "SEER2 Rating", value: "16", unit: "" },
    { label: "Refrigerant", value: "R-410A", unit: "" },
    { label: "Sound Level", value: "72", unit: "dB" },
    { label: "Dimensions", value: "48 x 48 x 36", unit: "in" },
    { label: "Weight", value: "485", unit: "lbs" },
    { label: "Warranty", value: "10", unit: "years" }
  ];

  return (
    <div className="p-8 bg-background space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <SpecificationCard
          title="Carrier Original Unit"
          modelNumber="50TCQA04"
          systemType="Heat Pump"
          btuCapacity={48000}
          voltage="460"
          phases="3"
          specifications={mockSpecs}
          isOriginal={true}
        />
        <SpecificationCard
          title="Daikin Direct Match"
          modelNumber="DZ14SA0481A"
          systemType="Heat Pump"
          btuCapacity={48000}
          voltage="460"
          phases="3"
          specifications={mockSpecs}
          isOriginal={false}
        />
      </div>
    </div>
  );
}