import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Zap, FileText, HelpCircle } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">HVAC Decoder</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              Universal
            </Badge>
          </div>
          
          <nav className="hidden md:flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="nav-decoder"
              className="text-sm"
            >
              Decoder
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              data-testid="nav-specs"
              className="text-sm"
            >
              Spec Search
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            data-testid="button-help"
            className="hidden sm:flex items-center gap-1"
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            data-testid="button-docs"
            className="hidden sm:flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            Docs
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}