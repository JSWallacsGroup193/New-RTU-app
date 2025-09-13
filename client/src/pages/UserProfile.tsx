import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Edit, Settings, Building, Mail, Phone, MapPin, Calendar } from "lucide-react";
import UserProfileForm from "@/components/UserProfileForm";
import type { User as UserType } from "@shared/schema";

// Mock user ID for development - in a real app this would come from authentication
const CURRENT_USER_ID = "user-1";

export default function UserProfile() {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch user profile
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/users', CURRENT_USER_ID],
    queryFn: async () => {
      const response = await fetch(`/api/users/${CURRENT_USER_ID}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // User doesn't exist yet
        }
        throw new Error('Failed to fetch user profile');
      }
      return response.json();
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<UserType>) => {
      const response = await fetch(`/api/users/${CURRENT_USER_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated."
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create user mutation (for first-time users)
  const createUserMutation = useMutation({
    mutationFn: async (userData: Omit<UserType, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error('Failed to create profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Profile Created",
        description: "Your profile has been successfully created."
      });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleProfileSubmit = (userData: any) => {
    if (user) {
      updateUserMutation.mutate(userData);
    } else {
      createUserMutation.mutate(userData);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Error Loading Profile</h3>
              <p className="text-muted-foreground mb-4">Unable to load your profile information.</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // First-time user - no profile exists
  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Welcome to HVAC Universal Decoder</h1>
            <p className="text-lg text-muted-foreground">Let's set up your profile to get started</p>
          </div>
          
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Create Your Profile</CardTitle>
              <CardDescription>
                Set up your technician profile to organize your projects and equipment searches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full" data-testid="button-create-profile">
                    Create Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Your Profile</DialogTitle>
                  </DialogHeader>
                  <UserProfileForm
                    user={null}
                    onSubmit={handleProfileSubmit}
                    isLoading={createUserMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Existing user profile display
  const nameParts = user.name.split(' ');
  const userInitials = nameParts.length >= 2 
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : user.name.substring(0, 2).toUpperCase();

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground">Manage your profile and account settings</p>
          </div>
          
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-edit-profile">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
              </DialogHeader>
              <UserProfileForm
                user={user}
                onSubmit={handleProfileSubmit}
                isLoading={updateUserMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences" data-testid="tab-preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Basic Profile Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="" alt={user.name} />
                    <AvatarFallback className="text-lg font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {user.name}
                      </h3>
                      <p className="text-muted-foreground">HVAC Technician</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" data-testid="badge-user-role">
                        Professional
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Contact Information
                    </h4>
                    
                    <div className="space-y-3 pl-6">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-foreground" data-testid="text-email">{user.email}</p>
                      </div>
                      
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Company Information
                    </h4>
                    
                    <div className="space-y-3 pl-6">
                      {user.company && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Company</label>
                          <p className="text-foreground" data-testid="text-company">{user.company}</p>
                        </div>
                      )}
                      
                    </div>
                  </div>
                </div>

                {/* Profile Statistics */}
                <Separator />
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-primary">0</p>
                    <p className="text-sm text-muted-foreground">Projects</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-primary">0</p>
                    <p className="text-sm text-muted-foreground">Units Saved</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-primary" data-testid="text-member-since">
                      {new Date(user.createdAt).getFullYear()}
                    </p>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Preferences
                </CardTitle>
                <CardDescription>
                  Customize your experience and default settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Search Preferences</h4>
                  <div className="pl-4 space-y-3 text-sm text-muted-foreground">
                    <p>• Default search parameters</p>
                    <p>• Preferred measurement units</p>
                    <p>• Notification settings</p>
                    <p className="text-xs text-muted-foreground italic">
                      Preference settings will be available in a future update
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}