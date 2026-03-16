-- Complete Exercise Seed Script
-- Run this in Supabase SQL Editor or via psql to seed all exercises
-- This script seeds all exercises in the correct order

-- IMPORTANT: Legacy exercises (00_legacy_exercises.sql) MUST be applied first
-- to preserve CUID IDs used in existing programs

-- ============================================================================
-- 00. LEGACY EXERCISES (27 exercises - CRITICAL)
-- ============================================================================
-- These exercises have CUID IDs and are used in existing programs
-- Copy contents of: 00_legacy_exercises.sql
-- Then continue with numbered files below...

-- ============================================================================
-- 01. BODYWEIGHT EXERCISES (42 exercises)
-- ============================================================================
-- Copy contents of: 01_bodyweight_exercises.sql

-- ============================================================================
-- 02. DUMBBELL EXERCISES (50 exercises)
-- ============================================================================
-- Copy contents of: 02_dumbbell_exercises.sql

-- ============================================================================
-- 03. RESISTANCE BAND EXERCISES (32 exercises)
-- ============================================================================
-- Copy contents of: 03_resistance_band_exercises.sql

-- ============================================================================
-- 04. KETTLEBELL EXERCISES (27 exercises)
-- ============================================================================
-- Copy contents of: 04_kettlebell_exercises.sql

-- ============================================================================
-- 05. PULL-UP BAR ADVANCED EXERCISES (7 exercises)
-- ============================================================================
-- Formerly climbing exercises — climbing-specific equipment removed
-- Copy contents of: 05_climbing_exercises.sql

-- ============================================================================
-- 06. CABLE, MACHINE, BARBELL, TRAP BAR, EZ BAR, TRX EXERCISES (62 exercises)
-- ============================================================================
-- Expanded: added gym-specific machines, barbell, trap bar, EZ bar, TRX
-- Copy contents of: 06_cable_machine_exercises.sql

-- ============================================================================
-- 07. CORE & MOBILITY EXERCISES (22 exercises)
-- ============================================================================
-- Removed: lacrosse ball, L-Sit (parallel bars)
-- Copy contents of: 07_core_mobility_exercises.sql

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Total count (should be 269)
SELECT COUNT(*) as total_exercises
FROM "ExerciseDefinition"
WHERE "isSystem" = true;

-- Breakdown by ID type
SELECT
  CASE
    WHEN id LIKE 'cmiz%' THEN 'Legacy (CUID)'
    WHEN id LIKE 'ex_bw_%' THEN 'Bodyweight'
    WHEN id LIKE 'ex_db_%' THEN 'Dumbbell'
    WHEN id LIKE 'ex_rb_%' THEN 'Resistance Band'
    WHEN id LIKE 'ex_kb_%' THEN 'Kettlebell'
    WHEN id LIKE 'ex_cl_%' THEN 'Pull-Up Bar Advanced'
    WHEN id LIKE 'ex_cm_%' THEN 'Cable/Machine/Barbell/TRX'
    WHEN id LIKE 'ex_mo_%' THEN 'Core/Mobility'
    WHEN id LIKE 'exdef_%' THEN 'Library (exdef)'
    ELSE 'Other'
  END as exercise_type,
  COUNT(*) as count
FROM "ExerciseDefinition"
WHERE "isSystem" = true
GROUP BY exercise_type
ORDER BY exercise_type;

-- Expected results:
-- Legacy (CUID): 27
-- Bodyweight: 42
-- Dumbbell: 50
-- Resistance Band: 32
-- Kettlebell: 27
-- Pull-Up Bar Advanced: 7
-- Cable/Machine/Barbell/TRX: 62
-- Core/Mobility: 22
-- Total: 269
