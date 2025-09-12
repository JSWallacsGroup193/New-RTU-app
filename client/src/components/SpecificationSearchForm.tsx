import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search } from "lucide-react";

const specSearchSchema = z.object({
  btuMin: z.number().min(6000).max(200000),
  btuMax: z.number().min(6000).max(200000),
  systemType: z.enum(["Heat Pump", "Gas/Electric", "Straight A/C"]).optional(),
  voltage: z.string().optional()
}).refine(data => data.btuMin < data.btuMax, {
  message: "Minimum BTU must be less than maximum BTU",
  path: ["btuMax"]
});

type SpecSearchFormData = z.infer<typeof specSearchSchema>;

interface SpecificationSearchFormProps {
  onSearch: (params: SpecSearchFormData) => void;
  onBack: () => void;
  isLoading: boolean;
}

export default function SpecificationSearchForm({ onSearch, onBack, isLoading }: SpecificationSearchFormProps) {
  const form = useForm<SpecSearchFormData>({
    resolver: zodResolver(specSearchSchema),
    defaultValues: {
      btuMin: 24000,
      btuMax: 60000,
      systemType: undefined,
      voltage: undefined,
    },
  });

  const handleSubmit = (data: SpecSearchFormData) => {
    onSearch(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              data-testid="button-back-spec-search"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl">Search by Specifications</CardTitle>
          </div>
          <p className="text-muted-foreground">
            Find Daikin units that match your specific requirements for BTU capacity, system type, and voltage.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* BTU Capacity Range */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">BTU Capacity Range</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="btuMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum BTU</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="24000"
                            data-testid="input-btu-min"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>6,000 - 200,000</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="btuMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum BTU</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="60000"
                            data-testid="input-btu-max"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>6,000 - 200,000</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* System Type Filter */}
              <FormField
                control={form.control}
                name="systemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Type (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      data-testid="select-system-type"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All system types" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Heat Pump">Heat Pump</SelectItem>
                        <SelectItem value="Gas/Electric">Gas/Electric</SelectItem>
                        <SelectItem value="Straight A/C">Straight A/C</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Filter by specific system type, or leave blank for all types
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Voltage Filter */}
              <FormField
                control={form.control}
                name="voltage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voltage (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      data-testid="select-voltage"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All voltages" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="208-230">208-230V</SelectItem>
                        <SelectItem value="460">460V</SelectItem>
                        <SelectItem value="575">575V</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Filter by voltage requirement, or leave blank for all voltages
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
                data-testid="button-search-specs"
              >
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? "Searching..." : "Find Matching Units"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}