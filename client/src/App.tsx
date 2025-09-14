import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import Header from "@/components/Header";
import HVACDecoder from "@/components/HVACDecoder";
import UserProfile from "@/pages/UserProfile";
import ProjectDashboard from "@/pages/ProjectDashboard";
import ProjectDetail from "@/pages/ProjectDetail";
import ModelBuilderTest from "@/pages/ModelBuilderTest";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HVACDecoder} />
      <Route path="/test" component={ModelBuilderTest} />
      <Route path="/projects" component={ProjectDashboard} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/profile" component={UserProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="hvac-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <Header />
            <Router />
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
