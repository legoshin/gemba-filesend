import SwiftUI

@main
struct GembaFilesendApp: App {
    var body: some Scene {
        WindowGroup("Gemba Filesend") {
            ContentView()
        }
        // The window hugs its content, so expanding a section makes the window
        // taller instead of introducing a scrollbar. ContentView keeps the
        // tallest possible state short by opening at most one section at a time.
        .windowResizability(.contentSize)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}
