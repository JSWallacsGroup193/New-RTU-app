import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { insertUserSchema, type User } from "@shared/schema";

// Form validation schema matching the actual User database schema
const userFormSchema = insertUserSchema.extend({
  preferences: z.object({
    defaultUnits: z.enum(["metric", "imperial"]).optional().default("imperial"),
    searchDefaults: z.object({
      includeSizeLadders: z.boolean().optional().default(true),
      includePositionAnalysis: z.boolean().optional().default(true),
    }).optional().default({}),
  }).optional().default({})
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserProfileFormProps {
  user: User | null;
  onSubmit: (data: UserFormData) => void;
  isLoading: boolean;
}

export default function UserProfileForm({ user, onSubmit, isLoading }: UserProfileFormProps) {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      company: user?.company || "",
      preferences: {
        defaultUnits: "imperial",
        searchDefaults: {
          includeSizeLadders: true,
          includePositionAnalysis: true,
        }
      }
    }
  });

  // Remove certification handling since it's not in the schema

  const handleFormSubmit = (data: UserFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John Smith" 
                      {...field} 
                      data-testid="input-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="john.smith@company.com" 
                      {...field} 
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormDescription>
                    This will be used for your account identification
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Company Information</h3>
            
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="HVAC Services Inc." 
                      {...field}
                      value={field.value || ""}
                      data-testid="input-company"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Preferences</h3>
            
            <FormField
              control={form.control}
              name="preferences.defaultUnits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Units</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-default-units">
                        <SelectValue placeholder="Select default units" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="imperial">Imperial (BTU, °F)</SelectItem>
                      <SelectItem value="metric">Metric (kW, °C)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Default unit system for search results and specifications
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            type="submit" 
            disabled={isLoading}
            data-testid="button-save-profile"
          >
            {isLoading ? "Saving..." : user ? "Update Profile" : "Create Profile"}
          </Button>
        </div>
      </form>
    </Form>
  );
}