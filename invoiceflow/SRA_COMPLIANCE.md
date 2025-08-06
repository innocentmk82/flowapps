# SRA (Swaziland Revenue Authority) Compliance

This document outlines the SRA compliance features implemented in the revenue reporting system.

## Overview

The system has been updated to generate revenue reports that comply with Swaziland Revenue Authority (SRA) requirements. The reports include all mandatory fields in the exact format specified by SRA.

## Required Fields

The SRA-compliant revenue report includes the following fields:

1. **Customer/Supplier Name** - Name of the party involved
2. **Taxpayer ID (TIN)** - Official tax identifier
3. **Invoice Number** - Official invoice reference
4. **Invoice Date** - Date in DD/MM/YYYY format
5. **Description** - Services or goods provided
6. **Amount (excl. VAT)** - Net transaction value
7. **VAT Amount** - VAT charged for each invoice

## Features Implemented

### 1. SRA-Compliant Report Export
- **Location**: `src/components/reports/ReportsView.tsx`
- **Function**: `exportToCSV()`
- **Output**: CSV file with SRA-required fields
- **Filename**: `SRA-Revenue-Report-{start-date}-to-{end-date}.csv`

### 2. Comprehensive Report Export
- **Location**: `src/components/reports/ReportsView.tsx`
- **Function**: `exportSRAComprehensiveReport()`
- **Output**: CSV file including both invoices and payments
- **Filename**: `SRA-Comprehensive-Report-{start-date}-to-{end-date}.csv`

### 3. Client Taxpayer ID Field
- **Location**: `src/types/index.ts` and `src/components/clients/ClientForm.tsx`
- **Field**: `taxId` (optional string)
- **Purpose**: Store taxpayer identification numbers for SRA compliance

### 4. Date Formatting
- **Location**: `src/lib/utils.ts`
- **Function**: `formatDateForSRA()`
- **Format**: DD/MM/YYYY as required by SRA

### 5. Data Validation
- **Location**: `src/lib/utils.ts`
- **Function**: `validateSRAReportData()`
- **Purpose**: Validate report data before export

## Usage

### Exporting SRA Reports

1. Navigate to the Reports page
2. Select date range
3. Click "Export SRA Report" for invoice-only data
4. Click "Export Comprehensive Report" for invoices and payments

### Adding Taxpayer IDs

1. Go to Clients page
2. Add or edit a client
3. Fill in the "Taxpayer ID (TIN)" field
4. Save the client

## Technical Details

### Data Structure
```typescript
interface SRAReportRow {
  'Customer/Supplier Name': string;
  'Taxpayer ID (TIN)': string;
  'Invoice Number': string;
  'Invoice Date': string; // DD/MM/YYYY format
  'Description': string;
  'Amount (excl. VAT)': string;
  'VAT Amount': string;
}
```

### Validation Rules
- Customer/Supplier Name is required
- Invoice Number is required
- Invoice Date is required and must be in DD/MM/YYYY format
- Amount (excl. VAT) must be a valid number
- VAT Amount must be a valid number

## Compliance Notes

- All dates are formatted as DD/MM/YYYY as required by SRA
- VAT calculations are based on the invoice tax percentage
- Missing taxpayer IDs are handled gracefully (empty string)
- Report validation provides warnings for missing or invalid data

## Future Enhancements

- Add support for different VAT rates
- Implement automatic SRA submission
- Add more detailed validation rules
- Support for different report periods (monthly, quarterly, annual) 