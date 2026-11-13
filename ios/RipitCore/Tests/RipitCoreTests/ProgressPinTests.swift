// Scenario: "Pinned lifts". Pins are the saved list, in order; the phone has no training profile,
// so with nothing saved there are none (the web would fall back to anchor lifts).
//
// API used:
// - pinnedLifts(), savePins(_:), pinLift(_:), unpinLift(_:), weeklyReport(...)
// - slice 2: importExport(data:)

import Foundation
import Testing
@testable import RipitCore

@Suite("Progress: pinned lifts")
struct ProgressPinTests {
    let squat = "cmiz7vjpo0001vr0msv9of7ib"
    let deadlift = "cmiz7vjvh0002vr0mtcmhiz70"
    let row = "cmiz7vk1i0003vr0mqucd1f52"

    @Test("Pins: none until a lift is pinned")
    func noneAtFirst() throws {
        #expect(try TempDB().open().pinnedLifts() == [])
    }

    @Test("Pins: pinning adds at the end, once, and stays pinned after relaunch")
    func pinAndRelaunch() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        try db.pinLift(squat)
        try db.pinLift(benchPressId)
        try db.pinLift(squat)
        #expect(try tmp.open().pinnedLifts() == [squat, benchPressId])
    }

    @Test("Pins: unpinning removes only that lift")
    func unpin() throws {
        let tmp = try TempDB()
        let db = try tmp.open()
        try db.savePins([squat, benchPressId, row])
        try db.unpinLift(benchPressId)
        #expect(try tmp.open().pinnedLifts() == [squat, row])
    }

    @Test("Pins: saving replaces the list and keeps its order")
    func saveReplaces() throws {
        let db = try TempDB().open()
        try db.savePins([squat, benchPressId])
        try db.savePins([row, squat])
        #expect(try db.pinnedLifts() == [row, squat])
        try db.savePins([])
        #expect(try db.pinnedLifts() == [])
    }

    @Test("Pins: a pinned lift shows on Progress with its latest numbers")
    func pinnedOnReport() throws {
        let db = try TempDB().open()
        // Last time: squat 225 x 5 on Monday 2 Nov; the shown week is the next one.
        try db.makeWorkout(start: Clock.at(2026, 11, 2, 18), finish: Clock.at(2026, 11, 2, 19), [(squat, [(5, 225), (3, 245)])])
        try db.pinLift(squat)
        try db.pinLift(deadlift)
        let report = try db.weeklyReport(weekStart: "2026-11-09", timeZone: Clock.tz, now: Clock.at(2026, 11, 10, 12), unit: .lbs, target: 3)
        try #require(report.pinned.count == 2)
        let s = report.pinned[0]
        #expect(s.exerciseDefinitionId == squat)
        #expect(s.name == "Barbell Back Squat")
        #expect(s.lift == nil)
        // Best set of the latest session: the higher e1RM, 245 x 3 (Epley 269.5) over 225 x 5 (262.5).
        let last = try #require(s.last)
        #expect(last.weight == 245 && last.reps == 3)
        #expect(abs((last.e1rm ?? 0) - 245 * (1 + 3.0 / 30)) < 1e-9)
        #expect(abs(last.completedAt.timeIntervalSince(Clock.at(2026, 11, 2, 19))) < 1)
        #expect(report.pinned[1] == PinnedLift(exerciseDefinitionId: deadlift, name: "Conventional Deadlift", lift: nil, last: nil))
    }

    @Test("Pins: a ripit-export file's pinned exercises are pinned on the phone, in order")
    func importedPins() throws {
        let tmp = try TempDB()
        try tmp.open().importExport(data: try ExportFixture.withCatalogIds())
        // The fixture pins Barbell Back Squat (position 0) and Conventional Deadlift (position 1).
        #expect(try tmp.open().pinnedLifts() == [squat, deadlift])
    }
}
