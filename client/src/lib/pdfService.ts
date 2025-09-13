import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
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
  seerRating?: number;
  eerRating?: number;
  hspfRating?: number;
  refrigerant?: string;
  driveType?: string;
  soundLevel?: number;
  dimensions?: { length: number; width: number; height: number };
  weight?: number;
}

interface ExportOptions {
  includeProjectInfo?: boolean;
  includeEnvironmentalBenefits?: boolean;
  includeCostAnalysis?: boolean;
  technician?: string;
  customer?: string;
  project?: string;
  notes?: string;
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

  // Add professional header with Daikin branding
  private addHeader(title: string): void {
    // Company header background
    this.doc.setFillColor(0, 114, 198); // Daikin blue
    this.doc.rect(0, 0, this.pageWidth, 25, 'F');
    
    // Title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(20);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(title, this.marginLeft, 15);
    
    // Subtitle
    this.doc.setFontSize(10);
    this.doc.text('Professional HVAC Equipment Replacement Analysis', this.marginLeft, 20);
    
    // Date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    this.doc.text(`Generated: ${dateStr} at ${timeStr}`, this.pageWidth - this.marginRight - 60, 15);
    
    this.currentY = 35;
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
    const replacementSeer = replacement.seerRating || 
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
    this.doc.autoTable({
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

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
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
      this.doc.autoTable({
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

      this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
    }
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

    this.doc.autoTable({
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

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    
    // Add disclaimer
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('*Savings calculations are estimates based on typical usage patterns and average energy costs.', this.marginLeft, this.currentY);
    this.doc.text('Actual savings may vary based on local utility rates, usage patterns, and installation conditions.', this.marginLeft, this.currentY + 5);
    this.currentY += 20;
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

    // Add header
    this.addHeader('HVAC Equipment Replacement Report');

    // Add project information
    this.addProjectInfo(options);

    // Add main comparison
    this.generateComparisonTable(original, replacement);

    // Add detailed specifications
    this.addDetailedSpecifications(replacement);

    // Add environmental benefits
    if (options.includeEnvironmentalBenefits !== false) {
      this.addEnvironmentalBenefits();
    }

    // Add cost analysis
    if (options.includeCostAnalysis !== false) {
      this.addCostAnalysis(original, replacement);
    }

    // Add footer
    this.addFooter();

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `HVAC_Replacement_Report_${replacement.modelNumber}_${timestamp}.pdf`;

    // Download the PDF
    this.doc.save(filename);
  }

  // Export bulk comparison report for multiple units
  public exportBulkComparisonReport(
    comparisons: Array<{ original: OriginalUnit; replacement: DaikinReplacement }>,
    options: ExportOptions = {}
  ): void {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.currentY = 20;

    // Add header
    this.addHeader('Multi-Unit HVAC Replacement Analysis');

    // Add project information
    this.addProjectInfo(options);

    // Add executive summary
    this.addExecutiveSummary(comparisons);

    // Add each comparison
    comparisons.forEach((comparison, index) => {
      if (index > 0) {
        this.doc.addPage();
        this.currentY = 20;
      }
      
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(16);
      this.doc.setTextColor(0, 114, 198);
      this.doc.text(`Unit ${index + 1} Analysis`, this.marginLeft, this.currentY);
      this.currentY += 15;

      this.generateComparisonTable(comparison.original, comparison.replacement);
      this.addDetailedSpecifications(comparison.replacement);
    });

    // Add environmental benefits
    if (options.includeEnvironmentalBenefits !== false) {
      this.addEnvironmentalBenefits();
    }

    // Add footer
    this.addFooter();

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `HVAC_Multi_Unit_Report_${comparisons.length}Units_${timestamp}.pdf`;

    // Download the PDF
    this.doc.save(filename);
  }

  // Add executive summary for bulk reports
  private addExecutiveSummary(comparisons: Array<{ original: OriginalUnit; replacement: DaikinReplacement }>): void {
    this.checkNewPage(60);
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 114, 198);
    this.doc.text('Executive Summary', this.marginLeft, this.currentY);
    this.currentY += 15;

    const totalCapacity = comparisons.reduce((sum, comp) => sum + comp.replacement.btuCapacity, 0);
    const avgSeerImprovement = this.calculateAvgSeerImprovement(comparisons);
    const totalAnnualSavings = this.calculateTotalSavings(comparisons);

    const summaryData = [
      ['Summary Item', 'Value'],
      ['Total Units', comparisons.length.toString()],
      ['Total Capacity', this.formatBTU(totalCapacity)],
      ['Avg. SEER Improvement', `${avgSeerImprovement.toFixed(1)}%`],
      ['Est. Total Annual Savings', `$${totalAnnualSavings.toFixed(0)}`],
      ['Environmental Benefit', 'R-32 Refrigerant (68% lower GWP)']
    ];

    this.doc.autoTable({
      startY: this.currentY,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: {
        fillColor: [0, 114, 198],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 },
        1: { cellWidth: 90, textColor: [0, 114, 198], fontStyle: 'bold' }
      },
      margin: { left: this.marginLeft, right: this.marginRight }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 20;
  }

  // Utility methods
  private getSpecValue(specs: Array<{label: string, value: string, unit?: string}>, label: string): string | undefined {
    const spec = specs.find(s => s.label.toLowerCase().includes(label.toLowerCase()));
    return spec?.value;
  }

  private formatBTU(btu: number): string {
    return (btu / 1000).toFixed(0) + 'K BTU';
  }

  private getSizeMatch(sizeMatch: string): string {
    switch (sizeMatch) {
      case 'direct': return '✓ Perfect Match';
      case 'larger': return '↑ Oversized';
      case 'smaller': return '↓ Undersized';
      default: return '—';
    }
  }

  private getSystemMatch(original: string, replacement: string): string {
    return original === replacement ? '✓ Match' : `${original} → ${replacement}`;
  }

  private getVoltageMatch(original: string, replacement: string): string {
    return original === replacement ? '✓ Match' : `${original} → ${replacement}`;
  }

  private getPhaseMatch(original: string, replacement: string): string {
    return original === replacement ? '✓ Match' : `${original} → ${replacement}`;
  }

  private getEfficiencyImprovement(original: string | number, replacement: string | number): string {
    const origNum = typeof original === 'string' ? parseFloat(original) : original;
    const replNum = typeof replacement === 'string' ? parseFloat(replacement) : replacement;
    
    if (isNaN(origNum) || isNaN(replNum)) return '—';
    
    const improvement = ((replNum / origNum - 1) * 100);
    return improvement > 0 ? `+${improvement.toFixed(1)}%` : `${improvement.toFixed(1)}%`;
  }

  private calculateAnnualSavings(originalSeer: number, newSeer: number, capacity: number): number {
    const annualKwh = capacity * 2000 / 1000; // Assume 2000 hours of operation
    const originalConsumption = annualKwh / originalSeer;
    const newConsumption = annualKwh / newSeer;
    const kwhSaved = originalConsumption - newConsumption;
    return kwhSaved * 0.12; // Assume $0.12 per kWh
  }

  private calculateAvgSeerImprovement(comparisons: Array<{ original: OriginalUnit; replacement: DaikinReplacement }>): number {
    let totalImprovement = 0;
    let count = 0;

    comparisons.forEach(comp => {
      const originalSeer = parseFloat(this.getSpecValue(comp.original.specifications, 'SEER') || '12');
      const replacementSeer = comp.replacement.seerRating || 16;
      const improvement = ((replacementSeer / originalSeer - 1) * 100);
      totalImprovement += improvement;
      count++;
    });

    return count > 0 ? totalImprovement / count : 0;
  }

  private calculateTotalSavings(comparisons: Array<{ original: OriginalUnit; replacement: DaikinReplacement }>): number {
    return comparisons.reduce((total, comp) => {
      const originalSeer = parseFloat(this.getSpecValue(comp.original.specifications, 'SEER') || '12');
      const replacementSeer = comp.replacement.seerRating || 16;
      const savings = this.calculateAnnualSavings(originalSeer, replacementSeer, comp.replacement.btuCapacity);
      return total + savings;
    }, 0);
  }
}

// Export convenience functions
export const exportSingleComparison = (
  original: OriginalUnit,
  replacement: DaikinReplacement,
  options: ExportOptions = {}
) => {
  const pdfService = new PDFService();
  pdfService.exportComparisonReport(original, replacement, options);
};

export const exportBulkComparison = (
  comparisons: Array<{ original: OriginalUnit; replacement: DaikinReplacement }>,
  options: ExportOptions = {}
) => {
  const pdfService = new PDFService();
  pdfService.exportBulkComparisonReport(comparisons, options);
};

export default PDFService;