//
//  Song.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import Foundation
import UIKit

/// In-memory image store shared for the lifetime of the app session.
/// Thread-safe via NSLock.
final class ImageCache: @unchecked Sendable {
    static let shared = ImageCache()
    private var cache: [URL: UIImage] = [:]
    private let lock = NSLock()
    private init() {}

    func image(for url: URL) -> UIImage? {
        lock.lock(); defer { lock.unlock() }
        return cache[url]
    }

    func store(_ image: UIImage, for url: URL) {
        lock.lock(); defer { lock.unlock() }
        cache[url] = image
    }
}

struct Song: Identifiable, Equatable {
    let id: String
    let title: String
    let artist: String
    let imageUrl: String
    let uri: String?

    init(title: String, artist: String, imageUrl: String, uri: String? = nil) {
        self.id = uri ?? "\(title):\(artist)"
        self.title = title
        self.artist = artist
        self.imageUrl = imageUrl
        self.uri = uri
    }
}
