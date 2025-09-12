# HVAC Universal Decoder Design Guidelines

## Design Approach
**Utility-Focused Design System Approach**: This professional tool prioritizes efficiency and accuracy for HVAC technicians. Using Material Design principles adapted for industrial/technical applications, emphasizing clear data hierarchy and reliable functionality over visual flourish.

## Core Design Elements

### Color Palette
**Primary Colors:**
- Deep Blue: 210 85% 25% (primary brand, headers, CTAs)
- Light Blue: 210 40% 85% (backgrounds, secondary elements)

**Supporting Colors:**
- Neutral Gray: 220 10% 95% (light backgrounds)
- Dark Gray: 220 15% 20% (text, borders)
- Success Green: 120 60% 45% (match found indicators)
- Warning Orange: 35 85% 55% (size recommendations)

**Dark Mode:**
- Background: 220 15% 8%
- Surface: 220 12% 12%
- Text: 220 10% 90%

### Typography
- **Primary Font**: Inter (Google Fonts) - clean, technical readability
- **Sizes**: Large headings (text-2xl), section headers (text-lg), body text (text-base), technical specs (text-sm)
- **Weights**: Regular (400) for body, Medium (500) for labels, Semibold (600) for headings

### Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8
- Tight spacing: p-2, gap-2 (component internal)
- Standard spacing: p-4, m-4, gap-4 (cards, sections)
- Section spacing: p-6, my-6 (major content blocks)
- Page margins: p-8, max-w-6xl (overall layout)

### Component Library

**Core Components:**
- **Search Input**: Large, prominent with model number validation
- **Manufacturer Badge**: Color-coded chips showing input brand
- **Specification Cards**: Clean data grids with technical details
- **Replacement Grid**: Three-column layout (smaller/direct/larger) with Daikin product cards
- **System Type Tabs**: Heat Pump, Gas/Electric, Straight A/C filtering
- **Status Indicators**: Loading states, error handling, match confidence levels

**Navigation:**
- Simple top navigation with logo and core tools
- Breadcrumb for multi-step lookups
- Quick search always accessible

**Data Display:**
- Comparison tables with clear column headers
- Expandable specification details
- Visual capacity/size indicators
- Compatibility scoring system

**Forms:**
- Autocomplete for model number input
- Advanced search with specification filters
- Clear validation and error states

## Key Design Principles

1. **Technical Clarity**: All specifications and model numbers displayed with maximum legibility
2. **Brand Distinction**: Clear visual separation between input manufacturer and Daikin output recommendations
3. **Efficiency Focus**: Minimal clicks to get from input to actionable replacement options
4. **Professional Aesthetics**: Clean, industrial design appropriate for trade professionals
5. **Data Confidence**: Visual indicators for match accuracy and replacement suitability

## Images
No large hero images needed. Focus on:
- Small manufacturer logos for brand identification
- Product thumbnail images for Daikin replacements
- Technical diagrams or icons for system types (heat pump, gas/electric, A/C)
- Capacity/size comparison visual indicators

The interface should feel like a professional diagnostic tool - clean, reliable, and focused on delivering accurate cross-reference data quickly.