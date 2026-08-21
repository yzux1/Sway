window.Player = {
    audio: new Audio(),
    queue: [],
    currentIndex: 0,
    isPlaying: false,
    isShuffle: false,
    isRepeat: true,

    init() {
        this.audio.preload = "auto";
        
        document.getElementById('btn-playpause').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('btn-next').addEventListener('click', () => this.next());
        document.getElementById('btn-prev').addEventListener('click', () => this.prev());
        
        const progressBar = document.getElementById('progress-bar');
        progressBar.addEventListener('input', (e) => {
            if (this.audio.duration) {
                this.audio.currentTime = (e.target.value / 100) * this.audio.duration;
            }
        });

        this.audio.addEventListener('timeupdate', () => {
            if (this.audio.duration) {
                progressBar.value = (this.audio.currentTime / this.audio.duration) * 100;
                document.getElementById('current-time').innerText = this.formatTime(this.audio.currentTime);
            }
        });

        this.audio.addEventListener('ended', () => {
            if (this.isRepeat && this.queue.length === 1) {
                this.audio.currentTime = 0;
                this.audio.play();
            } else {
                this.next();
            }
        });

        document.getElementById('btn-shuffle').addEventListener('click', () => {
            this.isShuffle = !this.isShuffle;
            document.getElementById('btn-shuffle').classList.toggle('active', this.isShuffle);
        });

        document.getElementById('btn-repeat').addEventListener('click', () => {
            this.isRepeat = !this.isRepeat;
            document.getElementById('btn-repeat').classList.toggle('active', this.isRepeat);
        });
        
        document.getElementById('btn-player-like').addEventListener('click', () => {
            const currentSong = this.queue[this.currentIndex];
            if (currentSong) {
                window.Storage.toggleLike(currentSong.id);
                this.updatePlayerLikeIcon();
            }
        });

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => { 
                window.focus();
                if (!this.isPlaying) this.togglePlayPause(); 
            });
            navigator.mediaSession.setActionHandler('pause', () => { 
                if (this.isPlaying) this.togglePlayPause(); 
            });
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        }
    },

    playSong(index, queue) {
        if (!queue || queue.length === 0) return;
        this.queue = queue;
        this.currentIndex = index;
        const song = this.queue[this.currentIndex];

        if (!song.audioUrl) return alert("Audio URL missing for this track.");

        this.audio.src = song.audioUrl;
        this.audio.play().then(() => {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
        }).catch(e => console.log("Playback error:", e));
        
        this.isPlaying = true;
        
        document.getElementById('main-player').classList.remove('hidden');
        document.getElementById('player-title').innerText = song.title;
        document.getElementById('player-artist').innerText = song.artist;
        document.getElementById('player-art').src = song.artBase64 || '';
        document.getElementById('duration').innerText = '-:-';
        
        this.audio.onloadedmetadata = () => {
            document.getElementById('duration').innerText = this.formatTime(this.audio.duration);
        };

        this.updatePlayPauseIcon();
        this.updatePlayerLikeIcon();

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist,
                album: 'Sway Music',
                artwork: [
                    { src: song.artBase64 || '', sizes: '512x512', type: 'image/png' }
                ]
            });
        }
    },

    togglePlayPause() {
        if (!this.audio.src) return;
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        } else {
            this.audio.play().then(() => {
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            }).catch(e => {});
            this.isPlaying = true;
        }
        this.updatePlayPauseIcon();
    },

    next() {
        if (this.queue.length === 0) return;
        if (this.isShuffle) {
            this.currentIndex = Math.floor(Math.random() * this.queue.length);
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.queue.length;
        }
        this.playSong(this.currentIndex, this.queue);
    },

    prev() {
        if (this.queue.length === 0) return;
        this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
        this.playSong(this.currentIndex, this.queue);
    },

    updatePlayPauseIcon() {
        const btn = document.getElementById('btn-playpause');
        btn.innerHTML = `<svg class="icon"><use href="${this.isPlaying ? '#icon-pause' : '#icon-play'}"></use></svg>`;
    },

    updatePlayerLikeIcon() {
        const currentSong = this.queue[this.currentIndex];
        const btn = document.getElementById('btn-player-like');
        if (!currentSong) return;
        const isLiked = window.Storage.isLiked(currentSong.id);
        btn.innerHTML = `<svg class="icon"><use href="${isLiked ? '#icon-heart-filled' : '#icon-heart-outline'}"></use></svg>`;
    },

    formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
};

window.Player.init();
