//
//  Song.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import Foundation

struct Song: Identifiable {
    let id = UUID()
    let title: String
    let artist: String
    let imageUrl: String
}
