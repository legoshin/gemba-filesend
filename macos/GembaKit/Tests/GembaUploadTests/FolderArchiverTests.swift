import XCTest
@testable import GembaUpload

final class FolderArchiverTests: XCTestCase {
    private func tempDir(_ label: String = "gemba-folder") throws -> URL {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("\(label)-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: dir) }
        return dir
    }

    /// A small tree with nesting, an empty subfolder, a hidden file and
    /// non-ASCII names — the things a naive archiver drops or mangles.
    private func makeTree(in parent: URL, named name: String = "Project Files") throws -> URL {
        let root = parent.appendingPathComponent(name, isDirectory: true)
        let fm = FileManager.default
        try fm.createDirectory(at: root.appendingPathComponent("docs/drafts"), withIntermediateDirectories: true)
        try fm.createDirectory(at: root.appendingPathComponent("empty"), withIntermediateDirectories: true)
        try Data("top level".utf8).write(to: root.appendingPathComponent("readme.txt"))
        try Data("nested".utf8).write(to: root.appendingPathComponent("docs/spec.md"))
        try Data((0..<50_000).map { UInt8($0 % 251) }).write(to: root.appendingPathComponent("docs/drafts/blob.bin"))
        try Data("café".utf8).write(to: root.appendingPathComponent("docs/résumé ✓.txt"))
        try Data("hidden".utf8).write(to: root.appendingPathComponent(".env.example"))
        return root
    }

    /// Unzips with the system's own tool — the recipient's side of the round trip.
    private func unzip(_ zip: URL, into dir: URL) throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/ditto")
        process.arguments = ["-x", "-k", zip.path, dir.path]
        try process.run()
        process.waitUntilExit()
        XCTAssertEqual(process.terminationStatus, 0, "ditto could not extract the archive")
    }

    private func relativeFiles(under root: URL) -> [String: Data] {
        var result: [String: Data] = [:]
        let enumerator = FileManager.default.enumerator(at: root, includingPropertiesForKeys: [.isRegularFileKey])
        while let url = enumerator?.nextObject() as? URL {
            guard (try? url.resourceValues(forKeys: [.isRegularFileKey]))?.isRegularFile == true else { continue }
            let relative = String(url.standardizedFileURL.path.dropFirst(root.standardizedFileURL.path.count + 1))
            result[relative] = try? Data(contentsOf: url)
        }
        return result
    }

    func testFolderRoundTripsThroughTheArchive() throws {
        let work = try tempDir()
        let source = try makeTree(in: work)
        let outDir = work.appendingPathComponent("out", isDirectory: true)
        try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

        let zip = try FolderArchiver.archive(folder: source, into: outDir)
        XCTAssertEqual(zip.lastPathComponent, "Project Files.zip")
        XCTAssertTrue(FileManager.default.fileExists(atPath: zip.path))
        XCTAssertEqual(zip.deletingLastPathComponent().standardizedFileURL, outDir.standardizedFileURL,
                       "the archive must land in the caller's directory, where the caller will delete it")

        let extracted = work.appendingPathComponent("extracted", isDirectory: true)
        try unzip(zip, into: extracted)
        // The archive keeps the folder itself as the top level, like Finder's Compress.
        let restoredRoot = extracted.appendingPathComponent("Project Files", isDirectory: true)
        XCTAssertEqual(relativeFiles(under: restoredRoot), relativeFiles(under: source),
                       "every file, name and byte must survive the zip")
    }

    func testRejectsAFile() throws {
        let work = try tempDir()
        let file = work.appendingPathComponent("plain.txt")
        try Data("x".utf8).write(to: file)
        XCTAssertThrowsError(try FolderArchiver.archive(folder: file, into: work))
    }

    func testShareItemDescribesAFolder() throws {
        let work = try tempDir()
        let source = try makeTree(in: work)
        let item = ShareItem(url: source)
        XCTAssertTrue(item.isFolder)
        XCTAssertEqual(item.displayName, "Project Files")
        XCTAssertEqual(item.name, "Project Files.zip", "the recipient receives a zip, and should be told so")
        XCTAssertEqual(item.contentType, "application/zip")
        XCTAssertEqual(item.fileCount, 5)
        XCTAssertEqual(item.size, 9 + 6 + 50_000 + 5 + 6, "uncompressed total of the files inside")
    }

    func testShareItemDescribesAFile() throws {
        let work = try tempDir()
        let file = work.appendingPathComponent("report.pdf")
        try Data(repeating: 1, count: 123).write(to: file)
        let item = ShareItem(url: file)
        XCTAssertFalse(item.isFolder)
        XCTAssertEqual(item.name, "report.pdf")
        XCTAssertEqual(item.size, 123)
    }

    /// Two different folders both called "Photos" must not overwrite each
    /// other's zip in the working directory.
    func testSameNamedFoldersDoNotCollide() async throws {
        let work = try tempDir()
        let a = try makeTree(in: work.appendingPathComponent("a", isDirectory: true), named: "Photos")
        let b = work.appendingPathComponent("b/Photos", isDirectory: true)
        try FileManager.default.createDirectory(at: b, withIntermediateDirectories: true)
        try Data("only in b".utf8).write(to: b.appendingPathComponent("b.txt"))

        let upload = try tempDir("gemba-workdir")
        let uploader = ShareUploader()
        let resolved = try await uploader.resolve(
            [ShareItem(url: a), ShareItem(url: b)], into: upload, onProgress: { _ in }
        )
        XCTAssertEqual(resolved.count, 2)
        XCTAssertNotEqual(resolved[0].source, resolved[1].source)
        XCTAssertEqual(resolved.map(\.name), ["Photos.zip", "Photos.zip"])
        XCTAssertTrue(resolved.allSatisfy(\.isTemporary))
        XCTAssertTrue(resolved.allSatisfy { $0.source.path.hasPrefix(upload.path) },
                      "temporary zips must live only in the uploader's working directory")
        XCTAssertNotEqual(try Data(contentsOf: resolved[0].source), try Data(contentsOf: resolved[1].source))
    }

    func testFilesPassThroughUnchanged() async throws {
        let work = try tempDir()
        let file = work.appendingPathComponent("note.txt")
        try Data("hello".utf8).write(to: file)
        let resolved = try await ShareUploader().resolve([ShareItem(url: file)], into: work, onProgress: { _ in })
        XCTAssertEqual(resolved.first?.source, file)
        XCTAssertEqual(resolved.first?.isTemporary, false, "never delete the user's own file")
    }
}
