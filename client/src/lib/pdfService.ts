import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';

// Extend jsPDF type to include autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

// HVAC Unit interfaces
interface OriginalUnit {
  modelNumber: string;
  manufacturer: string;
  confidence?: number;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  btuCapacity: number;
  voltage: string;
  phases: string;
  specifications: Array<{
    label: string;
    value: string;
    unit?: string;
  }>;
}

interface DaikinReplacement {
  id: string;
  modelNumber: string;
  systemType: "Heat Pump" | "Gas/Electric" | "Straight A/C";
  btuCapacity: number;
  voltage: string;
  phases: string;
  specifications: Array<{
    label: string;
    value: string;
    unit?: string;
  }>;
  sizeMatch: "smaller" | "direct" | "larger";
  compatibilityScore?: number; // 0-100 compatibility percentage
  seerRating?: number;
  eerRating?: number;
  hspfRating?: number;
  refrigerant?: string;
  driveType?: string;
  soundLevel?: number;
  dimensions?: { length: number; width: number; height: number };
  weight?: number;
}

// Nomenclature segment interface for detailed breakdown
interface NomenclatureSegment {
  position: string;
  code: string;
  description: string;
  options?: Array<{ value: string; description: string; }>;
  selectedValue?: string;
}

// Enhanced search criteria interface
interface SearchCriteria {
  systemType: string;
  tonnage: string;
  voltage: string;
  phases?: string;
  efficiency?: string;
  heatingBTU?: number;
  heatKitKW?: number;
  gasCategory?: string;
  maxSoundLevel?: number;
  refrigerant?: string;
  driveType?: string;
}

// Enhanced export options with comprehensive features
interface ExportOptions {
  includeProjectInfo?: boolean;
  includeEnvironmentalBenefits?: boolean;
  includeCostAnalysis?: boolean;
  includeNomenclatureBreakdown?: boolean;
  includeSearchCriteria?: boolean;
  includeNotesSection?: boolean;
  includeCompatibilityScores?: boolean; // New option for compatibility analysis
  technician?: string;
  customer?: string;
  project?: string;
  projectDate?: string;
  notes?: string;
  technicianNotes?: string;
  searchCriteria?: SearchCriteria;
  nomenclatureSegments?: NomenclatureSegment[];
}

