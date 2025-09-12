import ManufacturerBadge from '../ManufacturerBadge';

export default function ManufacturerBadgeExample() {
  return (
    <div className="p-8 bg-background space-y-4">
      <div className="space-y-2">
        <h3 className="font-medium">Manufacturer Badges</h3>
        <div className="flex flex-wrap gap-2">
          <ManufacturerBadge manufacturer="Carrier" confidence={95} />
          <ManufacturerBadge manufacturer="Trane" confidence={88} />
          <ManufacturerBadge manufacturer="York" confidence={92} />
          <ManufacturerBadge manufacturer="Lennox" confidence={85} />
          <ManufacturerBadge manufacturer="Goodman" confidence={78} />
          <ManufacturerBadge manufacturer="Rheem" confidence={91} />
          <ManufacturerBadge manufacturer="Daikin" confidence={100} />
        </div>
      </div>
    </div>
  );
}