import SwiftUI

@main
struct GembaFilesendApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var updater = Updater.shared

    var body: some Scene {
        WindowGroup("Gemba Filesend") {
            ContentView()
                .onAppear { updater.start() }
        }
        // The window hugs its content, so expanding a section makes the window
        // taller instead of introducing a scrollbar. ContentView keeps the
        // tallest possible state short by opening at most one section at a time.
        .windowResizability(.contentSize)
        .commands {
            CommandGroup(replacing: .newItem) {}
            CommandGroup(after: .appInfo) {
                Button("Check for Updates…") {
                    Task { await updater.check(manual: true) }
                }
                Toggle("Check for Updates Automatically", isOn: $updater.automatic)
            }
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    /// With automatic updates on and a newer version known, quitting hands
    /// over to the updater helper first — the next launch is the new version.
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        MainActor.assumeIsolated {
            let updater = Updater.shared
            guard updater.installsOnQuit else { return .terminateNow }
            updater.launchHelper(relaunch: false) { _ in
                NSApp.reply(toApplicationShouldTerminate: true)
            }
            return .terminateLater
        }
    }
}
