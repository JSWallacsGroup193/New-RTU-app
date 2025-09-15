import { useState, useCallback, useRef } from 'react';
import { Upload, Camera, FileImage, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  file: File;
  preview: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  extractedData?: {
    modelNumber?: string;
    manufacturer?: string;
    capacity?: string;
    voltage?: string;
    serialNumber?: string;
    specifications?: Record<string, string>;
  };
  error?: string;
}

interface DataPlateUploadProps {
  onDataExtracted?: (data: UploadedFile['extractedData']) => void;
  onFilesUploaded?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  className?: string;
}

export function DataPlateUpload({ 
  onDataExtracted, 
  onFilesUploaded, 
  maxFiles = 5,
  className = "" 
}: DataPlateUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, WebP, or HEIC)';
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB';
    }

    // Check if we've reached max files
    if (uploadedFiles.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    return null;
  };

  const processFile = useCallback(async (file: File): Promise<UploadedFile> => {
    const preview = URL.createObjectURL(file);
    
    const uploadedFile: UploadedFile = {
      file,
      preview,
      status: 'uploading',
      progress: 0
    };

    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 20) {
        uploadedFile.progress = progress;
        setUploadedFiles(prev => prev.map(f => f.file === file ? uploadedFile : f));
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      uploadedFile.status = 'processing';
      setUploadedFiles(prev => prev.map(f => f.file === file ? uploadedFile : f));

      // Simulate data extraction (in real implementation, this would call OCR service)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock extracted data for demonstration
      uploadedFile.extractedData = {
        modelNumber: 'DSC048D3A',
        manufacturer: 'Trane',
        capacity: '4 Ton',
        voltage: '208-230V 3φ',
        serialNumber: 'M24X12345',
        specifications: {
          'Cooling Capacity': '48,000 BTU/hr',
          'Heating Capacity': '45,000 BTU/hr',
          'Efficiency Rating': '14.2 SEER',
          'Refrigerant': 'R-410A',
          'Compressor Type': 'Scroll'
        }
      };

      uploadedFile.status = 'completed';
      uploadedFile.progress = 100;

      // Notify parent component
      if (onDataExtracted && uploadedFile.extractedData) {
        onDataExtracted(uploadedFile.extractedData);
      }

      toast({
        title: "Data Plate Processed",
        description: `Successfully extracted equipment data from ${file.name}`,
      });

    } catch (error) {
      uploadedFile.status = 'error';
      uploadedFile.error = 'Failed to process image. Please try again.';
      
      toast({
        title: "Processing Failed",
        description: `Could not extract data from ${file.name}`,
        variant: "destructive",
      });
    }

    return uploadedFile;
  }, [onDataExtracted, toast]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Invalid File",
          description: `${file.name}: ${error}`,
          variant: "destructive",
        });
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    // Add files to state immediately
    const newFiles = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'uploading' as const,
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Process files
    const processedFiles = await Promise.all(validFiles.map(processFile));
    
    if (onFilesUploaded) {
      onFilesUploaded(processedFiles);
    }
  }, [processFile, validateFile, toast, uploadedFiles.length, maxFiles, onFilesUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = useCallback((fileToRemove: UploadedFile) => {
    URL.revokeObjectURL(fileToRemove.preview);
    setUploadedFiles(prev => prev.filter(f => f !== fileToRemove));
  }, []);

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'processing':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Equipment Data Plate Upload
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload photos of equipment data plates to automatically extract specifications and find Daikin replacements.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors hover-elevate cursor-pointer ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            data-testid="data-plate-upload-area"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              data-testid="file-input"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-muted rounded-full">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Drop data plate photos here, or click to browse
                </h3>
                <p className="text-sm text-muted-foreground">
                  Supports JPEG, PNG, WebP, and HEIC files up to 10MB each
                </p>
                <p className="text-xs text-muted-foreground">
                  Maximum {maxFiles} files · Clear photos work best for data extraction
                </p>
              </div>
              
              <Button variant="outline" className="gap-2" data-testid="button-browse-files">
                <FileImage className="h-4 w-4" />
                Browse Files
              </Button>
            </div>
          </div>

          {/* Mobile Camera Button */}
          <div className="flex justify-center md:hidden">
            <Button
              variant="default"
              size="lg" 
              className="gap-2"
              onClick={() => {
                // For mobile, try to open camera directly
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute('capture', 'environment');
                  fileInputRef.current.click();
                }
              }}
              data-testid="button-camera"
            >
              <Camera className="h-5 w-5" />
              Take Photo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Uploaded Files ({uploadedFiles.length})
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {uploadedFiles.map((uploadedFile, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={uploadedFile.preview}
                      alt={uploadedFile.file.name}
                      className="w-16 h-16 object-cover rounded-md border"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{uploadedFile.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.file.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(uploadedFile.status)}
                      >
                        <div className="flex items-center gap-1">
                          {getStatusIcon(uploadedFile.status)}
                          <span className="capitalize">{uploadedFile.status}</span>
                        </div>
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadedFile)}
                    data-testid={`button-remove-file-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Progress Bar */}
                {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {uploadedFile.status === 'uploading' ? 'Uploading...' : 'Processing image...'}
                      </span>
                      <span>{uploadedFile.progress}%</span>
                    </div>
                    <Progress value={uploadedFile.progress} className="h-2" />
                  </div>
                )}

                {/* Error Message */}
                {uploadedFile.status === 'error' && uploadedFile.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {uploadedFile.error}
                    </p>
                  </div>
                )}

                {/* Extracted Data */}
                {uploadedFile.status === 'completed' && uploadedFile.extractedData && (
                  <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md space-y-3">
                    <h4 className="font-medium text-green-800 dark:text-green-200">
                      Extracted Equipment Data
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {uploadedFile.extractedData.modelNumber && (
                        <div>
                          <span className="text-green-600 dark:text-green-400 font-medium">Model:</span>
                          <p className="font-mono">{uploadedFile.extractedData.modelNumber}</p>
                        </div>
                      )}
                      {uploadedFile.extractedData.manufacturer && (
                        <div>
                          <span className="text-green-600 dark:text-green-400 font-medium">Brand:</span>
                          <p>{uploadedFile.extractedData.manufacturer}</p>
                        </div>
                      )}
                      {uploadedFile.extractedData.capacity && (
                        <div>
                          <span className="text-green-600 dark:text-green-400 font-medium">Capacity:</span>
                          <p>{uploadedFile.extractedData.capacity}</p>
                        </div>
                      )}
                      {uploadedFile.extractedData.voltage && (
                        <div>
                          <span className="text-green-600 dark:text-green-400 font-medium">Voltage:</span>
                          <p>{uploadedFile.extractedData.voltage}</p>
                        </div>
                      )}
                    </div>

                    {uploadedFile.extractedData.specifications && (
                      <div className="pt-2 border-t border-green-200 dark:border-green-800">
                        <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">
                          Additional Specifications
                        </h5>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          {Object.entries(uploadedFile.extractedData.specifications).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-green-600 dark:text-green-400">{key}:</span>
                              <span>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}