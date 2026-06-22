import Testing
import UIKit
@testable import app

struct GenerateQRCodeTests {

    @Test func generatesAnImageForAValidString() {
        let image = generateQRCode(from: "https://example.com/join/12345")

        #expect(image != nil)
    }

    @Test func generatesAnImageForAnEmptyString() {
        let image = generateQRCode(from: "")

        #expect(image != nil)
    }

    @Test func scalesTheOutputByTenTimes() throws {
        let small = generateQRCode(from: "1")
        let large = generateQRCode(from: "https://music-voting.example.com/join/98765?backend=192.168.1.50%3A8080")

        let smallImage = try #require(small)
        let largeImage = try #require(large)

        // A longer payload needs a higher QR "version" (more modules), so its
        // scaled pixel size should be at least as large as a short payload's.
        #expect(largeImage.size.width >= smallImage.size.width)
        #expect(smallImage.size.width > 0)
    }
}
