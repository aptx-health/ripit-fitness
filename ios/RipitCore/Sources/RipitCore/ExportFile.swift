// The ripit-export v1 file as Swift types (docs/RIPIT_EXPORT_FORMAT.md on feature/data-export).
// Only the fields the phone stores are decoded; unknown keys are ignored, as v1 readers must.
// settings, balanceSettings and pinnedExercises have no local tables yet and are skipped.

import Foundation

struct ExportFile: Decodable {
    let exportedAt: Date
    let customExercises: [ExerciseDefinition]
    let exerciseRefs: [ExerciseRef]
    let programs: [Program]
    let workoutCompletions: [WorkoutCompletion]
    let savedWorkouts: [SavedWorkout]

    /// Checks format and version first, so a newer file is refused by version even if its body changed.
    static func decode(_ data: Data) throws -> ExportFile {
        guard let top = try? JSONSerialization.jsonObject(with: data) else { throw ImportError.corrupt }
        guard let fields = top as? [String: Any], fields["format"] as? String == "ripit-export" else {
            throw ImportError.notRipitExport
        }
        guard let version = fields["version"] as? Int else { throw ImportError.corrupt }
        guard version == 1 else { throw ImportError.unsupportedVersion(version) }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let text = try container.decode(String.self)
            guard let date = parseISODate(text) else {
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "not an ISO 8601 date")
            }
            return date
        }
        do {
            return try decoder.decode(ExportFile.self, from: data)
        } catch {
            throw ImportError.corrupt
        }
    }

    struct ExerciseDefinition: Decodable {
        let id: String
        let name: String
        let aliases: [String]
        let category: String?
        let createdBy: String?
        let createdAt: Date
        let updatedAt: Date
        let equipment: [String]
        let instructions: String?
        let notes: String?
        let imageUrls: [String]
        let primaryFAUs: [String]
        let secondaryFAUs: [String]
        let force: String?
        let mechanic: String?
        let level: String?
        let movementPattern: String?
        let intensityClass: String?
        let isBodyweight: Bool
        let taggedAt: Date?
        let taggedBy: String?
    }

    struct ExerciseRef: Decodable {
        let id: String
        let name: String
    }

    struct Program: Decodable {
        let id: String
        let name: String
        let description: String?
        let isActive: Bool
        let createdAt: Date
        let updatedAt: Date
        let isUserCreated: Bool
        let programType: String
        let isArchived: Bool
        let archivedAt: Date?
        let deletedAt: Date?
        let goals: [String]
        let level: String?
        let durationWeeks: Int?
        let durationDisplay: String?
        let targetDaysPerWeek: Int?
        let equipmentNeeded: [String]
        let focusAreas: [String]
        let sourceCommunityProgramId: String?
        let weeks: [Week]
    }

    struct Week: Decodable {
        let id: String
        let weekNumber: Int
        let name: String?
        let description: String?
        let workouts: [Workout]
    }

    struct Workout: Decodable {
        let id: String
        let name: String
        let dayNumber: Int
        let exercises: [Exercise]
    }

    struct Exercise: Decodable {
        let id: String
        let name: String
        let exerciseDefinitionId: String
        let order: Int
        let exerciseGroup: String?
        let workoutId: String?
        let notes: String?
        let isOneOff: Bool
        let workoutCompletionId: String?
        let prescribedSets: [PrescribedSet]
    }

    struct PrescribedSet: Decodable {
        let id: String
        let setNumber: Int
        let reps: String
        let weight: String?
        let rpe: Int?
        let rir: Int?
        let isWarmup: Bool
    }

    struct WorkoutCompletion: Decodable {
        let id: String
        let workoutId: String?
        let savedWorkoutId: String?
        let completedAt: Date?
        let startedAt: Date?
        let status: String
        let notes: String?
        let isArchived: Bool
        let cycleNumber: Int
        let isAdHoc: Bool
        let name: String?
        let durationSeconds: Int?
        let sessionRpe: Int?
        let exercises: [Exercise]
        let loggedSets: [LoggedSet]
    }

    struct LoggedSet: Decodable {
        let id: String
        let setNumber: Int
        let reps: Int
        let weight: Double
        let weightUnit: String
        let rpe: Int?
        let rir: Int?
        let isWarmup: Bool
        let exerciseId: String
        let createdAt: Date
    }

    struct SavedWorkout: Decodable {
        let id: String
        let name: String
        let notes: String?
        let sourceCompletionId: String?
        let workoutData: JSONValue
        let exerciseCount: Int
        let createdAt: Date
        let updatedAt: Date
        let lastUsedAt: Date?
        let pinnedAt: Date?
        let origin: String
        let archivedAt: Date?
        let dismissedAt: Date?
    }
}

/// `2026-11-07T18:04:05.123Z`, with or without the fraction.
func parseISODate(_ text: String) -> Date? {
    let withFraction = ISO8601DateFormatter()
    withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = withFraction.date(from: text) { return date }
    return ISO8601DateFormatter().date(from: text)
}

/// Any JSON value, for stored snapshots (`SavedWorkout.workoutData`) kept as JSON text.
enum JSONValue: Codable, Equatable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let b = try? c.decode(Bool.self) { self = .bool(b) }
        else if let n = try? c.decode(Double.self) { self = .number(n) }
        else if let s = try? c.decode(String.self) { self = .string(s) }
        else if let a = try? c.decode([JSONValue].self) { self = .array(a) }
        else { self = .object(try c.decode([String: JSONValue].self)) }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .null: try c.encodeNil()
        case .bool(let b): try c.encode(b)
        case .number(let n):
            // Whole numbers go back out as integers ("order": 1, not 1.0).
            if n.rounded() == n, abs(n) < 1e15 { try c.encode(Int64(n)) } else { try c.encode(n) }
        case .string(let s): try c.encode(s)
        case .array(let a): try c.encode(a)
        case .object(let o): try c.encode(o)
        }
    }
}
