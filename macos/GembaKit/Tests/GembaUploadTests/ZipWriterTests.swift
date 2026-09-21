import XCTest
@testable import GembaUpload

/// The zip writer replaced NSFileCoordinator's zipper because that one fails on
/// symlinks inside the sandbox. Every archive here is checked by three
/// independent readers — `unzip -t`, `ditto` (what a Mac uses to open it) and
/// Python's `zipfile` — so the format is right, not just readable by one tool.
final class ZipWriterTests: XCTestCase {
    private func tempDir() throws -> URL {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("gemba-zip-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: dir) }
        return dir
    }

    @discardableResult
    private func run(_ tool: String, _ args: [String]) throws -> (Int32, String) {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: tool)
        process.arguments = args
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        try process.run()
        let output = String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
        process.waitUntilExit()
        return (process.terminationStatus, output)
    }

    /// The shape of a real developer folder: relative links to files and to
    /// directories (`node_modules/.bin/jsesc`, `.build/release`), a link that
    /// points outside the folder, a dangling link, an executable, an empty file,
    /// an empty directory, a hidden file, and a decomposed non-ASCII name.
    private func makeDeveloperTree(in parent: URL) throws -> URL {
        let fm = FileManager.default
        let root = parent.appendingPathComponent("notebook", isDirectory: true)
        try fm.createDirectory(at: root.appendingPathComponent("node_modules/jsesc/bin"), withIntermediateDirectories: true)
        try fm.createDirectory(at: root.appendingPathComponent("node_modules/.bin"), withIntermediateDirectories: true)
        try fm.createDirectory(at: root.appendingPathComponent(".build/out/Products/Release"), withIntermediateDirectories: true)
        try fm.createDirectory(at: root.appendingPathComponent("empty"), withIntermediateDirectories: true)

        let script = root.appendingPathComponent("node_modules/jsesc/bin/jsesc")
        try Data("#!/usr/bin/env node\nconsole.log('hi')\n".utf8).write(to: script)
        try fm.setAttributes([.posixPermissions: 0o755], ofItemAtPath: script.path)
        try fm.createSymbolicLink(atPath: root.appendingPathComponent("node_modules/.bin/jsesc").path,
                                  withDestinationPath: "../jsesc/bin/jsesc")
        try Data("built".utf8).write(to: root.appendingPathComponent(".build/out/Products/Release/app"))
        try fm.createSymbolicLink(atPath: root.appendingPathComponent(".build/release").path,
                                  withDestinationPath: "out/Products/Release")
        try fm.createSymbolicLink(atPath: root.appendingPathComponent("hosts-link").path,
                                  withDestinationPath: "/etc/hosts")
        try fm.createSymbolicLink(atPath: root.appendingPathComponent("broken-link").path,
                                  withDestinationPath: "does/not/exist")
        try Data().write(to: root.appendingPathComponent("empty.txt"))
        try Data("secret=none".utf8).write(to: root.appendingPathComponent(".env.example"))
        // "résumé" spelled with combining accents, as some Mac tools write it.
        try Data("cv".utf8).write(to: root.appendingPathComponent("re\u{301}sume\u{301}.txt"))
        try Data((0..<300_000).map { UInt8($0 % 7) }).write(to: root.appendingPathComponent("compressible.bin"))
        var random = Data(count: 200_000)
        _ = random.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 200_000, $0.baseAddress!) }
        try random.write(to: root.appendingPathComponent("random.bin"))
        // Stored, not deflated: exercises the copy-through path with real content.
        try random.write(to: root.appendingPathComponent("photo.jpg"))
        return root
    }

    /// What the archive must contain, according to `find` — independent of the
    /// writer's own inventory, so a bug there can't hide itself.
    private func expectedNames(for source: URL) throws -> Set<String> {
        let (status, out) = try run("/usr/bin/find", [source.path, "-mindepth", "1"])
        XCTAssertEqual(status, 0, out)
        let root = source.lastPathComponent
        var names: Set<String> = [root + "/"]
        for line in out.split(separator: "\n") {
            let path = String(line)
            let relative = String(path.dropFirst(source.path.count + 1))
            var isDir: ObjCBool = false
            let isLink = (try? FileManager.default.destinationOfSymbolicLink(atPath: path)) != nil
            FileManager.default.fileExists(atPath: path, isDirectory: &isDir)
            let name = (root + "/" + relative).precomposedStringWithCanonicalMapping
            names.insert(isDir.boolValue && !isLink ? name + "/" : name)
        }
        return names
    }

    private func archivedNames(_ zip: URL) throws -> Set<String> {
        let (status, out) = try run("/usr/bin/python3", ["-c",
            "import sys, zipfile\nfor n in zipfile.ZipFile(sys.argv[1]).namelist(): print(n)", zip.path])
        XCTAssertEqual(status, 0, out)
        return Set(out.split(separator: "\n").map(String.init))
    }

    private func verifyWithAllReaders(zip: URL, source: URL, file: StaticString = #filePath, line: UInt = #line) throws {
        let want = try expectedNames(for: source)
        let got = try archivedNames(zip)
        XCTAssertEqual(got.subtracting(want), [], "unexpected entries", file: file, line: line)
        XCTAssertEqual(want.subtracting(got), [], "entries MISSING from the archive", file: file, line: line)

        let (unzipStatus, unzipOut) = try run("/usr/bin/unzip", ["-t", zip.path])
        XCTAssertEqual(unzipStatus, 0, "unzip -t rejected the archive:\n\(unzipOut)", file: file, line: line)
        XCTAssertTrue(unzipOut.contains("No errors detected"), unzipOut, file: file, line: line)

        let python = """
        import sys, zipfile
        z = zipfile.ZipFile(sys.argv[1])
        bad = z.testzip()
        print("BAD", bad) if bad else print("OK", len(z.namelist()))
        """
        let (pyStatus, pyOut) = try run("/usr/bin/python3", ["-c", python, zip.path])
        XCTAssertEqual(pyStatus, 0, pyOut, file: file, line: line)
        XCTAssertTrue(pyOut.hasPrefix("OK"), "python zipfile: \(pyOut)", file: file, line: line)

        // ditto: the round trip a recipient's Mac does.
        let out = zip.deletingLastPathComponent().appendingPathComponent("extracted-\(UUID().uuidString)")
        let (dittoStatus, dittoOut) = try run("/usr/bin/ditto", ["-x", "-k", zip.path, out.path])
        XCTAssertEqual(dittoStatus, 0, dittoOut, file: file, line: line)
        try compareTrees(source, out.appendingPathComponent(source.lastPathComponent), file: file, line: line)
    }

    /// Regular files byte-identical, links still links with the same target,
    /// directories (including empty ones) present, executable bit kept.
    private func compareTrees(_ a: URL, _ b: URL, file: StaticString, line: UInt) throws {
        let fm = FileManager.default
        let entries = try ZipWriter.inventory(of: a)
        XCTAssertFalse(entries.isEmpty, file: file, line: line)
        for entry in entries {
            // Compare against the NFC name the archive stores.
            let restored = b.appendingPathComponent(entry.relativePath)
            switch entry.kind {
            case .directory:
                var isDir: ObjCBool = false
                XCTAssertTrue(fm.fileExists(atPath: restored.path, isDirectory: &isDir) && isDir.boolValue,
                              "missing directory \(entry.relativePath)", file: file, line: line)
            case .symlink(let target):
                let got = try? fm.destinationOfSymbolicLink(atPath: restored.path)
                XCTAssertEqual(got, target, "\(entry.relativePath) should still be a link to \(target)", file: file, line: line)
            case .file:
                XCTAssertEqual(try? Data(contentsOf: restored), try? Data(contentsOf: entry.url),
                               "content differs: \(entry.relativePath)", file: file, line: line)
                let wantMode = ZipWriter.posixMode(entry.url)
                let gotMode = ZipWriter.posixMode(restored)
                XCTAssertEqual(gotMode.map { $0 & 0o111 }, wantMode.map { $0 & 0o111 },
                               "executable bit lost on \(entry.relativePath)", file: file, line: line)
            }
        }
    }

    func testDeveloperFolderWithSymlinksRoundTrips() throws {
        let work = try tempDir()
        let source = try makeDeveloperTree(in: work)
        let zip = work.appendingPathComponent("notebook.zip")
        try ZipWriter.archive(folder: source, to: zip)
        try verifyWithAllReaders(zip: zip, source: source)
    }

    /// The link to /etc/hosts must be stored as the path "/etc/hosts" — the
    /// writer never reads anything outside the folder it was given.
    func testLinksAreStoredNotFollowed() throws {
        let work = try tempDir()
        let source = try makeDeveloperTree(in: work)
        let zip = work.appendingPathComponent("n.zip")
        try ZipWriter.archive(folder: source, to: zip)
        let (_, listing) = try run("/usr/bin/zipinfo", [zip.path])
        let linkLines = listing.split(separator: "\n").filter { $0.hasPrefix("l") }
        XCTAssertEqual(linkLines.count, 4, "four symlinks, each stored as a link:\n\(listing)")
        let hosts = try Data(contentsOf: URL(fileURLWithPath: "/etc/hosts"))
        let archive = try Data(contentsOf: zip)
        XCTAssertNil(archive.range(of: hosts), "the contents of /etc/hosts must not be in the archive")
    }

    func testNamesAreStoredAsNFC() throws {
        let work = try tempDir()
        let source = try makeDeveloperTree(in: work)
        let zip = work.appendingPathComponent("n.zip")
        try ZipWriter.archive(folder: source, to: zip)
        let archive = try Data(contentsOf: zip)
        XCTAssertNotNil(archive.range(of: Data("r\u{e9}sum\u{e9}.txt".utf8)), "composed é expected")
        XCTAssertNil(archive.range(of: Data("re\u{301}sume\u{301}.txt".utf8)), "decomposed name leaked into the archive")
    }

    func testFolderArchiverUsesTheWriterAndReportsProgress() throws {
        let work = try tempDir()
        let source = try makeDeveloperTree(in: work)
        let out = work.appendingPathComponent("out", isDirectory: true)
        try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
        let sink = LockedValues()
        let zip = try FolderArchiver.archive(folder: source, into: out) { sink.append($0) }
        XCTAssertEqual(zip.lastPathComponent, "notebook.zip")
        XCTAssertEqual(sink.values.last ?? 0, 1, accuracy: 0.0001)
        XCTAssertTrue(sink.isMonotonic, "compression progress must only move forward")
        try verifyWithAllReaders(zip: zip, source: source)
    }

    /// ZIP64 paths, forced with small limits so the test doesn't write 4 GB:
    /// per-entry sizes, header offsets, and the entry count all overflowing.
    func testZip64StructuresAreValid() throws {
        let work = try tempDir()
        let source = try makeDeveloperTree(in: work)
        let zip = work.appendingPathComponent("z64.zip")
        let limits = ZipWriter.Limits(maxClassic32: 4096, maxClassicEntries: 3, zip64Margin: 0)
        try ZipWriter.archive(folder: source, to: zip, limits: limits, progress: nil)
        let archive = try Data(contentsOf: zip)
        XCTAssertNotNil(archive.range(of: Data([0x50, 0x4b, 0x06, 0x06])), "zip64 end-of-directory record expected")
        XCTAssertNotNil(archive.range(of: Data([0x50, 0x4b, 0x06, 0x07])), "zip64 locator expected")
        try verifyWithAllReaders(zip: zip, source: source)
    }

    /// Opt-in check against a real folder, entirely local — nothing is uploaded
    /// and the archive is deleted afterwards:
    ///   GEMBA_ZIP_TEST_FOLDER=~/dev/some-project swift test --filter testRealFolderIfProvided
    func testRealFolderIfProvided() throws {
        guard let path = ProcessInfo.processInfo.environment["GEMBA_ZIP_TEST_FOLDER"] else {
            throw XCTSkip("set GEMBA_ZIP_TEST_FOLDER to check a real folder")
        }
        let source = URL(fileURLWithPath: (path as NSString).expandingTildeInPath)
        let work = try tempDir()
        let zip = work.appendingPathComponent(source.lastPathComponent + ".zip")
        let started = Date()
        try ZipWriter.archive(folder: source, to: zip)
        let seconds = Date().timeIntervalSince(started)
        let size = (try FileManager.default.attributesOfItem(atPath: zip.path)[.size] as? NSNumber)?.intValue ?? 0
        print("REAL-FOLDER \(source.lastPathComponent): zipped in \(String(format: "%.1f", seconds))s → \(size / 1_048_576) MB")
        try verifyWithAllReaders(zip: zip, source: source)
    }

    func testEmptyFolder() throws {
        let work = try tempDir()
        let empty = work.appendingPathComponent("Nothing Here", isDirectory: true)
        try FileManager.default.createDirectory(at: empty, withIntermediateDirectories: true)
        let zip = work.appendingPathComponent("e.zip")
        try ZipWriter.archive(folder: empty, to: zip)
        let (status, out) = try run("/usr/bin/unzip", ["-t", zip.path])
        XCTAssertEqual(status, 0, out)
        XCTAssertGreaterThan(try Data(contentsOf: zip).count, 0, "the server rejects empty files")
    }
}

final class LockedValues: @unchecked Sendable {
    private let lock = NSLock()
    private var stored: [Double] = []
    func append(_ v: Double) { lock.lock(); stored.append(v); lock.unlock() }
    var values: [Double] { lock.lock(); defer { lock.unlock() }; return stored }
    var isMonotonic: Bool { let v = values; return zip(v, v.dropFirst()).allSatisfy { $0 <= $1 } }
}
