import Header from '../Header';

export default function HeaderExample() {
  return (
    <div className="bg-background">
      <Header />
      <div className="p-8">
        <p className="text-muted-foreground">Header component with navigation and theme toggle</p>
      </div>
    </div>
  );
}