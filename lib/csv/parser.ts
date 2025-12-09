// CSV Parser Implementation

import Papa from 'papaparse';
import type {
  CsvRow,
  ParsedCsvRow,
  ParseResult,
  ValidationError,
  DetectedColumns,
} from './types';
import {
  validateHeaders,
  detectOptionalColumns,
  parseRow,
  REQUIRED_COLUMNS,
} from './validator';

/**
 * Parse a CSV file and validate its contents
 * @param file - The CSV file to parse
 * @returns Promise with parse result containing data or errors
 */
export async function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.toLowerCase().trim(),
      complete: (results) => {
        const parseResult = processParseResults(results, file.name);
        resolve(parseResult);
      },
      error: (error) => {
        resolve({
          success: false,
          errors: [
            {
              row: 0,
              column: 'file',
              message: `Failed to parse CSV: ${error.message}`,
            },
          ],
        });
      },
    });
  });
}

/**
 * Parse CSV text content (for testing or API usage)
 */
export function parseCSVText(csvText: string, fileName = 'program.csv'): ParseResult {
  const results = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.toLowerCase().trim(),
  });

  return processParseResults(results, fileName);
}

/**
 * Process Papa Parse results and validate data
 */
function processParseResults(
  results: Papa.ParseResult<CsvRow>,
  fileName: string
): ParseResult {
  const errors: ValidationError[] = [];

  // Check for parse errors
  if (results.errors.length > 0) {
    results.errors.forEach((error) => {
      errors.push({
        row: error.row || 0,
        column: 'file',
        message: error.message,
      });
    });
  }

  // Validate headers
  const headerErrors = validateHeaders(results.meta.fields || []);
  if (headerErrors.length > 0) {
    return {
      success: false,
      errors: headerErrors,
      fileName,
    };
  }

  // Detect optional columns
  const detectedColumns = detectOptionalColumns(results.meta.fields || []);

  // Validate mutual exclusivity of RIR and RPE at column level
  if (detectedColumns.hasRir && detectedColumns.hasRpe) {
    errors.push({
      row: 0,
      column: 'rir/rpe',
      message: 'CSV cannot have both RIR and RPE columns. Use one or the other.',
    });
    return {
      success: false,
      errors,
      fileName,
    };
  }

  // Parse and validate each row
  const parsedRows: ParsedCsvRow[] = [];

  results.data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because: 1-indexed and skipping header
    const { data, errors: rowErrors } = parseRow(row, rowNumber, detectedColumns);

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else if (data) {
      parsedRows.push(data);
    }
  });

  // If there are any validation errors, return them
  if (errors.length > 0) {
    return {
      success: false,
      errors,
      fileName,
    };
  }

  // Return success with parsed data
  return {
    success: true,
    data: parsedRows,
    detectedColumns,
    fileName,
  };
}

/**
 * Infer program name from filename
 * Examples:
 *   "my-program.csv" -> "My Program"
 *   "nsuns-531.csv" -> "Nsuns 531"
 *   "PHAT.csv" -> "PHAT"
 */
export function inferProgramName(fileName: string): string {
  // Remove .csv extension
  const nameWithoutExtension = fileName.replace(/\.csv$/i, '');

  // Replace hyphens, underscores with spaces
  const normalized = nameWithoutExtension.replace(/[-_]/g, ' ');

  // Capitalize first letter of each word
  const capitalized = normalized
    .split(' ')
    .map((word) => {
      // Keep acronyms (all caps) as-is
      if (word === word.toUpperCase() && word.length > 1) {
        return word;
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return capitalized.trim() || 'My Program';
}
