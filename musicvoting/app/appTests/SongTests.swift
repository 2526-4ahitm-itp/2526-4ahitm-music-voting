import Testing
@testable import app

struct SongTests {

    // MARK: - id

    @Test func idFallsBackToTitleArtistWithoutUri() {
        let song = Song(title: "Song Title", artist: "Some Artist", imageUrl: "https://example.com/a.png")

        #expect(song.id == "Song Title:Some Artist")
    }

    @Test func idUsesUriWhenProvided() {
        let song = Song(title: "Hello", artist: "Adele", imageUrl: "", uri: "spotify:track:abc123")

        #expect(song.id == "spotify:track:abc123")
    }

    // MARK: - uri

    @Test func uriDefaultsToNil() {
        let song = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png")

        #expect(song.uri == nil)
    }

    @Test func uriIsStoredWhenProvided() {
        let song = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png", uri: "spotify:track:abc")

        #expect(song.uri == "spotify:track:abc")
    }

    // MARK: - Equatable

    @Test func songsWithSameFieldsAreEqual() {
        let a = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png", uri: "spotify:track:abc")
        let b = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png", uri: "spotify:track:abc")

        #expect(a == b)
    }

    @Test func songsWithDifferentUrisAreNotEqual() {
        let a = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png", uri: "spotify:track:abc")
        let b = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png", uri: "spotify:track:xyz")

        #expect(a != b)
    }

    @Test func songsWithDifferentImageUrlsAreNotEqual() {
        let a = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png")
        let b = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/b.png")

        #expect(a != b)
    }
}
