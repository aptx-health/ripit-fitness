'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ValidationError {
  row: number;
  column: string;
  message: string;
  value?: string;
}

interface UploadResult {
  success: boolean;
  programId?: string;
  programName?: string;
  totalWeeks?: number;
  error?: string;
  errors?: ValidationError[];
}

export function CsvUploader() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const router = useRouter();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setValidationErrors([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/programs/import', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResult = await response.json();

      if (response.ok && result.success && result.programId) {
        // Success - redirect to the new program
        router.push(`/programs/${result.programId}/weeks/1`);
        router.refresh();
      } else {
        // Validation or processing error
        if (result.errors && result.errors.length > 0) {
          setValidationErrors(result.errors);
          setError('CSV validation failed. Please fix the errors below and try again.');
        } else {
          setError(result.error || 'Failed to import program');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Import Program from CSV</h3>
          <p className="text-sm text-gray-600">
            Upload a CSV file containing your training program
          </p>
        </div>

        <div className="mt-4">
          <label
            htmlFor="csv-upload"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
              uploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            } text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500`}
          >
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={uploading}
              className="sr-only"
            />
            {uploading ? 'Importing...' : 'Choose CSV File'}
          </label>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Maximum file size: 10MB. See{' '}
          <a href="/docs/csv-spec" className="text-blue-600 hover:underline">
            CSV format guide
          </a>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-800">{error}</h4>

          {validationErrors.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-red-700">
              {validationErrors.slice(0, 10).map((err, index) => (
                <li key={index} className="font-mono">
                  {err.row > 0 && `Row ${err.row}: `}
                  {err.column && `[${err.column}] `}
                  {err.message}
                  {err.value && ` (value: "${err.value}")`}
                </li>
              ))}
              {validationErrors.length > 10 && (
                <li className="text-red-600">
                  ... and {validationErrors.length - 10} more errors
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
