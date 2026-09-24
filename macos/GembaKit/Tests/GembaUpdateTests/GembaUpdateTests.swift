import XCTest
import CryptoKit
@testable import GembaUpdate

final class GembaUpdateTests: XCTestCase {
    private var work: URL!
    private let privateKey = Curve25519.Signing.PrivateKey()

    override func setUpWithError() throws {
        work = FileManager.default.temporaryDirectory.appendingPathComponent("gemba-update-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: work, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: work)
    }

    private var verifier: UpdateVerifier { try! UpdateVerifier(publicKey: privateKey.publicKey.rawRepresentation) }

    private func manifest(for file: URL, version: String = "1.1.0", build: Int = 2,
                          signWith key: Curve25519.Signing.PrivateKey? = nil, url: URL? = nil) throws -> UpdateManifest {
        let data = try Data(contentsOf: file)
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        let signature = try UpdateVerifier.sign(data, privateKey: (key ?? privateKey).rawRepresentation)
        return UpdateManifest(version: version, build: build, url: url ?? file, size: data.count,
                              sha256: digest, signature: signature, minimumSystemVersion: "14.0")
    }

    // MARK: Versions

    func testVersionOrdering() {
        let v = { (s: String, b: Int) in AppVersion(s, build: b)! }
        XCTAssertLessThan(v("1.0", 1), v("1.1", 1))
        XCTAssertLessThan(v("1.9", 5), v("1.10", 1))
        XCTAssertLessThan(v("1.1", 2), v("1.1", 3))
        XCTAssertEqual(v("1.1", 2), v("1.1.0", 2))
        XCTAssertLessThan(v("1.1.0", 9), v("2", 1))
        XCTAssertNil(AppVersion("1.x", build: 1))
        XCTAssertNil(AppVersion("", build: 1))
        XCTAssertNil(AppVersion("1..2", build: 1))
    }

    func testMinimumSystem() throws {
        let file = work.appendingPathComponent("a.zip")
        try Data("x".utf8).write(to: file)
        let m = try manifest(for: file)
        XCTAssertTrue(m.supports(system: OperatingSystemVersion(majorVersion: 14, minorVersion: 0, patchVersion: 0)))
        XCTAssertFalse(m.supports(system: OperatingSystemVersion(majorVersion: 13, minorVersion: 6, patchVersion: 0)))
    }

    // MARK: Verification

    func testVerifyAcceptsSignedFile() throws {
        let file = work.appendingPathComponent("a.zip")
        try Data(repeating: 7, count: 10_000).write(to: file)
        XCTAssertNoThrow(try verifier.verify(file: file, against: try manifest(for: file)))
    }

    func testVerifyRejectsOtherKey() throws {
        let file = work.appendingPathComponent("a.zip")
        try Data(repeating: 7, count: 100).write(to: file)
        let forged = try manifest(for: file, signWith: Curve25519.Signing.PrivateKey())
        XCTAssertThrowsError(try verifier.verify(file: file, against: forged)) {
            XCTAssertEqual($0 as? UpdateError, .badSignature)
        }
    }

    func testVerifyRejectsTamperedFileEvenWithMatchingChecksum() throws {
        let file = work.appendingPathComponent("a.zip")
        try Data(repeating: 7, count: 100).write(to: file)
        let original = try manifest(for: file)
        // An attacker replaces the file AND the checksum, but can't re-sign.
        try Data(repeating: 8, count: 100).write(to: file)
        let swapped = try manifest(for: file)
        let tampered = UpdateManifest(version: original.version, build: original.build, url: original.url,
                                      size: swapped.size, sha256: swapped.sha256, signature: original.signature)
        XCTAssertThrowsError(try verifier.verify(file: file, against: tampered)) {
            XCTAssertEqual($0 as? UpdateError, .badSignature)
        }
        XCTAssertThrowsError(try verifier.verify(file: file, against: original)) {
            XCTAssertEqual($0 as? UpdateError, .checksumMismatch)
        }
    }

    func testVerifyRejectsWrongSize() throws {
        let file = work.appendingPathComponent("a.zip")
        try Data(repeating: 7, count: 100).write(to: file)
        let m = try manifest(for: file)
        try Data(repeating: 7, count: 101).write(to: file)
        XCTAssertThrowsError(try verifier.verify(file: file, against: m)) {
            XCTAssertEqual($0 as? UpdateError, .sizeMismatch(expected: 100, actual: 101))
        }
    }

    func testMissingOrBadPublicKey() {
        XCTAssertThrowsError(try UpdateVerifier(publicKeyBase64: nil))
        XCTAssertThrowsError(try UpdateVerifier(publicKeyBase64: "bm90IGEga2V5"))
    }

    // MARK: Client

    func testClientFindsNewerReleaseAndDownloadsIt() async throws {
        let zip = work.appendingPathComponent("release.zip")
        try Data(repeating: 3, count: 4096).write(to: zip)
        let m = try manifest(for: zip)
        let manifestFile = work.appendingPathComponent("version.json")
        try JSONEncoder().encode(m).write(to: manifestFile)

        let client = UpdateClient(manifestURL: manifestFile, verifier: verifier)
        let newer = try await client.newerRelease(than: AppVersion("1.0", build: 1)!)
        XCTAssertEqual(newer, m)
        let same = try await client.newerRelease(than: AppVersion("1.1.0", build: 2)!)
        XCTAssertNil(same)
        let older = try await client.newerRelease(than: AppVersion("1.2", build: 1)!)
        XCTAssertNil(older)

        let downloaded = try await client.download(m, into: work.appendingPathComponent("dl"))
        XCTAssertEqual(try Data(contentsOf: downloaded), try Data(contentsOf: zip))
    }

    func testClientDeletesAForgedDownload() async throws {
        let zip = work.appendingPathComponent("release.zip")
        try Data(repeating: 3, count: 64).write(to: zip)
        let forged = try manifest(for: zip, signWith: Curve25519.Signing.PrivateKey())
        let client = UpdateClient(manifestURL: zip, verifier: verifier)
        let dir = work.appendingPathComponent("dl")
        do {
            _ = try await client.download(forged, into: dir)
            XCTFail("a forged update was accepted")
        } catch {
            XCTAssertEqual(error as? UpdateError, .badSignature)
        }
        XCTAssertEqual(try FileManager.default.contentsOfDirectory(atPath: dir.path), [])
    }

    func testInsecureURLsRefused() {
        XCTAssertFalse(UpdateClient.isAllowed(URL(string: "http://send.gemba.uk/x.zip")!))
        XCTAssertFalse(UpdateClient.isAllowed(URL(string: "ftp://send.gemba.uk/x.zip")!))
        XCTAssertTrue(UpdateClient.isAllowed(URL(string: "https://send.gemba.uk/x.zip")!))
        XCTAssertTrue(UpdateClient.isAllowed(URL(string: "http://localhost:8080/x.zip")!))
    }

    // MARK: Installer

    /// A minimal signed app bundle, zipped the way make-release.sh zips.
    private func makeApp(id: String = "uk.gemba.test.fake", version: String = "1.1.0", build: Int = 2,
                         marker: String = "new") throws -> (app: URL, zip: URL) {
        let root = work.appendingPathComponent("src-\(marker)")
        let app = root.appendingPathComponent("Gemba Filesend.app")
        let macOS = app.appendingPathComponent("Contents/MacOS")
        try FileManager.default.createDirectory(at: macOS, withIntermediateDirectories: true)
        let plist: [String: Any] = [
            "CFBundleIdentifier": id, "CFBundleExecutable": "Gemba Filesend", "CFBundlePackageType": "APPL",
            "CFBundleShortVersionString": version, "CFBundleVersion": String(build), "CFBundleName": "Gemba Filesend",
        ]
        try PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0)
            .write(to: app.appendingPathComponent("Contents/Info.plist"))
        try FileManager.default.copyItem(at: URL(fileURLWithPath: "/usr/bin/true"), to: macOS.appendingPathComponent("Gemba Filesend"))
        try FileManager.default.createDirectory(at: app.appendingPathComponent("Contents/Resources"), withIntermediateDirectories: true)
        try Data(marker.utf8).write(to: app.appendingPathComponent("Contents/Resources/marker.txt"))
        XCTAssertEqual(try UpdateInstaller.runStatus("/usr/bin/codesign", ["--force", "--sign", "-", app.path]), 0)
        let zip = work.appendingPathComponent("\(marker).zip")
        XCTAssertEqual(try UpdateInstaller.runStatus("/usr/bin/ditto", ["-c", "-k", "--keepParent", app.path, zip.path]), 0)
        return (app, zip)
    }

