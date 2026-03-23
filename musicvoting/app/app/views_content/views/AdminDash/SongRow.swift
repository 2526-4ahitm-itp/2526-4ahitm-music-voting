//
//  SongRow.swift
//  app
//
//  Created by Sperrer Simone on 15.01.26.
//

import SwiftUI

struct SongRow: View {
    let song: Song

    var body: some View {
        HStack(spacing: 12) {
            
            AsyncImage(url: URL(string: song.imageUrl)) { phase in
                switch phase {
                case .empty:
                    ProgressView()

                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()

                case .failure:
                    ZStack {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))

                        Image(systemName: "music.note")
                            .foregroundColor(.gray)
                    }


                @unknown default:
                    EmptyView()
                }
            }
            .frame(width: 60, height: 60)
            .cornerRadius(6)
            .clipped()


        

            VStack(alignment: .leading, spacing: 4) {
                Text(song.title)
                    .font(.headline)

                Text(song.artist)
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            Spacer()

            Button {
                print("Song löschen")
            } label: {
                Image(systemName: "trash.fill")
                    .foregroundColor(.black)
            }
        }
        .padding(.vertical, 6)
    }
}
#Preview {
    SongRow(song: .init(title: "Test", artist: "Test", imageUrl: "https://i.scdn.co/image/ab67616d0000b273a6ca20eceb5f6c7199b98ccb"))
}
	
