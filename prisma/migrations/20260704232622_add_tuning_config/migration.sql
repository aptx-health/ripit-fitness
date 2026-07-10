-- TuningConfig: singleton row of admin-editable learning-pipeline knobs (#937).
-- One row (id = 'singleton'); `values` holds the TuningConfig knob-set JSON.
CREATE TABLE "TuningConfig" (
    "id" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "TuningConfig_pkey" PRIMARY KEY ("id")
);
