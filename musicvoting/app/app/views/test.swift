import SwiftUI

struct MusicPlayerView: View {
    
    @State private var progress: Double = 0.13
    
    var body: some View {
        VStack(spacing: 24) {
            
            // Album Cover
            Image("album")
                .resizable()
                .aspectRatio(1, contentMode: .fit)
                .cornerRadius(12)
                .shadow(radius: 10)
                .padding(.top, 40)
            
            // Song Title
            Text("MY TURN")
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text("Lil Baby")
                .font(.subheadline)
                .foregroundColor(.gray)
            
            // Progress Bar
            VStack {
                Slider(value: $progress)
                    .accentColor(.white)
                
                HStack {
                    Text("0:13")
                    Spacer()
                    Text("2:46")
                }
                .font(.caption)
                .foregroundColor(.gray)
            }
            .padding(.horizontal)
            
            // Controls
            HStack(spacing: 50) {
                Button(action: {}) {
                    Image(systemName: "backward.fill")
                        .font(.title)
                }
                
                Button(action: {}) {
                    Image(systemName: "play.fill")
                        .font(.largeTitle)
                }
                
                Button(action: {}) {
                    Image(systemName: "forward.fill")
                        .font(.title)
                }
            }
            .foregroundColor(.white)
            .padding(.top, 10)
            
            Spacer()
        }
        .padding()
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color.black, Color.blue.opacity(0.6)]),
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .edgesIgnoringSafeArea(.all)
    }
}

#Preview {
    MusicPlayerView()
}
