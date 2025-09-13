import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Download,
  FileText,
  Plus,
  Calendar,
  User,
  MapPin,
  Building,
  Clock,
  CheckCircle,
  Target,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { exportBulkComparison } from "@/lib/pdfService";
import EnhancedUnitCard from "@/components/EnhancedUnitCard";
import type { Project } from "@shared/schema";

// Mock user ID for development - in a real app this would come from authentication
const CURRENT_USER_ID = "user-1";

export default function ProjectDetail() {
  const { id: projectId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Fetch project details
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project details');
      return response.json() as Project;
    },
    enabled: !!projectId
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project Deleted",
        description: "The project has been successfully deleted."
      });
      setLocation("/projects");
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Remove unit from project mutation
  const removeUnitMutation = useMutation({
    mutationFn: async (unitId: string) => {
      const response = await fetch(`/api/projects/${projectId}/units/${unitId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove unit from project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({
        title: "Unit Removed",
        description: "The unit has been removed from the project."
      });
    },
    onError: (error) => {
      toast({
        title: "Remove Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleBack = () => {
    setLocation("/projects");
  };

  const handleDeleteProject = () => {
    deleteProjectMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const handleRemoveUnit = (unitId: string) => {
    removeUnitMutation.mutate(unitId);
  };

  const handleBulkExport = async () => {
    if (!project || selectedUnits.size === 0) {
      toast({
        title: "No Units Selected",
        description: "Please select at least one unit to export.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      // Convert project items to comparison format for PDF export
      const selectedProjectItems = project.items.filter(item => selectedUnits.has(item.id));
      const comparisons = selectedProjectItems.map(item => ({
        original: item.originalUnit,
        replacement: item.chosenReplacement
      }));

      await exportBulkComparison(comparisons, {
        includeProjectInfo: true,
        includeEnvironmentalBenefits: true,
        includeCostAnalysis: true,
        project: project.name,
        customer: project.customer || "Not specified",
        technician: "Current User"
      });

      toast({
        title: "PDF Export Successful",
        description: `Project report with ${comparisons.length} units has been downloaded.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleUnitSelection = (unitId: string) => {
    const newSelection = new Set(selectedUnits);
    if (newSelection.has(unitId)) {
      newSelection.delete(unitId);
    } else {
      newSelection.add(unitId);
    }
    setSelectedUnits(newSelection);
  };

  const handleSelectAllUnits = () => {
    if (selectedUnits.size === project?.items.length) {
      setSelectedUnits(new Set());
    } else {
      setSelectedUnits(new Set(project?.items.map(item => item.id) || []));
    }
  };

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: Project["status"]) => {
    switch (status) {
      case "draft":
        return <Clock className="h-4 w-4" />;
      case "in_progress":
        return <Target className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded"></div>
          <div className="grid lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Project Not Found</h3>
              <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
              <Button onClick={handleBack}>Return to Projects</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <Button variant="outline" onClick={handleBack} className="gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Button>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                <Badge className={getStatusColor(project.status)} variant="secondary">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(project.status)}
                    <span className="capitalize">{project.status.replace('_', ' ')}</span>
                  </div>
                </Badge>
              </div>
              {project.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
              className="gap-2"
              data-testid="button-edit-project"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-destructive" data-testid="button-delete-project">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Project</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{project.name}"? This action cannot be undone and will remove all saved units from this project.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteProject}
                    disabled={deleteProjectMutation.isPending}
                    data-testid="button-confirm-delete"
                  >
                    {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Project Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Project Information</span>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>By You</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Units Capacity</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{project.items.length}</span>
                    <span className="text-muted-foreground">/ 20 max</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all" 
                      style={{ width: `${(project.items.length / 20) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Project Status</p>
                <div className="flex items-center gap-2">
                  {getStatusIcon(project.status)}
                  <span className="capitalize">{project.status.replace('_', ' ')}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p>{new Date(project.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            {project.customer && (
              <>
                <Separator />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Customer</p>
                    <p>{project.customer}</p>
                  </div>
                  {project.location && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{project.location}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Units Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Saved Units</h2>
            <div className="flex items-center gap-2">
              {project.items.length > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleSelectAllUnits}
                    className="gap-2"
                    data-testid="button-select-all"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {selectedUnits.size === project.items.length ? "Deselect All" : "Select All"}
                  </Button>
                  
                  {selectedUnits.size > 0 && (
                    <Button 
                      onClick={handleBulkExport}
                      disabled={isExporting}
                      className="gap-2"
                      data-testid="button-export-selected"
                    >
                      <Download className="h-4 w-4" />
                      Export Selected ({selectedUnits.size})
                    </Button>
                  )}
                </>
              )}
              
              <Button 
                onClick={() => setLocation("/")}
                className="gap-2"
                data-testid="button-add-units"
              >
                <Plus className="h-4 w-4" />
                Add More Units
              </Button>
            </div>
          </div>

          {project.items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Building className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Units Saved</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Start adding HVAC units to this project by using the decoder or specification search.
                </p>
                <Button onClick={() => setLocation("/")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Start Adding Units
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {project.items.map((item) => (
                <EnhancedUnitCard
                  key={item.id}
                  originalUnit={item.originalUnit}
                  replacement={item.chosenReplacement}
                  isSelected={selectedUnits.has(item.id)}
                  onToggleSelection={() => handleToggleUnitSelection(item.id)}
                  onRemove={() => handleRemoveUnit(item.id)}
                  showProjectActions={true}
                  unitNotes={item.notes}
                  data-testid={`unit-card-${item.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}