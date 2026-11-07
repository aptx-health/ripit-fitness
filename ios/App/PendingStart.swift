// A start request that waits for the person to resume or discard the workout in progress
// (work item 170: the phone keeps one workout in progress, unlike the web's draft per workout).

import Foundation

struct PendingStart: Identifiable, Equatable {
    let id = UUID()
    let workoutId: String
    /// "Strength Block · W1 · Push", for the prompt.
    let name: String
}
