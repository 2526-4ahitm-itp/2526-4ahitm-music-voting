//
//  QueueCard.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

struct QueueCard: View {

    let songs: [Song] = [
        Song(title: "Songtitel", artist: "Künstler", imageUrl: "https://i.scdn.co/image/ab67616d0000b273a6ca20eceb5f6c7199b98ccb"),
        Song(title: "Songtitel", artist: "Künstler", imageUrl: "https://i.scdn.co/image/ab67616d0000b27342a04303e6eb1100df3ea036"),
        Song(title: "Songtitel", artist: "Künstler", imageUrl: "https://i.scdn.co/image/ab67616d0000b2735e10a5aca3763224e2050016"),
        Song(title: "Songtitel", artist: "Künstler", imageUrl: "https://i.scdn.co/image/ab67616d0000b273cf5ec3a531c72644f0d69b2e"),
        Song(title: "Songtitel", artist: "Künstler", imageUrl: "https://i.scdn.co/image/ab67616d0000b2730ebc17239b6b18ba88cfb8ca")
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {

            Text("Warteschlange")
                .font(.title)
                .fontWeight(.bold)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.bottom, 4)

            ForEach(songs) { song in
                SongRow(song: song)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 35)
                .stroke(Color.black, lineWidth: 3)
        )
        .padding()
    }
}

#Preview {
    QueueCard()
}
