-- DESTRUCTIVE: drops the dead ExercisePerformanceLog table.
-- Zero production callers (data audit finding 4, discussion #905 decision 5).
-- e1RM/volume/avgRPE series will be computed inside the aggregates job (wave 2).
DROP TABLE IF EXISTS "ExercisePerformanceLog";
