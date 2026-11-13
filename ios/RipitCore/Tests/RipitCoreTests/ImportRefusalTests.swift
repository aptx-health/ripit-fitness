// Scenario: "A bad or newer file is refused without changing anything" (features/ios-app/import.feature).
//
// API used: importExport(data:), ImportError and its `reason`, makeWorkout (slice 1).
// Each test starts from a database holding one finished workout and checks every import table is
// unchanged afterwards.

import Foundation
import Testing
@testable import RipitCore

@Suite("Refusing a bad or newer file")
struct ImportRefusalTests {
    /// Imports `data`, expects it refused with `expected`, and checks nothing changed.
    func expectRefused(_ data: Data, as expected: ImportError, sourceLocation: SourceLocation = #_sourceLocation) throws {
        let db = try TempDB().open()
        try db.makeWorkout(start: iso("2026-11-01T15:00:00.000Z"), finish: iso("2026-11-01T16:00:00.000Z"),
                           [(benchPressId, [(5, 135)])])
        let before = try db.snapshot()
        let error = #expect(throws: ImportError.self, sourceLocation: sourceLocation) { try db.importExport(data: data) }
        guard let error else { return }
        #expect(error == expected, sourceLocation: sourceLocation)
        #expect(try db.snapshot() == before, "the database changed", sourceLocation: sourceLocation)
    }

    @Test("Not ripit-export: a different format string is refused")
    func otherFormat() throws {
        try expectRefused(ExportFixture.replacing([(#""format": "ripit-export""#, #""format": "strong-export""#)]),
                          as: .notRipitExport)
    }

    @Test("Not ripit-export: JSON without a format key, or not an object, is refused")
    func noFormat() throws {
        try expectRefused(Data(#"{"version": 1, "programs": []}"#.utf8), as: .notRipitExport)
        try expectRefused(Data("[]".utf8), as: .notRipitExport)
    }

    @Test("Corrupt: a cut-off file and an empty file are refused")
    func corrupt() throws {
        let whole = try ExportFixture.data()
        try expectRefused(whole.prefix(whole.count / 2), as: .corrupt)
        try expectRefused(Data(), as: .corrupt)
    }

    @Test("Newer version: version 2 is refused by version, even when its body has a new shape")
    func version2() throws {
        try expectRefused(ExportFixture.replacing([(#""version": 1,"#, #""version": 2,"#)]), as: .unsupportedVersion(2))
        try expectRefused(Data(#"{"format": "ripit-export", "version": 2, "sessions": "moved"}"#.utf8),
                          as: .unsupportedVersion(2))
    }

    @Test("All or nothing: a bad row late in a v1 file leaves no earlier rows behind")
    func badRowRollsBack() throws {
        // The ad-hoc session's 2nd logged set comes after programs, weeks, exercises and other sets.
        try expectRefused(ExportFixture.replacing([(#""weight": 100,"#, #""weight": "heavy","#)]), as: .corrupt)
    }

    @Test("Plain reason: each kind of refusal has its own short sentence")
    func reasons() throws {
        let files = [Data(#"{"format": "other"}"#.utf8), Data(#"{"format": "ripit-export", "version": 2}"#.utf8), Data("{".utf8)]
        let reasons = try files.map { try refusal($0).reason }
        for r in reasons {
            #expect(!r.isEmpty && r.count <= 200, "\(r)")
            #expect(!r.contains("DecodingError") && !r.contains("Optional(") && !r.contains("keyNotFound"), "\(r)")
        }
        #expect(Set(reasons).count == 3)
    }

    /// The ImportError a fresh database throws for `data`. Any other error is rethrown.
    func refusal(_ data: Data) throws -> ImportError {
        do {
            try TempDB().open().importExport(data: data)
        } catch let e as ImportError {
            return e
        }
        Issue.record("the file was accepted")
        return .corrupt
    }
}
