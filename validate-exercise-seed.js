#!/usr/bin/env node

/**
 * Validation script for exercise-library-seed.sql
 * Checks for common issues before running in database
 */

const fs = require('fs');
const path = require('path');

const VALID_FAUS = [
  'chest', 'mid-back', 'lower-back', 'traps', 'front-delts', 'mid-delts',
  'rear-delts', 'lats', 'biceps', 'triceps', 'forearms', 'neck',
  'quads', 'adductors', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques'
];

function validateSQL(filePath) {
  console.log('🔍 Validating exercise-library-seed.sql...\n');

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let errors = [];
  let warnings = [];

  // Track unique values
  const ids = new Set();
  const normalizedNames = new Set();
  const exerciseNames = [];

  // Parse exercises by splitting on close paren + comma + newline
  const exercises = content.split('),\n\n--').slice(1); // Skip header before first exercise

  console.log(`📊 Found ${exercises.length} exercises\n`);

  exercises.forEach((exerciseBlock, idx) => {
    const lines = exerciseBlock.split('\n');

    // Extract exercise name from comment
    const commentLine = lines[0];
    const exerciseName = commentLine.replace(/^--\s*/, '').trim();

    // Find the ID
    const idMatch = exerciseBlock.match(/'(exdef_[^']+)'/);
    if (idMatch) {
      const id = idMatch[1];
      if (ids.has(id)) {
        errors.push(`Exercise "${exerciseName}": Duplicate ID "${id}"`);
      }
      ids.add(id);
    }

    // Find normalized name (second quoted string that's all lowercase/no spaces)
    const matches = exerciseBlock.match(/'([^']+)'/g);
    if (matches && matches.length >= 3) {
      const normalizedName = matches[2].replace(/'/g, '');
      if (normalizedNames.has(normalizedName)) {
        errors.push(`Exercise "${exerciseName}": Duplicate normalized name "${normalizedName}"`);
      }
      normalizedNames.add(normalizedName);
    }

    exerciseNames.push(exerciseName);

    // Check for invalid FAUs in primaryFAUs and secondaryFAUs
    const fauArrayMatches = exerciseBlock.match(/ARRAY\[([^\]]*)\]/g);
    if (fauArrayMatches) {
      fauArrayMatches.forEach((arrayStr, arrayIdx) => {
        // Skip first array (aliases), check FAU arrays
        if (arrayIdx >= 1 && arrayIdx <= 2) {
          const items = arrayStr.match(/'([^']+)'/g);
          if (items) {
            items.forEach(item => {
              const fau = item.replace(/'/g, '');
              if (!VALID_FAUS.includes(fau)) {
                // Check if this looks like a FAU (not equipment)
                const likelyFAU = fau.includes('delt') || fau.includes('back') ||
                                 ['chest', 'biceps', 'triceps', 'quads', 'hamstrings',
                                  'glutes', 'calves', 'abs', 'obliques', 'lats',
                                  'traps', 'neck', 'forearms', 'adductors'].includes(fau);

                if (likelyFAU) {
                  errors.push(`Exercise "${exerciseName}": Invalid FAU "${fau}"`);
                }
              }
            });
          }
        }
      });
    }
  });

  // Validate counts
  console.log('✅ Validation Results:\n');
  console.log(`   Total exercises: ${exercises.length}`);
  console.log(`   Unique IDs: ${ids.size}`);
  console.log(`   Unique normalized names: ${normalizedNames.size}\n`);

  // Check for ID patterns
  const idPrefixes = {
    chest: 0,
    back: 0,
    shoulders: 0,
    arms: 0,
    legs: 0,
    core: 0
  };

  for (const id of ids) {
    if (id.startsWith('exdef_chest_')) idPrefixes.chest++;
    else if (id.startsWith('exdef_back_')) idPrefixes.back++;
    else if (id.startsWith('exdef_shoulders_')) idPrefixes.shoulders++;
    else if (id.startsWith('exdef_arms_')) idPrefixes.arms++;
    else if (id.startsWith('exdef_legs_')) idPrefixes.legs++;
    else if (id.startsWith('exdef_core_')) idPrefixes.core++;
  }

  console.log('📋 Exercise Distribution by Category:');
  console.log(`   Chest: ${idPrefixes.chest}`);
  console.log(`   Back: ${idPrefixes.back}`);
  console.log(`   Shoulders: ${idPrefixes.shoulders}`);
  console.log(`   Arms: ${idPrefixes.arms}`);
  console.log(`   Legs: ${idPrefixes.legs}`);
  console.log(`   Core: ${idPrefixes.core}\n`);

  // Verify all FAUs are represented
  const fauCoverage = {};
  VALID_FAUS.forEach(fau => fauCoverage[fau] = 0);

  // Count FAU occurrences in exercises
  exercises.forEach(exercise => {
    VALID_FAUS.forEach(fau => {
      if (exercise.includes(`'${fau}'`)) {
        fauCoverage[fau]++;
      }
    });
  });

  console.log('🎯 FAU Coverage (exercises per FAU):');
  Object.entries(fauCoverage).forEach(([fau, count]) => {
    const status = count === 0 ? '❌' : '✅';
    console.log(`   ${status} ${fau}: ${count} exercises`);
  });
  console.log('');

  // Report errors
  if (errors.length > 0) {
    console.log(`❌ ERRORS (${errors.length}):\n`);
    errors.forEach(err => console.log(`   ${err}`));
    console.log('');
  }

  // Report warnings
  if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${warnings.length}):\n`);
    warnings.forEach(warn => console.log(`   ${warn}`));
    console.log('');
  }

  // Summary
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✨ No errors or warnings found! SQL file looks good.\n');
    return 0;
  } else if (errors.length === 0) {
    console.log('✅ No errors found. Review warnings if needed.\n');
    return 0;
  } else {
    console.log('❌ Errors found. Please fix before running in database.\n');
    return 1;
  }
}

// Run validation
const sqlFile = path.join(__dirname, 'prisma', 'exercise-library-seed.sql');
const exitCode = validateSQL(sqlFile);
process.exit(exitCode);
