//
//  Song.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import Foundation

struct Song: Identifiable, Equatable {
    let id: String
    let title: String
    let artist: String
    let imageUrl: String
    let uri: String?

    init(title: String, artist: String, imageUrl: String, uri: String? = nil) {
        self.id = "\(title):\(artist)"
        self.title = title
        self.artist = artist
        self.imageUrl = imageUrl
        self.uri = uri
    }
}
