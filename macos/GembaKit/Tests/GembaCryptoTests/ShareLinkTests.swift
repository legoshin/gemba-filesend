import XCTest
@testable import GembaCrypto

final class ShareLinkTests: XCTestCase {
    private let origin = URL(string: "https://send.gemba.uk")!

    func testShareIDShapeMatchesServerRegex() {
        for _ in 0..<200 {
            let id = ShareID().value
            XCTAssertEqual(id.count, 16)
            XCTAssertTrue(id.range(of: "^[a-f0-9]{16}$", options: .regularExpression) != nil, id)
        }
        XCTAssertNil(ShareID("TOOSHORT"))
        XCTAssertNil(ShareID("ABCDEF0123456789"), "uppercase hex is rejected by /api/files/finalize")
        XCTAssertNotNil(ShareID("abcdef0123456789"))
    }

    func testLinkPutsTheKeyOnlyInTheFragment() throws {
        let key = ShareKey()
        let link = ShareLink(id: ShareID(), key: key, passwordProtected: false, origin: origin)
        let url = link.url
        XCTAssertEqual(url.path, "/download")
        XCTAssertEqual(url.fragment, key.base64URL)
        let query = url.query ?? ""
        XCTAssertFalse(query.contains(key.base64URL), "the key must never appear in the query string")
        XCTAssertFalse(query.contains("pw"))
    }

    func testPasswordFlagIsCarriedInTheQuery() {
        let link = ShareLink(id: ShareID(), key: ShareKey(), passwordProtected: true, origin: origin)
        XCTAssertTrue(link.absoluteString.contains("pw=1"))
    }

    func testUnencryptedShareHasNoFragment() {
        let link = ShareLink(id: ShareID(), key: nil, passwordProtected: false, origin: origin)
        XCTAssertNil(link.url.fragment)
        XCTAssertFalse(link.absoluteString.contains("#"))
    }

    func testParsesLinksInEitherDirection() throws {
        let key = ShareKey()
        let id = ShareID()
        let original = ShareLink(id: id, key: key, passwordProtected: true, origin: origin)
        let parsed = try XCTUnwrap(ShareLink(parsing: original.absoluteString))
        XCTAssertEqual(parsed.id, id)
        XCTAssertEqual(parsed.key, key)
        XCTAssertTrue(parsed.passwordProtected)
        XCTAssertEqual(parsed.absoluteString, original.absoluteString)
    }

    func testParsesALinkTheWebAppWouldEmit() throws {
        let raw = "https://send.gemba.uk/download?id=0123456789abcdef#AAECAwQFBgcICQoLDA0ODw"
        let parsed = try XCTUnwrap(ShareLink(parsing: raw))
        XCTAssertEqual(parsed.id.value, "0123456789abcdef")
        XCTAssertEqual(parsed.key?.base64URL, "AAECAwQFBgcICQoLDA0ODw")
        XCTAssertFalse(parsed.passwordProtected)
    }

    func testRejectsGarbage() {
        XCTAssertNil(ShareLink(parsing: "not a url"))
        XCTAssertNil(ShareLink(parsing: "https://send.gemba.uk/download?id=nope"))
    }
}
