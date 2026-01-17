import { column, Schema, Table } from '@powersync/common';

// PowerSync schema matching Prisma models
// Maps PostgreSQL types to SQLite types for local storage

// STRENGTH TRAINING TABLES

const program = new Table(
  {
    id: column.text,
    name: column.text,
    description: column.text, // nullable
    userId: column.text,
    isActive: column.integer, // boolean → 0/1
    isArchived: column.integer, // boolean → 0/1
    archivedAt: column.text, // DateTime → ISO 8601, nullable
    programType: column.text,
    isUserCreated: column.integer, // boolean → 0/1
    createdAt: column.text, // DateTime → ISO 8601
    updatedAt: column.text, // DateTime → ISO 8601
  },
  {
    indexes: {
      userId_isActive: ['userId', 'isActive'],
      userId_only: ['userId'],
      userId_isUserCreated: ['userId', 'isUserCreated'],
      userId_isArchived: ['userId', 'isArchived'],
    },
  }
);

const week = new Table(
  {
    id: column.text,
    weekNumber: column.integer,
    programId: column.text,
    userId: column.text,
  },
  {
    indexes: {
      programId_idx: ['programId'],
      userId_idx: ['userId'],
    },
  }
);

const workout = new Table(
  {
    id: column.text,
    name: column.text,
    dayNumber: column.integer,
    weekId: column.text,
    userId: column.text,
  },
  {
    indexes: {
      weekId_idx: ['weekId'],
      userId_idx: ['userId'],
    },
  }
);

const exerciseDefinition = new Table(
  {
    id: column.text,
    name: column.text,
    normalizedName: column.text,
    aliases: column.text, // String[] → JSON array stored as TEXT
    category: column.text, // nullable
    primaryFAUs: column.text, // String[] → JSON array stored as TEXT
    secondaryFAUs: column.text, // String[] → JSON array stored as TEXT
    equipment: column.text, // String[] → JSON array stored as TEXT
    instructions: column.text, // nullable
    isSystem: column.integer, // boolean → 0/1
    createdBy: column.text, // nullable
    userId: column.text, // System exercises: 00000000-0000-0000-0000-000000000000, User exercises: actual userId
    createdAt: column.text, // DateTime → ISO 8601
    updatedAt: column.text, // DateTime → ISO 8601
  },
  {
    indexes: {
      normalizedName_idx: ['normalizedName'],
      isSystem_idx: ['isSystem'],
      createdBy_idx: ['createdBy'],
      userId_idx: ['userId'],
    },
  }
);

const exercise = new Table(
  {
    id: column.text,
    name: column.text,
    exerciseDefinitionId: column.text,
    order: column.integer,
    exerciseGroup: column.text, // nullable
    workoutId: column.text,
    userId: column.text,
    notes: column.text, // nullable
  },
  {
    indexes: {
      workoutId_idx: ['workoutId'],
      exerciseDefinitionId_idx: ['exerciseDefinitionId'],
      userId_idx: ['userId'],
    },
  }
);

const prescribedSet = new Table(
  {
    id: column.text,
    setNumber: column.integer,
    reps: column.text,
    weight: column.text, // nullable
    rpe: column.integer, // nullable
    rir: column.integer, // nullable
    exerciseId: column.text,
    userId: column.text,
  },
  {
    indexes: {
      exerciseId_idx: ['exerciseId'],
      userId_idx: ['userId'],
    },
  }
);

const workoutCompletion = new Table(
  {
    id: column.text,
    workoutId: column.text,
    userId: column.text,
    completedAt: column.text, // DateTime → ISO 8601
    status: column.text,
    notes: column.text, // nullable
  },
  {
    indexes: {
      workoutId_userId: ['workoutId', 'userId'],
      userId_completedAt: ['userId', 'completedAt'],
      userId_status_completedAt: ['userId', 'status', 'completedAt'],
    },
  }
);

const loggedSet = new Table(
  {
    id: column.text,
    setNumber: column.integer,
    reps: column.integer,
    weight: column.real, // Float → REAL
    weightUnit: column.text,
    rpe: column.integer, // nullable
    rir: column.integer, // nullable
    exerciseId: column.text,
    completionId: column.text,
    userId: column.text, // Denormalized from WorkoutCompletion for PowerSync
    createdAt: column.text, // DateTime → ISO 8601
  },
  {
    indexes: {
      exerciseId_idx: ['exerciseId'],
      completionId_idx: ['completionId'],
      userId_idx: ['userId'],
    },
  }
);

