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
            Text("dashboard.queue.title")
                .font(.title2) // title2 wirkt oft harmonischer in Cards
                .fontWeight(.bold)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.bottom, 4)

            if songs.isEmpty {
                Text("dashboard.queue.empty")
                    .foregroundColor(.secondary) // Wirkt besser im Glass-Look
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
                .fill(.ultraThinMaterial) // Der Glas-Effekt
                .overlay(
                    RoundedRectangle(cornerRadius: 35)
                        .stroke(Color.primary.opacity(0.1), lineWidth: 0.5) // Hauchdünne Kontur
                )
        )
        .padding()
    }
}

#Preview {
    QueueCard(songs: [])
}
