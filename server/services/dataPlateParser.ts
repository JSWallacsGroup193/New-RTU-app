import { DataPlateProcessingResponse, ExtractedDataPlateData } from '@shared/schema';
import Tesseract from 'tesseract.js';

/**
 * Data Plate Parser Service
 * Processes uploaded equipment data plate images and extracts HVAC specifications using OCR
 * 
 * Implementation uses Tesseract.js with proper singleton worker management
 * and honest success/failure reporting without misleading fallbacks.
 */
export class DataPlateParser {
  private static workerInstance: Tesseract.Worker | null = null;
  private static workerInitialized: boolean = false;
  
  /**
   * Process an uploaded image file and extract HVAC equipment data
   */
  async processImageFile(
    fileName: string, 
    fileBuffer: Buffer, 
    mimeType: string
  ): Promise<DataPlateProcessingResponse> {
    const startTime = Date.now();
    
    try {
      // Check for HEIC files which Tesseract.js cannot process
      if (mimeType === 'image/heic') {
        return {
          success: false,
          fileName,
          extractedData: null,
          processingTimeMs: Date.now() - startTime,
          errors: ['HEIC format is not supported for OCR processing.'],
          warnings: [],
          suggestions: [
            'Convert the HEIC image to JPEG or PNG format',
            'Most devices can save photos as JPEG instead of HEIC',
            'Use an online converter or image editing software'
          ]
        };
      }

      // Validate file size as a safety check
      if (fileBuffer.length > DataPlateParser.getMaxFileSize()) {
        return {
          success: false,
          fileName,
          extractedData: null,
          processingTimeMs: Date.now() - startTime,
          errors: ['File size exceeds maximum limit.'],
          warnings: [],
          suggestions: ['Compress the image or take a closer photo of the data plate.']
        };
      }

      // Extract text from image using real OCR processing
      const ocrResult = await this.extractTextFromImage(fileBuffer, mimeType);
      
      // Parse HVAC specifications from extracted text
      const extractedData = this.parseHVACSpecifications(
        ocrResult.text, 
        fileName, 
        ocrResult.confidence
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        fileName,
        extractedData,
        processingTimeMs: processingTime,
        errors: [],
        warnings: this.generateWarnings(extractedData),
        suggestions: this.generateSuggestions(extractedData, ocrResult.text)
      };

    } catch (error) {
      console.error('Data plate processing error:', error);
      
      // Return honest failure - no misleading fake data
      return {
        success: false,
        fileName,
        extractedData: null,
        processingTimeMs: Date.now() - startTime,
        errors: [
          'OCR processing failed - unable to extract text from image',
          error instanceof Error ? error.message : 'Unknown OCR error'
        ],
        warnings: [],
        suggestions: [
          'Ensure the data plate is clearly visible and well-lit',
          'Remove any glare or shadows from the image',
          'Try taking the photo from a different angle',
          'Use a higher resolution image if possible',
          'Make sure all text on the data plate is in focus'
        ]
      };
    }
  }


  /**
   * Extract text from image using Tesseract.js OCR with proper API usage
   * Returns both text and real confidence score
   */
  private async extractTextFromImage(
    fileBuffer: Buffer, 
    mimeType: string
  ): Promise<{ text: string; confidence: number }> {
    console.log(`Starting OCR processing for ${mimeType} image (${fileBuffer.length} bytes)`);
    
    let worker: Tesseract.Worker | null = null;
    
    try {
      // Basic image format validation
      if (fileBuffer.length < 100) {
        throw new Error('Image file appears to be too small or corrupted');
      }
      
      // Check for valid image headers
      const isValidImage = this.validateImageFormat(fileBuffer, mimeType);
      if (!isValidImage) {
        throw new Error(`Invalid image format detected for ${mimeType}`);
      }

      worker = await this.getWorker();
      
      // Configure OCR parameters optimized for data plate text recognition
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/.,:()φ°& ',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD,
        preserve_interword_spaces: '1',
        tessedit_do_invert: '0',
      });