    func testPrepareAcceptsTheAnnouncedApp() throws {
        let (_, zip) = try makeApp()
        let prepared = try UpdateInstaller.prepare(zip: zip, manifest: try manifest(for: zip),
                                                   bundleIdentifier: "uk.gemba.test.fake", appName: "Gemba Filesend",
                                                   into: work.appendingPathComponent("stage"))
        XCTAssertEqual(prepared.version, AppVersion("1.1.0", build: 2))
    }

    func testPrepareRejectsWrongAppWrongVersionAndBrokenSignature() throws {
        let stage = work.appendingPathComponent("stage")
        let (_, otherZip) = try makeApp(id: "com.example.other", marker: "other")
        XCTAssertThrowsError(try UpdateInstaller.prepare(zip: otherZip, manifest: try manifest(for: otherZip),
                                                         bundleIdentifier: "uk.gemba.test.fake", appName: "Gemba Filesend", into: stage))

        let (_, zip) = try makeApp(marker: "v")
        XCTAssertThrowsError(try UpdateInstaller.prepare(zip: zip, manifest: try manifest(for: zip, version: "1.2.0"),
                                                         bundleIdentifier: "uk.gemba.test.fake", appName: "Gemba Filesend", into: stage))

        let (app, _) = try makeApp(marker: "tampered")
        try Data("changed after signing".utf8).write(to: app.appendingPathComponent("Contents/Resources/marker.txt"))
        let tamperedZip = work.appendingPathComponent("tampered2.zip")
        XCTAssertEqual(try UpdateInstaller.runStatus("/usr/bin/ditto", ["-c", "-k", "--keepParent", app.path, tamperedZip.path]), 0)
        XCTAssertThrowsError(try UpdateInstaller.prepare(zip: tamperedZip, manifest: try manifest(for: tamperedZip),
                                                         bundleIdentifier: "uk.gemba.test.fake", appName: "Gemba Filesend", into: stage)) {
            XCTAssertEqual($0 as? UpdateError, .badBundle("its code signature is broken"))
        }
    }

