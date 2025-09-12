import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RotateCcw, Search } from "lucide-react";

interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
  onNewSearch: () => void;
}

export default function ErrorDisplay({ message, onRetry, onNewSearch }: ErrorDisplayProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-destructive/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl text-destructive">Decoding Error</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground leading-relaxed">
            {message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={onRetry}
              data-testid="button-retry"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={onNewSearch}
              data-testid="button-new-search-error"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              New Search
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Tip:</strong> Make sure your model number is correct and supported.</p>
            <p>Supported manufacturers: Carrier, Trane, York, Lennox, Goodman, Rheem</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}