export class PDFService {
  private doc: jsPDF;
  private currentY: number = 20;
  private readonly pageHeight: number = 279; // A4 height in mm minus margins
  private readonly pageWidth: number = 210; // A4 width in mm
  private readonly marginLeft: number = 15;
  private readonly marginRight: number = 15;
  private readonly contentWidth: number = 180; // Page width minus margins
  
  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  }

  // Helper method to call autoTable using the instance method (most robust approach)
  private generateTable(options: UserOptions): void {
    // Set default startY if not provided
    if (!options.startY) {
      options.startY = this.currentY;
    }
    
    // Use the autoTable method directly on the jsPDF instance
    // This approach ensures maximum compatibility with the jsPDF-autoTable library
    this.doc.autoTable(options);
    
    // Update currentY from the lastAutoTable finalY position
    if (this.doc.lastAutoTable) {
      this.currentY = this.doc.lastAutoTable.finalY;
    }
  }

  // Add professional header with enhanced project details
  private addHeader(title: string, options: ExportOptions = {}): void {
    // Company header background
    this.doc.setFillColor(0, 114, 198); // Daikin blue
    this.doc.rect(0, 0, this.pageWidth, 30, 'F');
    
    // Title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(18);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(title, this.marginLeft, 12);
    
    // Subtitle
    this.doc.setFontSize(9);
    this.doc.text('Professional HVAC Equipment Replacement Analysis', this.marginLeft, 18);
    
    // Project name (if provided)
    if (options.project) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`Project: ${options.project}`, this.marginLeft, 24);
    }
    
    // Date and time
    const now = new Date();
    const dateStr = options.projectDate || now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.text(`Generated: ${dateStr} at ${timeStr}`, this.pageWidth - this.marginRight - 55, 12);
    
    // Technician info (if provided)
    if (options.technician) {
      this.doc.text(`Technician: ${options.technician}`, this.pageWidth - this.marginRight - 55, 18);
    }
    
    // Customer info (if provided)
    if (options.customer) {
      this.doc.text(`Customer: ${options.customer}`, this.pageWidth - this.marginRight - 55, 24);
    }
    
    this.currentY = 40;
  }

  // Add footer with page numbers and professional disclaimer
  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Footer line
      this.doc.setDrawColor(200, 200, 200);
      this.doc.line(this.marginLeft, this.pageHeight - 15, this.pageWidth - this.marginRight, this.pageHeight - 15);
      
      // Page number
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(`Page ${i} of ${pageCount}`, this.pageWidth - this.marginRight - 20, this.pageHeight - 8);
      
      // Professional disclaimer
      this.doc.text('Professional installation required. Consult with certified HVAC technician.', this.marginLeft, this.pageHeight - 8);
    }
  }

  // Check if we need a new page
  private checkNewPage(requiredHeight: number = 20): void {
    if (this.currentY + requiredHeight > this.pageHeight - 20) {
      this.doc.addPage();
      this.currentY = 20;
    }
  }

  // Add enhanced search criteria section
  private addSearchCriteria(options: ExportOptions): void {
    if (!options.includeSearchCriteria || !options.searchCriteria) return;

    this.checkNewPage(50);
    
    // Section header
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 114, 198);
    this.doc.text('Original Search Criteria & Requirements', this.marginLeft, this.currentY);
    this.currentY += 15;

    const criteria = options.searchCriteria;
    const searchData = [
      ['Requirement', 'Specification', 'Notes'],
      ['System Type', criteria.systemType, 'Primary HVAC system classification'],
      ['Tonnage', `${criteria.tonnage} Tons`, 'Cooling capacity requirement'],
      ['Voltage', criteria.voltage, 'Electrical supply specification'],
      ['Phases', criteria.phases || 'Not specified', 'Electrical configuration'],
      ['Efficiency Level', criteria.efficiency || 'Standard', 'Energy efficiency preference']
    ];

    // Add conditional requirements
    if (criteria.heatingBTU) {
      searchData.push(['Heating BTU', `${criteria.heatingBTU.toLocaleString()} BTU/hr`, 'Heating capacity requirement']);
    }
    if (criteria.gasCategory) {
      searchData.push(['Gas Type', criteria.gasCategory, 'Fuel type for Gas/Electric systems']);
    }
    if (criteria.maxSoundLevel) {
      searchData.push(['Max Sound Level', `${criteria.maxSoundLevel} dB`, 'Noise level limitation']);
    }
    if (criteria.refrigerant) {
      searchData.push(['Refrigerant Type', criteria.refrigerant, 'Preferred refrigerant']);
    }
    if (criteria.driveType) {
      searchData.push(['Drive Type', criteria.driveType, 'Motor control preference']);
    }

    this.generateTable({
      startY: this.currentY,
      head: [searchData[0]],
      body: searchData.slice(1),
      theme: 'grid',
      headStyles: {
        fillColor: [0, 114, 198],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { cellWidth: 50, textColor: [0, 114, 198], fontStyle: 'bold' },
        2: { cellWidth: 85, fontSize: 8, textColor: [100, 100, 100] }
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      margin: { left: this.marginLeft, right: this.marginRight }
    });

    this.currentY += 15;
  }

  // Add project information section
  private addProjectInfo(options: ExportOptions): void {
    if (!options.includeProjectInfo) return;

    this.checkNewPage(40);
    
    // Section header
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Project Information', this.marginLeft, this.currentY);
    this.currentY += 10;

    // Draw section border
    this.doc.setDrawColor(0, 114, 198);
    this.doc.rect(this.marginLeft, this.currentY - 5, this.contentWidth, 30);
    this.currentY += 5;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    
    const projectData = [
      ['Customer:', options.customer || '__________________________'],
      ['Project:', options.project || '__________________________'],
      ['Technician:', options.technician || '__________________________'],
      ['Notes:', options.notes || '__________________________']
    ];

    projectData.forEach(([label, value], index) => {
      this.doc.text(label, this.marginLeft + 5, this.currentY + (index * 5));
      this.doc.text(value, this.marginLeft + 30, this.currentY + (index * 5));
    });

    this.currentY += 35;
  }

  // Add R-32 environmental benefits section
  private addEnvironmentalBenefits(): void {
    this.checkNewPage(50);
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 114, 198);
    this.doc.text('Environmental Benefits of R-32 Refrigerant', this.marginLeft, this.currentY);
    this.currentY += 10;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(0, 0, 0);

    const benefits = [
      '• 68% lower Global Warming Potential (GWP) than R-410A',
      '• Improved energy efficiency reduces power consumption',
      '• Better heat transfer properties for superior performance',
      '• Lower refrigerant charge requirements',
      '• Reduced environmental impact throughout system lifecycle',
      '• Complies with future environmental regulations'
    ];

    benefits.forEach(benefit => {
      this.doc.text(benefit, this.marginLeft + 5, this.currentY);
      this.currentY += 6;
    });

    this.currentY += 10;
  }

  // Generate enhanced replacement recommendations table with sizing emphasis
  private generateReplacementTable(replacements: DaikinReplacement[], original?: OriginalUnit, options: ExportOptions = {}): void {
    this.checkNewPage(100);

    // Section header
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 114, 198);
    this.doc.text('Daikin Replacement Recommendations', this.marginLeft, this.currentY);
    this.currentY += 8;

    // Add sizing explanation
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('Direct Match = Same capacity | Up Size = Larger capacity | Down Size = Smaller capacity', this.marginLeft, this.currentY);
    this.currentY += 15;

    // Group replacements by size match
    const directMatches = replacements.filter(r => r.sizeMatch === 'direct');
    const upSizes = replacements.filter(r => r.sizeMatch === 'larger');
    const downSizes = replacements.filter(r => r.sizeMatch === 'smaller');

    // Create sections for each match type
    const sections = [
      { title: 'Direct Match Replacements (Recommended)', units: directMatches, color: [34, 139, 34] as [number, number, number] },
      { title: 'Up-Size Options (Higher Capacity)', units: upSizes, color: [255, 140, 0] as [number, number, number] },
      { title: 'Down-Size Options (Lower Capacity)', units: downSizes, color: [220, 20, 60] as [number, number, number] }
    ];

    sections.forEach((section) => {
      if (section.units.length > 0) {
        // Section title
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(12);
        this.doc.setTextColor(section.color[0], section.color[1], section.color[2]);
        this.doc.text(section.title, this.marginLeft, this.currentY);
        this.currentY += 10;

        // Check if compatibility scores should be included
        const includeCompatibility = options.includeCompatibilityScores !== false && section.units.some(u => u.compatibilityScore);
        
        // Create header with conditional compatibility column
        const headers = ['Model Number', 'Capacity', 'SEER', 'Sound', 'Refrigerant', 'Drive'];
        if (includeCompatibility) {
          headers.push('Compatibility');
        }
        headers.push('Match Type');

        // Prepare table data with optional compatibility scores
        const tableData = section.units.map(unit => {
          const baseRow = [
            unit.modelNumber,
            this.formatBTU(unit.btuCapacity),
            `${unit.seerRating || 'N/A'}`,
            `${unit.soundLevel || 'N/A'} dB`,
            unit.refrigerant || 'R-32',
            unit.driveType || 'Variable'
          ];
          
          if (includeCompatibility) {
            baseRow.push(unit.compatibilityScore ? `${unit.compatibilityScore}%` : 'N/A');
          }
          
          baseRow.push(this.getSizeMatchIndicator(unit.sizeMatch));
          return baseRow;
        });

        this.generateTable({
          startY: this.currentY,
          head: [headers],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: section.color,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2
          },
          columnStyles: (() => {
            const styles: any = {
              0: { fontStyle: 'bold', cellWidth: includeCompatibility ? 24 : 30 },
              1: { cellWidth: includeCompatibility ? 18 : 22 },
              2: { cellWidth: includeCompatibility ? 14 : 18 },
              3: { cellWidth: includeCompatibility ? 14 : 18 },
              4: { cellWidth: includeCompatibility ? 18 : 22 },
              5: { cellWidth: includeCompatibility ? 18 : 22 }
            };
            
            if (includeCompatibility) {
              styles[6] = { cellWidth: 20, textColor: [0, 114, 198], fontStyle: 'bold' };
              styles[7] = { cellWidth: 18, textColor: [section.color[0], section.color[1], section.color[2]], fontStyle: 'bold' };
            } else {
              styles[6] = { cellWidth: 25, textColor: [section.color[0], section.color[1], section.color[2]], fontStyle: 'bold' };
            }
            
            return styles;
          })(),
          margin: { left: this.marginLeft, right: this.marginRight }
        });

        this.currentY += 10;
      }
    });
  }

  // Generate comparison table for original vs replacement units
  private generateComparisonTable(original: OriginalUnit, replacement: DaikinReplacement): void {
    this.checkNewPage(80);

    // Section header
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Equipment Comparison Analysis', this.marginLeft, this.currentY);
    this.currentY += 15;

    // Get SEER values for comparison
    const originalSeer = this.getSpecValue(original.specifications, 'SEER2 Rating') || 
                        this.getSpecValue(original.specifications, 'SEER') || 
                        'N/A';
    const replacementSeer = replacement.seerRating ? replacement.seerRating.toString() : 
                           this.getSpecValue(replacement.specifications, 'SEER') || 
                           'N/A';

    // Prepare comparison data
    const comparisonData = [
      ['Specification', 'Original Unit', 'Daikin Replacement', 'Improvement'],
      ['Model Number', original.modelNumber, replacement.modelNumber, '—'],
      ['Manufacturer', original.manufacturer, 'Daikin', 'R-32 Technology'],
      ['System Type', original.systemType, replacement.systemType, this.getSystemMatch(original.systemType, replacement.systemType)],
      ['BTU Capacity', this.formatBTU(original.btuCapacity), this.formatBTU(replacement.btuCapacity), this.getSizeMatch(replacement.sizeMatch)],
      ['Voltage', original.voltage, replacement.voltage, this.getVoltageMatch(original.voltage, replacement.voltage)],
      ['Phases', original.phases, replacement.phases, this.getPhaseMatch(original.phases, replacement.phases)],
      ['SEER2 Rating', originalSeer, replacementSeer, this.getEfficiencyImprovement(originalSeer, replacementSeer)],
      ['Refrigerant', this.getSpecValue(original.specifications, 'Refrigerant') || 'R-410A', replacement.refrigerant || 'R-32', 'Eco-Friendly'],
      ['Drive Type', this.getSpecValue(original.specifications, 'Drive Type') || 'Fixed', replacement.driveType || 'Variable', 'Advanced Control'],
      ['Sound Level', this.getSpecValue(original.specifications, 'Sound Level') || 'N/A', replacement.soundLevel ? `${replacement.soundLevel} dB` : 'N/A', 'Quieter Operation']
    ];

    // Generate the table
    this.generateTable({
      startY: this.currentY,
      head: [comparisonData[0]],
      body: comparisonData.slice(1),
      theme: 'grid',
      headStyles: {
        fillColor: [0, 114, 198],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45, textColor: [0, 114, 198], fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: this.marginLeft, right: this.marginRight }
    });

    this.currentY += 15;
  }

  // Add nomenclature breakdown section
  private addNomenclatureBreakdown(unit: DaikinReplacement, options: ExportOptions): void {
    if (!options.includeNomenclatureBreakdown || !options.nomenclatureSegments) return;

    this.checkNewPage(80);
    
    // Section header
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 114, 198);
    this.doc.text(`Nomenclature Breakdown - ${unit.modelNumber}`, this.marginLeft, this.currentY);
    this.currentY += 8;

    // Add explanation
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('Each position in the model number represents specific technical characteristics', this.marginLeft, this.currentY);
    this.currentY += 15;

    // Prepare nomenclature data
    const nomenclatureData = options.nomenclatureSegments.map(segment => [
      segment.position,
      segment.code,
      segment.description,
      segment.options?.find(opt => opt.value === segment.selectedValue)?.description || segment.description
    ]);

    this.generateTable({
      startY: this.currentY,
      head: [['Position', 'Code', 'Category', 'Description']],
      body: nomenclatureData,
      theme: 'grid',
      headStyles: {
        fillColor: [0, 114, 198],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 30 },
        1: { cellWidth: 20, textColor: [0, 114, 198], fontStyle: 'bold' },
        2: { cellWidth: 50 },
        3: { cellWidth: 80, fontSize: 8 }
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      margin: { left: this.marginLeft, right: this.marginRight }
    });

    this.currentY += 15;
  }

  // Add professional compatibility score breakdown
  private addCompatibilityScoreBreakdown(unit: DaikinReplacement, original: OriginalUnit, searchCriteria: SearchCriteria): void {
    if (!unit.compatibilityScore) return;
    
    this.checkNewPage(80);
    
    // Section header
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 114, 198);
    this.doc.text(`Compatibility Analysis - ${unit.modelNumber}`, this.marginLeft, this.currentY);
    this.currentY += 8;
    
    // Overall score display
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(`Overall Compatibility Score: ${unit.compatibilityScore}%`, this.marginLeft, this.currentY);
    
    // Add color-coded score indicator
    const scoreColor = this.getCompatibilityScoreColor(unit.compatibilityScore);
    this.doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    this.doc.rect(this.marginLeft + 70, this.currentY - 5, 20, 8, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(10);
    this.doc.text(`${unit.compatibilityScore}%`, this.marginLeft + 75, this.currentY);
    
    this.currentY += 15;
    
    // Calculate detailed breakdown scores
    const breakdown = this.calculateCompatibilityBreakdown(unit, original, searchCriteria);
    
    // Compatibility breakdown table
    const breakdownData = [
      ['Compatibility Factor', 'Weight', 'Original', 'Replacement', 'Score', 'Points Earned'],
      ['System Type Match', '25%', original.systemType, unit.systemType, breakdown.systemType.match ? '✓' : '✗', `${breakdown.systemType.points}/25`],
      ['Capacity Match', '30%', this.formatBTU(original.btuCapacity), this.formatBTU(unit.btuCapacity), this.getSizeMatchIndicator(unit.sizeMatch), `${breakdown.capacity.points}/30`],
      ['Voltage Match', '20%', original.voltage, unit.voltage, breakdown.voltage.match ? '✓' : '✗', `${breakdown.voltage.points}/20`],
      ['Phase Match', '10%', original.phases, unit.phases, breakdown.phases.match ? '✓' : '✗', `${breakdown.phases.points}/10`],
      ['Efficiency Level', '15%', this.getEfficiencyFromSeer(breakdown.efficiency.originalSeer), this.getEfficiencyFromSeer(breakdown.efficiency.replacementSeer), this.getEfficiencyComparison(breakdown.efficiency.originalSeer, breakdown.efficiency.replacementSeer), `${breakdown.efficiency.points}/15`]
    ];
    
    this.generateTable({
      startY: this.currentY,
      head: [breakdownData[0]],
      body: breakdownData.slice(1),
      theme: 'grid',
      headStyles: {
        fillColor: [0, 114, 198],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35 },
        1: { cellWidth: 15, textColor: [100, 100, 100] },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25, fontStyle: 'bold' },
        5: { cellWidth: 25, textColor: [0, 114, 198], fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      margin: { left: this.marginLeft, right: this.marginRight }
    });
    
    this.currentY += 15;
    
    // Add recommendations based on score
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Recommendation:', this.marginLeft, this.currentY);
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    const recommendation = this.getCompatibilityRecommendation(unit.compatibilityScore);
    const recommendationLines = this.doc.splitTextToSize(recommendation, this.contentWidth - 10);
    
    recommendationLines.forEach((line: string, index: number) => {
      this.doc.text(line, this.marginLeft + 5, this.currentY + 5 + (index * 5));
    });
    
    this.currentY += 5 + (recommendationLines.length * 5) + 15;
  }

  // Helper method to get compatibility score color
  private getCompatibilityScoreColor(score: number): [number, number, number] {
    if (score >= 90) return [34, 139, 34]; // Green
    if (score >= 80) return [0, 114, 198]; // Blue
    if (score >= 70) return [255, 193, 7]; // Yellow
    if (score >= 60) return [255, 140, 0]; // Orange
    return [220, 53, 69]; // Red
  }

  // Helper method to calculate detailed compatibility breakdown
  private calculateCompatibilityBreakdown(unit: DaikinReplacement, original: OriginalUnit, searchCriteria: SearchCriteria) {
    const originalSeer = this.getSpecValue(original.specifications, 'SEER2 Rating') || 
                        this.getSpecValue(original.specifications, 'SEER') || 16;
    const replacementSeer = unit.seerRating || 16;
    
    return {
      systemType: {
        match: original.systemType === unit.systemType,
        points: original.systemType === unit.systemType ? 25 : 
                ((original.systemType === "Heat Pump" && unit.systemType === "Gas/Electric") || 
                 (original.systemType === "Gas/Electric" && unit.systemType === "Heat Pump")) ? 15 : 0
      },
      capacity: {
        tonnageDiff: Math.abs((original.btuCapacity / 12000) - (unit.btuCapacity / 12000)),
        points: this.getCapacityPoints(Math.abs((original.btuCapacity / 12000) - (unit.btuCapacity / 12000)))
      },
      voltage: {
        match: original.voltage === unit.voltage,
        points: original.voltage === unit.voltage ? 20 : 0
      },
      phases: {
        match: original.phases === unit.phases,
        points: original.phases === unit.phases ? 10 : (original.voltage === unit.voltage ? 5 : 0)
      },
      efficiency: {
        originalSeer: parseFloat(originalSeer.toString()),
        replacementSeer: replacementSeer,
        points: this.getEfficiencyPoints(searchCriteria.efficiency || 'standard', replacementSeer)
      }
    };
  }

  // Helper method to get capacity points
  private getCapacityPoints(tonnageDiff: number): number {
    if (tonnageDiff === 0) return 30;
    if (tonnageDiff <= 0.5) return 25;
    if (tonnageDiff <= 1.0) return 20;
    if (tonnageDiff <= 1.5) return 10;
    return 0;
  }

  // Helper method to get efficiency points
  private getEfficiencyPoints(requestedEfficiency: string, seer: number): number {
    if (requestedEfficiency === "high" && seer >= 16) return 15;
    if (requestedEfficiency === "standard" && seer >= 14 && seer < 18) return 15;
    return Math.max(0, 15 - Math.abs((seer - 16) * 2));
  }

  // Helper method to get efficiency from SEER
  private getEfficiencyFromSeer(seer: number): string {
    if (seer >= 18) return "High Efficiency";
    if (seer >= 16) return "High Efficiency";
    if (seer >= 14) return "Standard Efficiency";
    return "Standard";
  }

  // Helper method to get efficiency comparison
  private getEfficiencyComparison(originalSeer: number, replacementSeer: number): string {
    const diff = replacementSeer - originalSeer;
    if (diff > 2) return "Much Better";
    if (diff > 0) return "Better";
    if (diff === 0) return "Same";
    if (diff > -2) return "Slightly Lower";
    return "Lower";
  }

  // Helper method to get compatibility recommendation
  private getCompatibilityRecommendation(score: number): string {
    if (score >= 95) return "Excellent match! This replacement unit meets or exceeds all original specifications and is highly recommended for professional installation.";
    if (score >= 85) return "Very good match. This replacement unit aligns well with original requirements with minor variations that should not affect performance.";
    if (score >= 75) return "Good match. This unit provides suitable replacement with acceptable variations. Recommend reviewing specific differences with customer.";
    if (score >= 65) return "Acceptable match. Some specifications differ from original. Professional assessment recommended to ensure suitability for application.";
    return "Limited match. Significant differences from original specifications. Careful evaluation required before recommending this replacement.";
  }

  // Add detailed specifications section
  private addDetailedSpecifications(unit: DaikinReplacement): void {
    this.checkNewPage(60);
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text(`Detailed Specifications - ${unit.modelNumber}`, this.marginLeft, this.currentY);
    this.currentY += 10;

    const specs = [];
    
    if (unit.dimensions) {
      specs.push(['Dimensions (L×W×H)', `${unit.dimensions.length}" × ${unit.dimensions.width}" × ${unit.dimensions.height}"`]);
    }
    
    if (unit.weight) {
      specs.push(['Weight', `${unit.weight} lbs`]);
    }

    if (unit.eerRating) {
      specs.push(['EER Rating', `${unit.eerRating}`]);
    }

    if (unit.hspfRating) {
      specs.push(['HSPF Rating', `${unit.hspfRating}`]);
    }

    // Add other specifications from the specifications array
    unit.specifications.forEach(spec => {
      specs.push([spec.label, `${spec.value}${spec.unit || ''}`]);
    });

    if (specs.length > 0) {
      this.generateTable({
        startY: this.currentY,
        body: specs,
        theme: 'striped',
        bodyStyles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { cellWidth: 120 }
        },
        margin: { left: this.marginLeft, right: this.marginRight }
      });

      this.currentY += 15;
    }
  }

  // Add technician notes section
  private addNotesSection(options: ExportOptions): void {
    if (!options.includeNotesSection) return;

    this.checkNewPage(60);
    
    // Section header
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 114, 198);
    this.doc.text('Technician Notes & Comments', this.marginLeft, this.currentY);
    this.currentY += 15;

    // Pre-filled notes if provided
    if (options.technicianNotes) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(10);
      this.doc.setTextColor(0, 0, 0);
      
      // Split notes into lines and handle wrapping
      const notes = options.technicianNotes;
      const lines = this.doc.splitTextToSize(notes, this.contentWidth - 10);
      
      lines.forEach((line: string, index: number) => {
        this.doc.text(line, this.marginLeft + 5, this.currentY + (index * 5));
      });
      
      this.currentY += (lines.length * 5) + 10;
    }

    // Add blank lines for field notes
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.text('Field Notes:', this.marginLeft, this.currentY);
    this.currentY += 8;

    // Draw lines for writing notes
    this.doc.setDrawColor(200, 200, 200);
    for (let i = 0; i < 8; i++) {
      this.doc.line(this.marginLeft, this.currentY + (i * 6), this.pageWidth - this.marginRight, this.currentY + (i * 6));
    }
    
    this.currentY += 50;

    // Add signature section
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(0, 0, 0);
    
    const signatureY = this.currentY;
    this.doc.text('Technician Signature:', this.marginLeft, signatureY);
    this.doc.text('Date:', this.marginLeft + 90, signatureY);
    
    // Draw signature lines
    this.doc.setDrawColor(0, 0, 0);
    this.doc.line(this.marginLeft + 45, signatureY + 2, this.marginLeft + 85, signatureY + 2);
    this.doc.line(this.marginLeft + 105, signatureY + 2, this.marginLeft + 145, signatureY + 2);
    
    this.currentY += 20;
  }

  // Add energy cost savings analysis
  private addCostAnalysis(original: OriginalUnit, replacement: DaikinReplacement): void {
    this.checkNewPage(50);
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 114, 198);
    this.doc.text('Energy Cost Analysis', this.marginLeft, this.currentY);
    this.currentY += 15;

    const originalSeer = parseFloat(this.getSpecValue(original.specifications, 'SEER') || '12');
    const replacementSeer = replacement.seerRating || 16;
    const capacity = replacement.btuCapacity;
    
    // Calculate estimated annual savings
    const annualSavings = this.calculateAnnualSavings(originalSeer, replacementSeer, capacity);
    const lifeTimeSavings = annualSavings * 15; // Assume 15-year lifespan
    
    const costData = [
      ['Analysis Factor', 'Value', 'Notes'],
      ['Original SEER', originalSeer.toString(), 'Current efficiency rating'],
      ['New SEER', replacementSeer.toString(), 'Improved efficiency rating'],
      ['Efficiency Improvement', `${((replacementSeer / originalSeer - 1) * 100).toFixed(1)}%`, 'Energy reduction'],
      ['Est. Annual Savings', `$${annualSavings.toFixed(0)}`, 'Based on $0.12/kWh, 2000 hours/year'],
      ['15-Year Savings', `$${lifeTimeSavings.toFixed(0)}`, 'Total lifecycle savings'],
      ['Payback Period', '3-5 years', 'Typical ROI timeframe']
    ];

    this.generateTable({
      startY: this.currentY,
      head: [costData[0]],
      body: costData.slice(1),
      theme: 'grid',
      headStyles: {
        fillColor: [0, 114, 198],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 40, textColor: [0, 114, 198], fontStyle: 'bold' },
        2: { cellWidth: 80 }
      },
      margin: { left: this.marginLeft, right: this.marginRight }
    });

    this.currentY += 10;
    
    // Add disclaimer
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('*Savings calculations are estimates based on typical usage patterns and average energy costs.', this.marginLeft, this.currentY);
    this.doc.text('Actual savings may vary based on local utility rates, usage patterns, and installation conditions.', this.marginLeft, this.currentY + 5);
    this.currentY += 20;
  }

  // Export comprehensive specification report
  public exportSpecificationReport(
    replacements: DaikinReplacement[],
    options: ExportOptions = {}
  ): void {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.currentY = 20;

    // Add enhanced header with project details
    this.addHeader('HVAC Equipment Specification Report', options);

    // Add search criteria section
    if (options.includeSearchCriteria !== false) {
      this.addSearchCriteria(options);
    }

    // Add project information
    this.addProjectInfo(options);

    // Add replacement recommendations table with Direct/Up/Down sizing
    this.generateReplacementTable(replacements, undefined, options);

    // Add detailed specifications for each unit
    replacements.forEach((replacement, index) => {
      if (index > 0 || this.currentY > 200) {
        this.doc.addPage();
        this.currentY = 20;
      }
      
      this.addDetailedSpecifications(replacement);
      
      // Add compatibility score breakdown if explicitly enabled and search criteria available
      if (options.includeCompatibilityScores === true && replacement.compatibilityScore && options.searchCriteria) {
        // Create a mock original unit from search criteria for comparison
        const originalForComparison: OriginalUnit = {
          modelNumber: 'Original Unit',
          manufacturer: 'Various',
          systemType: options.searchCriteria.systemType as "Heat Pump" | "Gas/Electric" | "Straight A/C",
          btuCapacity: parseFloat(options.searchCriteria.tonnage) * 12000,
          voltage: options.searchCriteria.voltage,
          phases: options.searchCriteria.phases || '1',
          specifications: []
        };
        
        this.addCompatibilityScoreBreakdown(replacement, originalForComparison, options.searchCriteria);
      }
      
      // Add nomenclature breakdown
      if (options.includeNomenclatureBreakdown !== false) {
        this.addNomenclatureBreakdown(replacement, options);
      }
    });

    // Add environmental benefits
    if (options.includeEnvironmentalBenefits !== false) {
      this.addEnvironmentalBenefits();
    }

    // Add notes section
    if (options.includeNotesSection !== false) {
      this.addNotesSection(options);
    }

    // Add footer
    this.addFooter();

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const projectName = options.project ? `_${options.project.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    const filename = `HVAC_Specification_Report${projectName}_${timestamp}.pdf`;

    // Download the PDF
    this.doc.save(filename);
  }

  // Export single comparison report
  public exportComparisonReport(
    original: OriginalUnit,
    replacement: DaikinReplacement,
    options: ExportOptions = {}
  ): void {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.currentY = 20;

    // Add enhanced header
    this.addHeader('HVAC Equipment Replacement Report', options);

    // Add search criteria if available
    if (options.includeSearchCriteria !== false && options.searchCriteria) {
      this.addSearchCriteria(options);
    }

    // Add project information
    this.addProjectInfo(options);

    // Add main comparison
    this.generateComparisonTable(original, replacement);

    // Add detailed specifications
    this.addDetailedSpecifications(replacement);

    // Add compatibility score breakdown if explicitly enabled
    if (options.includeCompatibilityScores === true && replacement.compatibilityScore && options.searchCriteria) {
      this.addCompatibilityScoreBreakdown(replacement, original, options.searchCriteria);
    }

    // Add nomenclature breakdown
    if (options.includeNomenclatureBreakdown !== false) {
      this.addNomenclatureBreakdown(replacement, options);
    }

    // Add environmental benefits
    if (options.includeEnvironmentalBenefits !== false) {
      this.addEnvironmentalBenefits();
    }

    // Add cost analysis
    if (options.includeCostAnalysis !== false) {
      this.addCostAnalysis(original, replacement);
    }

    // Add notes section
    if (options.includeNotesSection !== false) {
      this.addNotesSection(options);
    }

    // Add footer
    this.addFooter();

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const projectName = options.project ? `_${options.project.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    const filename = `HVAC_Replacement_Report${projectName}_${timestamp}.pdf`;

    // Download the PDF
    this.doc.save(filename);
  }

  // Helper method to get specification value
  private getSpecValue(specifications: Array<{label: string; value: string; unit?: string}>, label: string): string | undefined {
    const spec = specifications.find(s => s.label.toLowerCase().includes(label.toLowerCase()));
    return spec?.value;
  }

  // Helper method to format BTU capacity
  private formatBTU(btu: number): string {
    if (btu >= 1000000) {
      return `${(btu / 1000000).toFixed(1)}M BTU/hr`;
    } else if (btu >= 1000) {
      return `${(btu / 1000).toFixed(0)}K BTU/hr`;
    }
    return `${btu.toLocaleString()} BTU/hr`;
  }

  // Helper method to get size match indicator
  private getSizeMatchIndicator(sizeMatch: string): string {
    switch (sizeMatch) {
      case 'direct': return 'Direct Match';
      case 'larger': return 'Up-Size';
      case 'smaller': return 'Down-Size';
      default: return 'Unknown';
    }
  }

  // Helper methods for comparison improvements
  private getSystemMatch(original: string, replacement: string): string {
    return original === replacement ? 'Perfect Match' : 'Different Type';
  }

  private getSizeMatch(sizeMatch: string): string {
    switch (sizeMatch) {
      case 'direct': return 'Same Capacity';
      case 'larger': return 'Higher Capacity';
      case 'smaller': return 'Lower Capacity';
      default: return 'Unknown';
    }
  }

  private getVoltageMatch(original: string, replacement: string): string {
    return original === replacement ? 'Compatible' : 'Check Wiring';
  }

  private getPhaseMatch(original: string, replacement: string): string {
    return original === replacement ? 'Compatible' : 'Electrical Upgrade';
  }

  private getEfficiencyImprovement(original: string, replacement: string): string {
    const origNum = parseFloat(original);
    const replNum = parseFloat(replacement);
    
    if (isNaN(origNum) || isNaN(replNum)) return 'Check Specs';
    
    const improvement = ((replNum - origNum) / origNum) * 100;
    
    if (improvement > 0) {
      return `+${improvement.toFixed(1)}% Better`;
    } else if (improvement < 0) {
      return `${improvement.toFixed(1)}% Lower`;
    } else {
      return 'Same Rating';
    }
  }

  // Calculate annual energy savings
  private calculateAnnualSavings(originalSeer: number, newSeer: number, capacity: number): number {
    const annualHours = 2000; // Typical annual cooling hours
    const energyCost = 0.12; // Average cost per kWh
    
    const originalKw = capacity / (originalSeer * 1000);
    const newKw = capacity / (newSeer * 1000);
    
    const annualSavingsKwh = (originalKw - newKw) * annualHours;
    return annualSavingsKwh * energyCost;
  }
}

// Static export functions for backward compatibility
export const exportSingleComparison = (
  original: OriginalUnit,
  replacement: DaikinReplacement,
  options: ExportOptions = {}
): void => {
  const pdfService = new PDFService();
  pdfService.exportComparisonReport(original, replacement, options);
};

export const exportBulkComparison = (
  comparisons: Array<{ original: OriginalUnit; replacement: DaikinReplacement }>,
  options: ExportOptions = {}
): void => {
  const pdfService = new PDFService();
  
  // Create a comprehensive report with all comparisons
  const replacements = comparisons.map(c => c.replacement);
  
  // Use the specification report but enhance it for bulk comparisons
  pdfService.exportSpecificationReport(replacements, {
    ...options,
    includeSearchCriteria: options.includeSearchCriteria !== false,
    includeEnvironmentalBenefits: options.includeEnvironmentalBenefits !== false,
    includeCostAnalysis: options.includeCostAnalysis !== false,
    includeNotesSection: options.includeNotesSection !== false
  });
};

// Export the specification report function
export const exportSpecificationReport = (
  replacements: DaikinReplacement[],
  options: ExportOptions = {}
): void => {
  const pdfService = new PDFService();
  pdfService.exportSpecificationReport(replacements, options);
};