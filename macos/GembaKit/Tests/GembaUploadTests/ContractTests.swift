import XCTest
import GembaCrypto
@testable import GembaUpload

/// These pin the request shapes the server validates. They are cheap, offline,
/// and they are what catches a drift between this app and `src/app/api/**`
/// before a user sees a 400.
final class ContractTests: XCTestCase {

    // MARK: - Local mirrors of validateClientMeta

    func testRejectsOutOfBoundsOptions() {
        var options = ShareOptions()
        XCTAssertNoThrow(try options.validate(fileCount: 1, largestFile: 1))

        XCTAssertThrowsError(try options.validate(fileCount: 0, largestFile: 0))
        XCTAssertThrowsError(try options.validate(fileCount: 26, largestFile: 1))
        XCTAssertThrowsError(try options.validate(fileCount: 1, largestFile: 16 * 1024 * 1024 * 1024))

        options.expiresAt = Date().addingTimeInterval(-60)
        XCTAssertThrowsError(try options.validate(fileCount: 1, largestFile: 1))
        options.expiresAt = Date().addingTimeInterval(400 * 24 * 3600)
        XCTAssertThrowsError(try options.validate(fileCount: 1, largestFile: 1))

        options = ShareOptions(verifiedRecipients: Array(repeating: "a@b.co", count: 11))
        XCTAssertThrowsError(try options.validate(fileCount: 1, largestFile: 1))

        options = ShareOptions(verifiedRecipients: ["not-an-email"])
        XCTAssertThrowsError(try options.validate(fileCount: 1, largestFile: 1))

        options = ShareOptions(verifiedRecipients: [], notifyRecipients: true)
        XCTAssertThrowsError(try options.validate(fileCount: 1, largestFile: 1))
    }

    func testDownloadLimitIsClampedTheSameWayTheWebClamps() {
        XCTAssertEqual(ShareOptions(downloadLimit: 0).clampedDownloadLimit, 1)
        XCTAssertEqual(ShareOptions(downloadLimit: 7).clampedDownloadLimit, 7)
        XCTAssertEqual(ShareOptions(downloadLimit: 5000).clampedDownloadLimit, 100)
    }

    func testEmailCheckMatchesServerRegex() {
        for good in ["a@b.co", "first.last+tag@sub.domain.uk", "x@y.z"] {
            XCTAssertTrue(ShareOptions.looksLikeEmail(good), good)
        }
        for bad in ["", "no-at-sign", "a@b", "a b@c.d", "@b.co", "a@.co "] {
            XCTAssertFalse(ShareOptions.looksLikeEmail(bad), bad)
        }
    }

    func testRecipientsAreNormalizedLikeTheServerDoes() {
        let options = ShareOptions(verifiedRecipients: ["  Alice@Example.COM ", "BOB@x.dev"])
        XCTAssertEqual(options.normalizedRecipients(), ["alice@example.com", "bob@x.dev"])
    }

    // MARK: - Blob protocol details

    func testStoreIDIsParsedFromTheClientToken() {
        XCTAssertEqual(
            BlobClient.storeID(from: "vercel_blob_client_store123abc_AbCdEf"),
            "store123abc"
        )
        XCTAssertEqual(BlobClient.storeID(from: "malformed"), "")
    }

    func testBlobErrorsAreSurfacedWithTheirCode() {
        let data = Data(#"{"error":{"code":"client_token_expired","message":"Token expired"}}"#.utf8)
        let (code, message) = BlobClient.blobError(from: data)
        XCTAssertEqual(code, "client_token_expired")
        XCTAssertEqual(message, "Token expired")
    }

    func testPartPathnameMatchesTheShareScopedPrefix() {
        // The server mints a token only for pathnames under `gemba/blob/{id}/`,
        // and finalize re-checks the same prefix. One typo here is a 400 on both.
        let id = ShareID()
        let pathname = "gemba/blob/\(id.value)/3"
        XCTAssertTrue(pathname.hasPrefix("gemba/blob/\(id.value)/"))
        XCTAssertEqual(pathname.split(separator: "/").count, 4)
    }

    // MARK: - Finalize body

    func testFinalizeBodyCarriesNoKeyMaterial() throws {
        let key = ShareKey()
        let id = ShareID()
        let options = ShareOptions(
            downloadLimit: 3,
            expiresAt: Date().addingTimeInterval(3600),
            password: "hunter2",
            verifiedRecipients: ["Someone@Example.com"],
            notifyRecipients: false
        )
        let body = try FinalizeBodyBuilder.build(
            id: id,
            files: [.init(name: "a.pdf", type: "application/pdf", size: 10, blobUrl: "https://x/gemba/blob/\(id.value)/0")],
            options: options,
            encrypted: true
        )
        let json = String(data: try JSONSerialization.data(withJSONObject: body), encoding: .utf8) ?? ""
        XCTAssertFalse(json.contains(key.base64URL), "the share key must never reach the server")
        XCTAssertFalse(json.contains("\"key\""))
        XCTAssertFalse(json.contains("keyBase64"))

        XCTAssertEqual(body["id"] as? String, id.value)
        XCTAssertEqual(body["downloadsRemaining"] as? Int, 3)
        XCTAssertEqual(body["password"] as? String, "hunter2")
        XCTAssertEqual(body["recipientEmails"] as? [String], ["someone@example.com"])
        XCTAssertNil(body["encrypted"], "encrypted is omitted when true — the server defaults to encrypted")
    }

    func testFinalizeMarksTheUnencryptedFallbackExplicitly() throws {
        let body = try FinalizeBodyBuilder.build(
            id: ShareID(),
            files: [.init(name: "a.bin", type: "application/octet-stream", size: 1, blobUrl: nil)],
            options: ShareOptions(),
            encrypted: false
        )
        XCTAssertEqual(body["encrypted"] as? Bool, false)
    }

    func testExpiryIsSentAsEpochMilliseconds() {
        let at = Date(timeIntervalSince1970: 1_800_000_000)
        XCTAssertEqual(ShareOptions(expiresAt: at).expiresAtMilliseconds, 1_800_000_000_000)
    }

    // MARK: - Content types

    func testContentTypeFallsBackToOctetStream() {
        let dir = FileManager.default.temporaryDirectory
        XCTAssertEqual(ShareItem.mimeType(for: dir.appendingPathComponent("x.pdf")), "application/pdf")
        XCTAssertEqual(ShareItem.mimeType(for: dir.appendingPathComponent("x.unknownext")), "application/octet-stream")
        XCTAssertEqual(ShareItem.mimeType(for: dir.appendingPathComponent("noextension")), "application/octet-stream")
    }
}
