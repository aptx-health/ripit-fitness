"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneStrengthProgramData = cloneStrengthProgramData;
exports.cloneCardioProgramData = cloneCardioProgramData;
/**
 * Clones a strength program's weeks/workouts/exercises into the shell program.
 * Processes one week per transaction for resilience.
 */
async function cloneStrengthProgramData(prisma, job) {
    const { programId, userId, programData } = job;
    const totalWeeks = programData.weeks.length;
    for (let i = 0; i < programData.weeks.length; i++) {
        const week = programData.weeks[i];
        await prisma.program.update({
            where: { id: programId },
            data: { copyStatus: `cloning_week_${i + 1}_of_${totalWeeks}` },
        });
        await prisma.$transaction(async (tx) => {
            await tx.week.create({
                data: {
                    weekNumber: week.weekNumber,
                    programId,
                    userId,
                    workouts: {
                        create: (week.workouts || []).map((workout) => ({
                            name: workout.name,
                            dayNumber: workout.dayNumber,
                            userId,
                            exercises: {
                                create: workout.exercises.map((exercise) => ({
                                    name: exercise.name,
                                    exerciseDefinitionId: exercise.exerciseDefinitionId,
                                    order: exercise.order,
                                    exerciseGroup: exercise.exerciseGroup,
                                    userId,
                                    notes: exercise.notes,
                                    prescribedSets: {
                                        createMany: {
                                            data: (exercise.prescribedSets || []).map((set) => ({
                                                setNumber: set.setNumber,
                                                reps: set.reps,
                                                weight: set.weight,
                                                rpe: set.rpe,
                                                rir: set.rir,
                                                userId,
                                            })),
                                        },
                                    },
                                })),
                            },
                        })),
                    },
                },
            });
        }, { timeout: 30000 });
    }
    await prisma.program.update({
        where: { id: programId },
        data: { copyStatus: 'ready' },
    });
}
/**
 * Clones a cardio program's weeks/sessions into the shell program.
 * Processes one week per transaction for resilience.
 */
async function cloneCardioProgramData(prisma, job) {
    const { programId, userId, programData } = job;
    const totalWeeks = programData.weeks.length;
    for (let i = 0; i < programData.weeks.length; i++) {
        const week = programData.weeks[i];
        await prisma.cardioProgram.update({
            where: { id: programId },
            data: { copyStatus: `cloning_week_${i + 1}_of_${totalWeeks}` },
        });
        await prisma.$transaction(async (tx) => {
            await tx.cardioWeek.create({
                data: {
                    weekNumber: week.weekNumber,
                    cardioProgramId: programId,
                    userId,
                    sessions: {
                        create: (week.sessions || []).map((session) => ({
                            dayNumber: session.dayNumber,
                            name: session.name,
                            description: session.description,
                            targetDuration: session.targetDuration,
                            intensityZone: session.intensityZone,
                            equipment: session.equipment,
                            targetHRRange: session.targetHRRange,
                            targetPowerRange: session.targetPowerRange,
                            intervalStructure: session.intervalStructure,
                            notes: session.notes,
                            userId,
                        })),
                    },
                },
            });
        }, { timeout: 30000 });
    }
    await prisma.cardioProgram.update({
        where: { id: programId },
        data: { copyStatus: 'ready' },
    });
}
