import { Component, OnInit } from '@angular/core';
import { Song } from './modules/song.module';
import { SongService } from './services/song.service';

declare var YT: any;

// Erweiterung für Window, damit Angular das API-Callback kennt
declare global {
    interface Window {
        onYouTubeIframeAPIReady: any;
    }
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
    title = 'showMusic';
    isPlaying = false;
    apiReady = false;

    actSong: Song = {
        videoUrl: '',
        duration: 0,
        songId: '',
        songName: '',
        thumbnail: '',
        artist: { idArtist: '', strArtist: '' },
    };

    songs: Song[] = [];
    player: any;

    constructor(private songService: SongService) {}

    ngOnInit(): void {
        // YouTube IFrame API laden
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);

        // Callback wenn API geladen ist
        window.onYouTubeIframeAPIReady = () => {
            console.log('YouTube API ready');
            this.apiReady = true;
        };

        // Playlist aktualisieren
        setInterval(() => {
            this.songService.getPlaylist().subscribe((result) => {
                this.songs = result;
            });
        }, 2000);
    }

    // Nächstes Lied abspielen
    playNextSong() {
        this.songService.getNextSong().subscribe((song) => {
            if (!song) {
                console.log('Playlist Ende');
                this.isPlaying = false;
                return;
            }

            this.actSong = song;

            const videoId = this.getVideoId(song.videoUrl);
            if (!videoId) {
                console.error('Kein VideoId extrahierbar!');
                return;
            }

            if (this.player) {
                this.player.loadVideoById(videoId);
            } else {
                this.initPlayer(videoId);
            }
        });
    }

    // Host initialisieren
    initPlayer(videoId: string) {
        if (!this.apiReady) {
            console.warn('YouTube API noch nicht bereit!');
            return;
        }

        this.player = new YT.Player('player', {
            height: '270',
            width: '480',
            videoId: videoId,
            events: {
                onStateChange: (event: any) => this.onPlayerStateChange(event),
            },
        });
    }

    // Wenn Video endet
    onPlayerStateChange(event: any) {
        if (event.data === YT.PlayerState.ENDED) {
            this.playNextSong();
        }
    }

    // Play / Pause
    playSong() {
        this.isPlaying = !this.isPlaying;

        if (this.isPlaying) {
            if (this.player) {
                this.player.playVideo();
            } else {
                this.playNextSong();
            }
        } else {
            if (this.player) this.player.pauseVideo();
        }
    }

    // Robuste Video-ID extraktion
    getVideoId(url: string): string | null {
        const patterns = [
            /v=([^&]+)/,               // watch URLs
            /youtu\.be\/([^?]+)/,      // short links
            /embed\/([^?]+)/           // embed URLs
        ];

        for (const p of patterns) {
            const match = url.match(p);
            if (match) return match[1];
        }

        return null;
    }
}