    func testPrepareRefusesAnotherTeamsSignature() throws {
        let (_, zip) = try makeApp(marker: "team")
        // The stand-in is ad-hoc signed, so it has no team: an installed copy
        // signed by a real team must refuse it.
        XCTAssertNil(UpdateInstaller.teamIdentifier(of: work.appendingPathComponent("src-team/Gemba Filesend.app")))
        XCTAssertThrowsError(try UpdateInstaller.prepare(zip: zip, manifest: try manifest(for: zip),
                                                         bundleIdentifier: "uk.gemba.test.fake", appName: "Gemba Filesend",
                                                         expectedTeam: "YP6Y428R36", into: work.appendingPathComponent("stage-team"))) {
            XCTAssertEqual($0 as? UpdateError, .badBundle("it is signed by no team, not YP6Y428R36"))
        }
        // …and with no team expected (a locally built copy), it is accepted.
        XCTAssertNoThrow(try UpdateInstaller.prepare(zip: zip, manifest: try manifest(for: zip),
                                                     bundleIdentifier: "uk.gemba.test.fake", appName: "Gemba Filesend",
                                                     into: work.appendingPathComponent("stage-team2")))
    }

    func testSwapScriptReplacesTheAppAfterItQuits() throws {
        let installed = work.appendingPathComponent("Applications/Gemba Filesend.app")
        try FileManager.default.createDirectory(at: installed.deletingLastPathComponent(), withIntermediateDirectories: true)
        let (old, _) = try makeApp(version: "1.0", build: 1, marker: "old")
        try FileManager.default.copyItem(at: old, to: installed)
        let (_, zip) = try makeApp(marker: "new")
        let prepared = try UpdateInstaller.prepare(zip: zip, manifest: try manifest(for: zip),
                                                   bundleIdentifier: "uk.gemba.test.fake", appName: "Gemba Filesend",
                                                   into: work.appendingPathComponent("stage"))

        // Stand in for the running app: a process that exits shortly.
        let running = Process()
        running.executableURL = URL(fileURLWithPath: "/bin/sleep")
        running.arguments = ["1"]
        try running.run()

        let script = work.appendingPathComponent("swap.sh")
        try UpdateInstaller.script.write(to: script, atomically: true, encoding: .utf8)
        let swap = Process()
        swap.executableURL = URL(fileURLWithPath: "/bin/bash")
        swap.arguments = [script.path, String(running.processIdentifier), prepared.app.path, installed.path, "0", "x", "501"]
        swap.environment = ["GEMBA_UPDATE_SKIP_REGISTER": "1", "TMPDIR": work.path + "/"]
        try swap.run()
        swap.waitUntilExit()

        XCTAssertEqual(swap.terminationStatus, 0)
        XCTAssertFalse(running.isRunning)
        XCTAssertEqual(try String(contentsOf: installed.appendingPathComponent("Contents/Resources/marker.txt"), encoding: .utf8), "new")
        let leftovers = try FileManager.default.contentsOfDirectory(atPath: installed.deletingLastPathComponent().path)
        XCTAssertEqual(leftovers, ["Gemba Filesend.app"])
    }
}
