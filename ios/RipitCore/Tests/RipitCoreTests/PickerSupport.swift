// Shared helpers for the slice 8 tests (work item 189, features/ios-app/picker-custom.feature).
//
// The oracle is Tests/Fixtures/picker/picker.json: what the web's own routes did over the bundled
// catalog plus four synthetic custom exercises (scripts/ios/picker.goldens.ts). Ids the web made
// are written "custom:<name>"; `PickerGolden.Customs` maps them to the ids the phone made.

import Foundation
import GRDB
@testable import RipitCore

enum PickerGolden {
    static let url = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("Fixtures/picker/picker.json")

    struct File: Decodable {
        let collation: String
        let choices: Choices
        let customs: [Draft]
        let searches: [Search]
        let creates: [Save]
        let duplicates: [Duplicate]
        let edits: [Save]
    }

    struct Choices: Decodable {
        struct Item: Decodable { let key: String; let label: String }
        let equipment: [Item]
        let muscles: [Item]
        let other: [String]
    }

    struct Draft: Decodable {
        let name: String
        let equipment: [String]
        let primaryFAUs: [String]
        let secondaryFAUs: [String]
        let instructions: String?

        var draft: CustomExerciseDraft {
            CustomExerciseDraft(name: name, equipment: equipment, primaryMuscles: primaryFAUs,
                                secondaryMuscles: secondaryFAUs, instructions: instructions)
        }
    }

    struct Search: Decodable {
        struct Row: Decodable { let id: String; let name: String }
        let label: String
        let query: String
        let fau: String?
        let equipment: String?
        let limit: Int
        let results: [Row]

        var search: ExerciseSearch { ExerciseSearch(query: query, muscle: fau, equipment: equipment, limit: limit) }
    }

    struct Stored: Decodable, Equatable {
        let name: String
        let normalizedName: String
        let equipment: [String]
        let primaryFAUs: [String]
        let secondaryFAUs: [String]
        let instructions: String?
        let isSystem: Bool
    }

    struct Problem: Decodable { let field: String; let message: String }

    /// A create (POST) or edit (PATCH) case. `target` is set for edits: a custom's name or "seed:<name or id>".
    struct Save: Decodable {
        let label: String
        let target: String?
        let draft: Draft
        let status: Int
        let stored: Stored?
        let details: [Problem]?
        let error: String?
        let existing: String?
    }

    struct Duplicate: Decodable {
        let label: String
        let name: String
        let exclude: String?
        let exists: Bool
        let existing: String?
    }

    static func load() throws -> File {
        try JSONDecoder().decode(File.self, from: Data(contentsOf: url))
    }

    /// A fresh database holding the catalog and the golden's custom exercises, made through the API.
    static func freshDatabase(_ file: File) throws -> (AppDatabase, Customs) {
        let db = try AppDatabase.inMemory()
        var ids: [String: String] = [:]
        for c in file.customs { ids[c.name] = try db.createCustomExercise(c.draft) }
        return (db, Customs(ids: ids))
    }

    struct Customs {
        var ids: [String: String]

        /// The phone's id for a golden id ("custom:<name>" or a seed id).
        func local(_ goldenId: String) -> String {
            goldenId.hasPrefix("custom:") ? ids[String(goldenId.dropFirst(7))] ?? goldenId : goldenId
        }

        /// The golden's id for a phone id.
        func golden(_ localId: String) -> String {
            ids.first { $0.value == localId }.map { "custom:\($0.key)" } ?? localId
        }
    }

    /// Seed ids by name, for edit targets written "seed:<name>".
    static func seedId(_ target: String) throws -> String {
        let name = String(target.dropFirst(5))
        return try Repo.seedExercises().first { $0.name == name }?.id ?? name
    }

    /// The stored row, in the golden's shape.
    static func stored(_ db: AppDatabase, _ id: String) throws -> Stored? {
        try db.read { d in
            guard let row = try Row.fetchOne(d, sql: """
                SELECT name, normalizedName, equipment, primaryFAUs, secondaryFAUs, instructions, isSystem
                FROM exerciseDefinition WHERE id = ?
                """, arguments: [id]) else { return nil }
            func list(_ column: String) throws -> [String] {
                try JSONDecoder().decode([String].self, from: Data((row[column] as String? ?? "[]").utf8))
            }
            return Stored(name: row["name"], normalizedName: row["normalizedName"], equipment: try list("equipment"),
                          primaryFAUs: try list("primaryFAUs"), secondaryFAUs: try list("secondaryFAUs"),
                          instructions: row["instructions"], isSystem: row["isSystem"])
        }
    }

    /// The web's answer as the phone's error, for a non-200 case.
    static func expectedError(_ c: Save, _ customs: Customs) -> CustomExerciseError? {
        switch c.status {
        case 422: .invalid((c.details ?? []).map { FieldProblem(field: $0.field, message: $0.message) })
        case 409: .duplicateName(existingId: customs.local(c.existing ?? ""))
        case 403: .builtIn
        default: nil
        }
    }
}

extension AppDatabase {
    /// Ids of every custom (non-system) exercise definition.
    func customIds() throws -> [String] {
        try read { try String.fetchAll($0, sql: "SELECT id FROM exerciseDefinition WHERE isSystem = 0 ORDER BY id") }
    }
}
