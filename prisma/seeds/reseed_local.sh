#!/bin/bash

# Reseed Local Database Script
# This script clears and reseeds exercises in your local development database

set -e  # Exit on error

echo "=========================================="
echo "Reseed Local Database"
echo "=========================================="
echo ""
echo "WARNING: This will DELETE all programs and exercises from your local database!"
echo "Database: fitcsv_local"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo ""
echo "Step 1/9: Clearing existing data..."
psql -d fitcsv_local -f clear_local_database.sql

echo ""
echo "Step 2/9: Seeding legacy exercises (27 exercises)..."
psql -d fitcsv_local -f 00_legacy_exercises.sql

echo ""
echo "Step 3/9: Seeding bodyweight exercises (42 exercises)..."
psql -d fitcsv_local -f 01_bodyweight_exercises.sql

echo ""
echo "Step 4/9: Seeding dumbbell exercises (50 exercises)..."
psql -d fitcsv_local -f 02_dumbbell_exercises.sql

echo ""
echo "Step 5/9: Seeding resistance band exercises (32 exercises)..."
psql -d fitcsv_local -f 03_resistance_band_exercises.sql

echo ""
echo "Step 6/9: Seeding kettlebell exercises (27 exercises)..."
psql -d fitcsv_local -f 04_kettlebell_exercises.sql

echo ""
echo "Step 7/9: Seeding climbing exercises (21 exercises)..."
psql -d fitcsv_local -f 05_climbing_exercises.sql

echo ""
echo "Step 8/9: Seeding cable/machine exercises (34 exercises)..."
psql -d fitcsv_local -f 06_cable_machine_exercises.sql

echo ""
echo "Step 9/9: Seeding core/mobility exercises (24 exercises)..."
psql -d fitcsv_local -f 07_core_mobility_exercises.sql

echo ""
echo "=========================================="
echo "Verification"
echo "=========================================="
psql -d fitcsv_local -c "SELECT COUNT(*) as total_system_exercises FROM \"ExerciseDefinition\" WHERE \"isSystem\" = true;"
psql -d fitcsv_local -c "SELECT COUNT(*) as legacy_exercises FROM \"ExerciseDefinition\" WHERE \"isSystem\" = true AND id NOT LIKE 'ex_%' AND id NOT LIKE 'exdef_%';"

echo ""
echo "=========================================="
echo "Done!"
echo "Expected: 257 total exercises (27 legacy)"
echo "=========================================="