// CARDIO TRAINING TABLES

const cardioProgram = new Table(
  {
    id: column.text,
    name: column.text,
    description: column.text, // nullable
    userId: column.text,
    isActive: column.integer, // boolean → 0/1
    isArchived: column.integer, // boolean → 0/1
    archivedAt: column.text, // DateTime → ISO 8601, nullable
    isUserCreated: column.integer, // boolean → 0/1
    createdAt: column.text, // DateTime → ISO 8601
    updatedAt: column.text, // DateTime → ISO 8601
  },
  {
    indexes: {
      userId_isActive: ['userId', 'isActive'],
      userId_isArchived: ['userId', 'isArchived'],
    },
  }
);

const cardioWeek = new Table(
  {
    id: column.text,
    weekNumber: column.integer,
    cardioProgramId: column.text,
    userId: column.text,
  },
  {
    indexes: {
      cardioProgramId_idx: ['cardioProgramId'],
      userId_idx: ['userId'],
    },
  }
);

const prescribedCardioSession = new Table(
  {
    id: column.text,
    weekId: column.text,
    userId: column.text,
    dayNumber: column.integer,
    name: column.text,
    description: column.text, // nullable
    targetDuration: column.integer,
    intensityZone: column.text, // nullable
    equipment: column.text, // nullable
    targetHRRange: column.text, // nullable
    targetPowerRange: column.text, // nullable
    intervalStructure: column.text, // nullable
    notes: column.text, // nullable
    createdAt: column.text, // DateTime → ISO 8601
    updatedAt: column.text, // DateTime → ISO 8601
  },
  {
    indexes: {
      weekId_idx: ['weekId'],
      userId_idx: ['userId'],
    },
  }
);

const loggedCardioSession = new Table(
  {
    id: column.text,
    prescribedSessionId: column.text, // nullable
    userId: column.text,
    completedAt: column.text, // DateTime → ISO 8601
    status: column.text,
    name: column.text,
    equipment: column.text,
    duration: column.integer,
    avgHR: column.integer, // nullable
    peakHR: column.integer, // nullable
    avgPower: column.integer, // nullable
    peakPower: column.integer, // nullable
    distance: column.real, // Float → REAL, nullable
    elevationGain: column.integer, // nullable
    elevationLoss: column.integer, // nullable
    avgPace: column.text, // nullable
    cadence: column.integer, // nullable
    strokeRate: column.integer, // nullable
    strokeCount: column.integer, // nullable
    calories: column.integer, // nullable
    intensityZone: column.text, // nullable
    intervalStructure: column.text, // nullable
    notes: column.text, // nullable
  },
  {
    indexes: {
      prescribedSessionId_idx: ['prescribedSessionId'],
      userId_completedAt: ['userId', 'completedAt'],
      userId_status_completedAt: ['userId', 'status', 'completedAt'],
    },
  }
);

const userCardioMetricPreferences = new Table(
  {
    id: column.text,
    userId: column.text,
    equipment: column.text,
    customMetrics: column.text, // String[] → JSON array stored as TEXT
    createdAt: column.text, // DateTime → ISO 8601
    updatedAt: column.text, // DateTime → ISO 8601
  },
  {
    indexes: {
      userId_idx: ['userId'],
    },
  }
);

// Export complete schema
export const AppSchema = new Schema({
  Program: program,
  Week: week,
  Workout: workout,
  ExerciseDefinition: exerciseDefinition,
  Exercise: exercise,
  PrescribedSet: prescribedSet,
  WorkoutCompletion: workoutCompletion,
  LoggedSet: loggedSet,
  CardioProgram: cardioProgram,
  CardioWeek: cardioWeek,
  PrescribedCardioSession: prescribedCardioSession,
  LoggedCardioSession: loggedCardioSession,
  UserCardioMetricPreferences: userCardioMetricPreferences,
});

// Export individual tables for reference
export const tables = {
  program,
  week,
  workout,
  exerciseDefinition,
  exercise,
  prescribedSet,
  workoutCompletion,
  loggedSet,
  cardioProgram,
  cardioWeek,
  prescribedCardioSession,
  loggedCardioSession,
  userCardioMetricPreferences,
};
