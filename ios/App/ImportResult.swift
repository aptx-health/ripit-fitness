// What the person sees after picking a file to import.

import Foundation
import RipitCore

enum ImportResult: Identifiable {
    case imported(ImportReport)
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
        case .imported(let r):
            // What changed on the phone, e.g. "Added 12 workouts, 140 sets; updated 2; 3 already up to date."
            let added = [
                (r.addedPrograms, "program"), (r.addedWorkouts, "workout"), (r.addedSets, "set"),
                (r.addedSavedWorkouts, "saved workout"), (r.addedCustomExercises, "custom exercise"),
            ].filter { $0.0 > 0 }.map { Self.count($0.0, $0.1) }
            var parts = [added.isEmpty ? "Nothing new to add" : "Added " + added.joined(separator: ", ")]
            if r.updated > 0 { parts.append("updated \(r.updated)") }
            if r.removedSets > 0 { parts.append("removed \(Self.count(r.removedSets, "set"))") }
            if r.unchanged > 0 { parts.append("\(r.unchanged) already up to date") }
            return parts.joined(separator: "; ") + ". Workouts logged on this phone were kept."
        case .refused(let reason):
            return reason + " Nothing on this phone was changed."
        }
    }

    private static func count(_ n: Int, _ noun: String) -> String {
        "\(n) \(noun)\(n == 1 ? "" : "s")"
    }
}
