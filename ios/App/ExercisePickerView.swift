// Search the bundled catalog by name or alias; each row shows the start and finish photos.

import RipitCore
import SwiftUI
import UIKit

struct ExercisePickerView: View {
    @Environment(WorkoutStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    let onPick: (String) -> Void

    init(query: String = "", onPick: @escaping (String) -> Void) {
        _query = State(initialValue: query)
        self.onPick = onPick
    }

    private var results: [CatalogExercise] {
        (try? store.catalog.search(query)) ?? []
    }

    var body: some View {
        List {
            ForEach(results) { ex in
                Button { onPick(ex.id) } label: { ExerciseRow(exercise: ex) }
                    .listRowBackground(Theme.card)
                    .listRowSeparatorTint(Theme.border)
            }
            if results.isEmpty {
                Text("No exercises match \"\(query)\".")
                    .foregroundStyle(Theme.mutedForeground)
                    .listRowBackground(Theme.card)
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(Theme.background)
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search exercises")
        .autocorrectionDisabled()
        .textInputAutocapitalization(.never)
        .navigationTitle("Add exercise")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }.frame(minHeight: Theme.touch)
            }
        }
    }
}

private struct ExerciseRow: View {
    let exercise: CatalogExercise

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 4) {
                if exercise.images.isEmpty {
                    ExercisePhoto(name: nil, size: CGSize(width: 124, height: 56))
                } else {
                    ForEach(exercise.images, id: \.self) { ExercisePhoto(name: $0, size: CGSize(width: 60, height: 56)) }
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(exercise.name).font(.headline).foregroundStyle(Theme.foreground)
                if let detail = [exercise.category, exercise.equipment.first].compactMap({ $0 }).joined(separator: " · ").nonEmpty {
                    Text(detail.replacingOccurrences(of: "_", with: " ").capitalized).font(.caption).foregroundStyle(Theme.mutedForeground)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(minHeight: 64)
        .contentShape(Rectangle())
    }
}

/// A bundled photo from ExerciseImages, or a placeholder when there is none. Photos decode off
/// the main thread, so scrolling the picker stays smooth.
struct ExercisePhoto: View {
    let name: String?
    let size: CGSize
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: size.width, height: size.height)
            } else {
                Theme.muted
                    .overlay {
                        if name == nil { Image(systemName: "dumbbell").foregroundStyle(Theme.mutedForeground) }
                    }
                    .accessibilityLabel(name == nil ? "No photo" : "Photo loading")
            }
        }
        .frame(width: size.width, height: size.height)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .task(id: name) {
            guard let name else { image = nil; return }
            image = PhotoCache.cached(name)
            if image == nil { image = await PhotoCache.load(name) }
        }
    }
}

enum PhotoCache {
    // NSCache is thread-safe.
    nonisolated(unsafe) private static let cache = NSCache<NSString, UIImage>()

    static func cached(_ name: String) -> UIImage? {
        cache.object(forKey: name as NSString)
    }

    /// Reads and downsamples a photo on a background thread.
    static func load(_ name: String) async -> UIImage? {
        await Task.detached(priority: .userInitiated) {
            guard let url = Bundle.main.url(forResource: name, withExtension: nil, subdirectory: "ExerciseImages"),
                  let image = UIImage(contentsOfFile: url.path)?.preparingThumbnail(of: CGSize(width: 180, height: 120))
            else { return nil }
            cache.setObject(image, forKey: name as NSString)
            return image
        }.value
    }
}

private extension String {
    var nonEmpty: String? { isEmpty ? nil : self }
}
