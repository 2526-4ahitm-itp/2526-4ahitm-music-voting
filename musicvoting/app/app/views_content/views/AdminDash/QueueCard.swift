//
//  QueueCard.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

struct QueueCard: View {

    let songs: [Song]
    var onDelete: (Song) -> Void = { _ in }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {

            Text("Warteschlange")
                .font(.title)
                .fontWeight(.bold)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.bottom, 4)

            if songs.isEmpty {
                Text("Keine Songs in der Warteschlange")
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 12)
            } else {
                ForEach(songs) { song in
                    SongRow(song: song, onDelete: { onDelete(song) })
                }
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
    QueueCard(songs: [])
}
