// A start request that waits for the person to resume or discard the workout in progress
// (work item 170: the phone keeps one workout in progress, unlike the web's draft per workout).
// Slice 6 (work item 180) adds starting a saved workout and repeating a finished one.

import Foundation

struct PendingStart: Identifiable, Equatable {
    enum Kind: Equatable {
        /// A program workout's id.
        case program(String)
        /// A saved workout's id.
        case saved(String)
        /// A finished workout's (completion's) id.
        case repeatWorkout(String)
    }

    let id = UUID()
    let kind: Kind
    /// "Strength Block · W1 · Push", for the prompt.
    let name: String
}
