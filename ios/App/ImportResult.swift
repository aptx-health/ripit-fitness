// What the person sees after picking a file to import.

import Foundation
import RipitCore

enum ImportResult: Identifiable {
    case imported(ImportSummary)
    case refused(String)

    var id: String { title + message }

    var title: String {
        switch self {
        case .imported: "Import finished"
        case .refused: "Couldn't import this file"
        }
    }

    var message: String {
        switch self {
        case .imported(let s):
            let parts = [
                Self.count(s.programs, "program"), Self.count(s.workouts, "workout"),
                Self.count(s.loggedSets, "logged set"), Self.count(s.savedWorkouts, "saved workout"),
                Self.count(s.customExercises, "custom exercise"),
            ]
            return "From the file: " + parts.joined(separator: ", ") + ". Anything already on this phone was kept, not duplicated."
        case .refused(let reason):
            return reason + " Nothing on this phone was changed."
        }
    }

    private static func count(_ n: Int, _ noun: String) -> String {
        "\(n) \(noun)\(n == 1 ? "" : "s")"
    }
}
