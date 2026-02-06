  SELECT
    w.id,
    w.name,
    w."dayNumber",
    wk."weekNumber"
  FROM "Workout" w
  JOIN "Week" wk ON wk.id = w."weekId"
  WHERE wk."programId" = 'cml8wlgf60004vreyce38nhn6'
  ORDER BY wk."weekNumber", w."dayNumber";
  