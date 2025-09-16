import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useLocation } from "wouter";
import { Zap, FileText, HelpCircle, User, Folder } from "lucide-react";

export default function Header() {
  const [location, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">HVAC Decoder</span>
            </div>
            <Badge variant="secondary" className="text-xs">The Wallace Group</Badge>
          </div>
          
          <nav className="hidden md:flex items-center gap-4">
            <Button 
              variant={location === "/" ? "default" : "ghost"}
              size="sm"
              data-testid="nav-decoder"
              className="text-sm"
              onClick={() => setLocation("/")}
            >
              Decoder
            </Button>
            <Button 
              variant={location.startsWith("/projects") ? "default" : "ghost"}
              size="sm"
              data-testid="nav-projects"
              className="text-sm flex items-center gap-1"
              onClick={() => setLocation("/projects")}
            >
              <Folder className="h-4 w-4" />
              Projects
            </Button>
            <Button 
              variant={location === "/profile" ? "default" : "ghost"}
              size="sm"
              data-testid="nav-profile"
              className="text-sm flex items-center gap-1"
              onClick={() => setLocation("/profile")}
            >
              <User className="h-4 w-4" />
              Profile
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile navigation for profile */}
          <Button 
            variant={location === "/profile" ? "default" : "ghost"}
            size="sm"
            data-testid="nav-profile-mobile"
            className="md:hidden flex items-center gap-1"
            onClick={() => setLocation("/profile")}
          >
            <User className="h-4 w-4" />
          </Button>
          
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