      // Perform OCR on the image buffer with timeout protection
      const recognitionPromise = worker.recognize(fileBuffer);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OCR processing timeout after 30 seconds')), 30000);
      });
      
      const { data } = await Promise.race([recognitionPromise, timeoutPromise]) as any;
      
      // Extract and clean the recognized text
      let extractedText = data.text || '';
      
      // Post-process the extracted text to improve quality
      extractedText = this.postProcessOCRText(extractedText);
      
      // Get the real confidence score from Tesseract
      const confidence = Math.max(0, Math.min(1, (data.confidence || 0) / 100)); // Ensure 0-1 scale
      
      console.log(`OCR completed. Extracted ${extractedText.length} characters with confidence: ${(confidence * 100).toFixed(1)}%`);
      
      // Check minimum quality thresholds
      if (confidence < 0.2) {
        throw new Error(`OCR confidence too low (${(confidence * 100).toFixed(1)}%) - image may be unreadable or corrupted`);
      }
      
      if (extractedText.trim().length < 5) {
        throw new Error(`Insufficient text extracted (${extractedText.trim().length} characters) - image may not contain readable text`);
      }

      return { text: extractedText, confidence };

    } catch (error) {
      console.error('OCR processing failed:', error);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'OCR processing failed';
      if (error instanceof Error) {
        if (error.message.includes('read image') || error.message.includes('Unknown format')) {
          errorMessage = 'Invalid or corrupted image file - unable to read image data';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'OCR processing took too long - image may be too complex or large';
        } else if (error.message.includes('confidence') || error.message.includes('text extracted')) {
          errorMessage = error.message; // Use our custom error messages
        } else {
          errorMessage = `OCR engine error: ${error.message}`;
        }
      }
      
      // Re-throw with cleaner error message
      throw new Error(errorMessage);
    }
  }

  /**
   * Get or initialize singleton Tesseract worker with correct API usage
   */
  private async getWorker(): Promise<Tesseract.Worker> {
    if (!DataPlateParser.workerInstance || !DataPlateParser.workerInitialized) {
      console.log('Initializing Tesseract worker...');
      
      try {
        // Create worker with correct API - simple approach
        DataPlateParser.workerInstance = await Tesseract.createWorker('eng', 1, {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });
        
        DataPlateParser.workerInitialized = true;
        console.log('Tesseract worker initialized successfully');
        
      } catch (error) {
        console.error('Failed to initialize Tesseract worker:', error);
        DataPlateParser.workerInstance = null;
        DataPlateParser.workerInitialized = false;
        throw new Error('OCR service initialization failed - please try again');
      }
    }
    
    return DataPlateParser.workerInstance;
  }

  /**
   * Cleanup singleton worker
   */
  static async cleanup(): Promise<void> {
    if (DataPlateParser.workerInstance) {
      await DataPlateParser.workerInstance.terminate();
      DataPlateParser.workerInstance = null;
      DataPlateParser.workerInitialized = false;
      console.log('Tesseract worker terminated');
    }
  }

  /**
   * Post-process OCR text to improve quality and fix common recognition errors
   */
  private postProcessOCRText(rawText: string): string {
    let cleanedText = rawText;

    // Remove excessive whitespace and normalize line breaks
    cleanedText = cleanedText.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n');

    // Fix common OCR misrecognitions for HVAC terminology
    const corrections = [
      // Common OCR mistakes for HVAC terms
      { pattern: /8TU/gi, replacement: 'BTU' },
      { pattern: /VDL/gi, replacement: 'VOL' },
      { pattern: /VOITS/gi, replacement: 'VOLTS' },
      { pattern: /SEEP/gi, replacement: 'SEER' },
      { pattern: /REFRIGEPANT/gi, replacement: 'REFRIGERANT' },
      { pattern: /R-4l0A/gi, replacement: 'R-410A' },
      { pattern: /R-32\s/gi, replacement: 'R-32' },
      { pattern: /MODEl/gi, replacement: 'MODEL' },
      { pattern: /SERIAl/gi, replacement: 'SERIAL' },
      { pattern: /CAPAClTY/gi, replacement: 'CAPACITY' },
      { pattern: /TONIHAGE/gi, replacement: 'TONNAGE' },
      { pattern: /CDOLING/gi, replacement: 'COOLING' },
      { pattern: /HEATING/gi, replacement: 'HEATING' },
      { pattern: /COMPRESSGR/gi, replacement: 'COMPRESSOR' },
      // Phase symbol corrections
      { pattern: /3PH/gi, replacement: '3φ' },
      { pattern: /1PH/gi, replacement: '1φ' },
      { pattern: /3-PHASE/gi, replacement: '3φ' },
      { pattern: /SINGLE\s*PHASE/gi, replacement: '1φ' }
    ];

    corrections.forEach(correction => {
      cleanedText = cleanedText.replace(correction.pattern, correction.replacement);
    });

    return cleanedText.trim();
  }


  /**
   * Parse HVAC specifications from extracted text using pattern matching
   */
  private parseHVACSpecifications(
    text: string, 
    fileName: string, 
    ocrConfidence: number
  ): ExtractedDataPlateData {
    const extractedData: ExtractedDataPlateData = {
      extractionMethod: 'OCR' as const,
      confidence: ocrConfidence // Use real OCR confidence
    };

    // Manufacturer detection
    const manufacturerPatterns = [
      { pattern: /TRANE/i, manufacturer: 'Trane' },
      { pattern: /CARRIER/i, manufacturer: 'Carrier' },
      { pattern: /YORK/i, manufacturer: 'York' },
      { pattern: /LENNOX/i, manufacturer: 'Lennox' },
      { pattern: /GOODMAN/i, manufacturer: 'Goodman' },
      { pattern: /RHEEM/i, manufacturer: 'Rheem' },
      { pattern: /AMANA/i, manufacturer: 'Amana' },
      { pattern: /RUUD/i, manufacturer: 'Ruud' }
    ];

    for (const { pattern, manufacturer } of manufacturerPatterns) {
      if (pattern.test(text)) {
        extractedData.manufacturer = manufacturer;
        break;
      }
    }

    // Model number extraction - multiple patterns
    const modelPatterns = [
      /MODEL:?\s*([A-Z0-9]{8,20})/i,
      /MODEL\s*NO:?\s*([A-Z0-9]{8,20})/i,
      /MODEL\s*NUMBER:?\s*([A-Z0-9]{8,20})/i,
      /^([A-Z]{2,4}\d{3}[A-Z0-9]{3,10})$/m // Standalone model pattern
    ];

    for (const pattern of modelPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        extractedData.modelNumber = match[1].trim();
        break;
      }
    }

    // Capacity extraction - multiple formats
    const capacityPatterns = [
      /(\d+(?:,\d+)?)\s*BTU(?:\/HR)?.*COOL/i,
      /COOLING\s*CAPACITY:?\s*(\d+(?:,\d+)?)\s*BTU/i,
      /CAPACITY:?\s*(\d+\.?\d*)\s*TON/i,
      /(\d+)\s*TON/i,
      /BTU\/HR\s*COOL:?\s*(\d+(?:,\d+)?)/i
    ];

    for (const pattern of capacityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].replace(',', '');
        if (value.includes('TON') || parseFloat(value) < 50) {
          // Tonnage format
          extractedData.capacity = `${value} Ton`;
        } else {
          // BTU format
          extractedData.capacity = `${parseInt(value).toLocaleString()} BTU/hr`;
        }
        break;
      }
    }

    // Voltage extraction - multiple formats
    const voltagePatterns = [
      /VOLTAGE:?\s*(\d+(?:-\d+)?\/\d\/\d+)/i,
      /VOLTS?:?\s*(\d+(?:-\d+)?\/\d\/\d+)/i,
      /SUPPLY\s*VOLTAGE:?\s*(\d+(?:-\d+)?V?\s*\d?φ?)/i,
      /ELECTRICAL:?\s*(\d+(?:-\d+)?V?\/\d+PH)/i,
      /(\d+(?:-\d+)?)\s*V(?:OLTS?)?\s*(\d+)\s*(?:PH|φ|PHASE)/i
    ];

    for (const pattern of voltagePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let voltage = match[1];
        
        // Normalize voltage format
        if (voltage.includes('/')) {
          // Format: 208-230/3/60 -> 208-230V 3φ
          const parts = voltage.split('/');
          voltage = `${parts[0]}V ${parts[1]}φ`;
        } else if (match[2]) {
          // Format: 208-230 V 3 -> 208-230V 3φ  
          voltage = `${match[1]}V ${match[2]}φ`;
        }
        
        extractedData.voltage = voltage;
        break;
      }
    }

    // Serial number extraction
    const serialPatterns = [
      /SERIAL:?\s*([A-Z0-9]{8,20})/i,
      /S\/N:?\s*([A-Z0-9]{8,20})/i,
      /SERIAL\s*NO:?\s*([A-Z0-9]{8,20})/i,
      /SERIAL\s*NUMBER:?\s*([A-Z0-9]{8,20})/i
    ];

    for (const pattern of serialPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        extractedData.serialNumber = match[1].trim();
        break;
      }
    }

    // Additional specifications extraction
    const specifications: Record<string, string> = {};
    
    // Efficiency ratings
    const seerMatch = text.match(/SEER:?\s*(\d+\.?\d*)/i);
    if (seerMatch) specifications['SEER'] = seerMatch[1];
    
    const seer2Match = text.match(/SEER2?:?\s*(\d+\.?\d*)/i);
    if (seer2Match) specifications['SEER2'] = seer2Match[1];
    
    const eerMatch = text.match(/EER:?\s*(\d+\.?\d*)/i);
    if (eerMatch) specifications['EER'] = eerMatch[1];
    
    const hspfMatch = text.match(/HSPF:?\s*(\d+\.?\d*)/i);
    if (hspfMatch) specifications['HSPF'] = hspfMatch[1];

    // Refrigerant type
    const refrigerantMatch = text.match(/REFRIGERANT:?\s*(R-?\d+[A-Z]*)/i);
    if (refrigerantMatch) specifications['Refrigerant'] = refrigerantMatch[1];

    // Compressor type
    const compressorPatterns = [
      /COMP(?:RESSOR)?\s*TYPE:?\s*(SCROLL|RECIPROCATING|ROTARY)/i,
      /COMPRESSOR:?\s*(SCROLL|RECIPROCATING|ROTARY)/i
    ];
    
    for (const pattern of compressorPatterns) {
      const match = text.match(pattern);
      if (match) {
        specifications['Compressor Type'] = match[1].toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        break;
      }
    }

    // Heating capacity
    const heatingMatch = text.match(/(?:HEATING|BTU\/HR\s*HEAT):?\s*(\d+(?:,\d+)?)/i);
    if (heatingMatch) {
      specifications['Heating Capacity'] = `${parseInt(heatingMatch[1].replace(',', '')).toLocaleString()} BTU/hr`;
    }

    // Manufacturing date
    const datePatterns = [
      /MFG\s*DATE:?\s*(\d{1,2}\/\d{4})/i,
      /DATE:?\s*(\d{1,2}-\d{2})/i,
      /YEAR:?\s*(\d{4})/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        specifications['Manufacturing Date'] = match[1];
        break;
      }
    }

    if (Object.keys(specifications).length > 0) {
      extractedData.specifications = specifications;
    }

    return extractedData;
  }

  /**
   * Generate warnings based on extracted data quality
   */
  private generateWarnings(extractedData: ExtractedDataPlateData): string[] {
    const warnings: string[] = [];

    if (!extractedData.modelNumber) {
      warnings.push('Model number could not be detected. Please verify the data plate is clearly visible.');
    }

    if (!extractedData.manufacturer) {
      warnings.push('Manufacturer could not be identified from the image.');
    }

    if (!extractedData.capacity) {
      warnings.push('Equipment capacity information was not found.');
    }

    if (!extractedData.voltage) {
      warnings.push('Voltage specifications were not detected.');
    }

    if (extractedData.confidence && extractedData.confidence < 0.7) {
      warnings.push('Text extraction confidence is low. Consider retaking the photo with better lighting.');
    }

    return warnings;
  }

  /**
   * Generate suggestions for improving extraction results
   */
  private generateSuggestions(extractedData: ExtractedDataPlateData, rawText: string): string[] {
    const suggestions: string[] = [];

    if (!extractedData.modelNumber || !extractedData.manufacturer) {
      suggestions.push('Try taking a closer photo focused on the manufacturer name and model number.');
    }

    if (rawText.length < 100) {
      suggestions.push('The image may not contain enough readable text. Ensure the data plate is fully visible.');
    }

    if (!extractedData.capacity && !extractedData.voltage) {
      suggestions.push('Key specifications are missing. Try improving image lighting and focus on the data plate.');
    }

    // Default helpful suggestions
    suggestions.push('For best results, ensure the data plate is clean and well-lit.');
    suggestions.push('Avoid glare and shadows when photographing equipment data plates.');

    return suggestions;
  }

  /**
   * Get supported file types for validation
   * Note: HEIC is listed but handled with specific error message since Tesseract can't process it
   */
  static getSupportedFileTypes(): string[] {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  }

  /**
   * Get file types that can actually be processed by OCR
   */
  static getOCRSupportedFileTypes(): string[] {
    return ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  }

  /**
   * Get maximum file size limit in bytes
   */
  static getMaxFileSize(): number {
    return 10 * 1024 * 1024; // 10MB
  }

  /**
   * Validate image format by checking file headers
   */
  private validateImageFormat(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 8) return false;
    
    // Check for common image format signatures
    const header = buffer.subarray(0, 8);
    
    // JPEG: FF D8 FF
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
      return header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
    }
    
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (mimeType.includes("png")) {
      return header[0] === 0x89 && header[1] === 0x50 && 
             header[2] === 0x4E && header[3] === 0x47;
    }
    
    // WebP: RIFF ... WEBP
    if (mimeType.includes("webp")) {
      return header[0] === 0x52 && header[1] === 0x49 && 
             header[2] === 0x46 && header[3] === 0x46;
    }
    
    // For other formats, do basic validation
    return buffer.length > 100; // Minimum reasonable image size
  }

}
