// API Route: CSV Program Import

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCSVText, inferProgramName } from '@/lib/csv/parser';
import { structureProgram, importProgramToDatabase } from '@/lib/csv/import-to-db';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data with CSV file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Read file contents as text (server-side)
    const fileText = await file.text();

    // Parse CSV text
    const parseResult = parseCSVText(fileText, file.name);

    if (!parseResult.success || !parseResult.data || !parseResult.detectedColumns) {
      return NextResponse.json(
        {
          error: 'CSV validation failed',
          errors: parseResult.errors || [],
        },
        { status: 422 }
      );
    }

    // Infer program name from filename
    const programName = inferProgramName(file.name);

    // Structure the parsed data
    const structuredProgram = structureProgram(
      parseResult.data,
      programName,
      parseResult.detectedColumns
    );

    // Import to database
    const { programId } = await importProgramToDatabase(structuredProgram, user.id);

    // Return success with program details
    return NextResponse.json({
      success: true,
      programId,
      programName,
      totalWeeks: structuredProgram.metadata.totalWeeks,
      detectedColumns: parseResult.detectedColumns,
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      {
        error: 'Failed to import program',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
