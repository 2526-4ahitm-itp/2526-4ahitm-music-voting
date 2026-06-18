import Testing
@testable import app

struct SongTests {

    @Test func idIsDerivedFromTitleAndArtist() {
        let song = Song(title: "Song Title", artist: "Some Artist", imageUrl: "https://example.com/a.png")

        #expect(song.id == "Song Title:Some Artist")
    }

    @Test func uriDefaultsToNil() {
        let song = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png")

        #expect(song.uri == nil)
    }

    @Test func uriIsStoredWhenProvided() {
        let song = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png", uri: "spotify:track:abc")

        #expect(song.uri == "spotify:track:abc")
    }

    @Test func songsWithSameFieldsAreEqual() {
        let a = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png", uri: "spotify:track:abc")
        let b = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png", uri: "spotify:track:abc")

        #expect(a == b)
    }

    @Test func songsWithDifferentImageUrlsAreNotEqual() {
        let a = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/a.png")
        let b = Song(title: "Title", artist: "Artist", imageUrl: "https://example.com/b.png")

        #expect(a != b)
    }
}
