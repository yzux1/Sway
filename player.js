window.Player = {
    audio: new Audio(),
    queue: [],
    currentIndex: 0,
    isPlaying: false,
    isShuffle: false,
    isRepeat: true,

    init() {
        this.audio.preload = "auto";
        
        // Compact Player Bar Click opens Expanded Player
        document.getElementById('main-player').addEventListener('click', (e) => {
            if(!e.target.closest('.icon-btn') && !e.target.closest('.artist-link')) {
                this.expandPlayer();
            }
        });

        document.getElementById('btn-player-expand').addEventListener('click', (e) => {
            e.stopPropagation();
            this.expandPlayer();
        });

        document.getElementById('btn-collapse-player').addEventListener('click', () => {
            document.getElementById('expanded-player').classList.add('hidden');
        });

        // Controls binding (both compact and expanded)
        const togglePlay = () => this.togglePlayPause();
        const nextTrack = () => this.next();
        const prevTrack = () => this.prev();

        document.getElementById('expanded-btn-playpause').addEventListener('click', togglePlay);
        document.getElementById('expanded-btn-next').addEventListener('click', nextTrack);
        document.getElementById('expanded-btn-prev').addEventListener('click', prevTrack);

        const progressBar = document.getElementById('progress-bar');
        const expandedProgressBar = document.getElementById('expanded-progress-bar');

        const seek = (e) => {
            if (this.audio.duration) {
                this.audio.currentTime = (e.target.value / 100) * this.audio.duration;
            }
        };
        progressBar.addEventListener('input', seek);
        expandedProgressBar.addEventListener('input', seek);

        this.audio.addEventListener('timeupdate', () => {
            if (this.audio.duration) {
                const pct = (this.audio.currentTime / this.audio.duration) * 100;
                progressBar.value = pct;
                expandedProgressBar.value = pct;
                const timeStr = this.formatTime(this.audio.currentTime);
                document.getElementById('expanded-current-time').innerText = timeStr;
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

        const toggleShuffleFn = () => {
            this.isShuffle = !this.isShuffle;
            document.getElementById('expanded-btn-shuffle').classList.toggle('active', this.isShuffle);
        };
        document.getElementById('expanded-btn-shuffle').addEventListener('click', toggleShuffleFn);

        const toggleRepeatFn = () => {
            this.isRepeat = !this.isRepeat;
            document.getElementById('expanded-btn-repeat').classList.toggle('active', this.isRepeat);
        };
        document.getElementById('expanded-btn-repeat').addEventListener('click', toggleRepeatFn);
        
        const likeFn = () => {
            const currentSong = this.queue[this.currentIndex];
            if (currentSong) {
                window.Storage.toggleLike(currentSong.id);
                this.updatePlayerLikeIcons();
            }
        };
        document.getElementById('btn-player-like').addEventListener('click', (e) => { e.stopPropagation(); likeFn(); });
        document.getElementById('btn-expanded-like').addEventListener('click', likeFn);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => { window.focus(); if (!this.isPlaying) this.togglePlayPause(); });
            navigator.mediaSession.setActionHandler('pause', () => { if (this.isPlaying) this.togglePlayPause(); });
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        }
    },

    expandPlayer() {
        document.getElementById('expanded-player').classList.remove('hidden');
    },

    playSong(index, queue) {
        if (!queue || queue.length === 0) return;
        this.queue = queue;
        this.currentIndex = index;
        const song = this.queue[this.currentIndex];

        if (!song.audioUrl) return alert("Audio URL missing for this track.");

        this.audio.src = song.audioUrl;
        this.audio.play().then(() => {
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }).catch(e => console.log("Playback error:", e));
        
        this.isPlaying = true;
        
        document.getElementById('main-player').classList.remove('hidden');
        document.getElementById('player-title').innerText = song.title;
        document.getElementById('player-artist').innerText = song.artist;
        document.getElementById('player-art').src = song.artBase64 || '';

        document.getElementById('expanded-title').innerText = song.title;
        document.getElementById('expanded-artist').innerText = song.artist;
        document.getElementById('expanded-art').src = song.artBase64 || '';
        document.getElementById('expanded-duration').innerText = '-:-';
        
        this.audio.onloadedmetadata = () => {
            document.getElementById('expanded-duration').innerText = this.formatTime(this.audio.duration);
        };

        this.updatePlayPauseIcon();
        this.updatePlayerLikeIcons();

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist,
                album: 'Sway Music',
                artwork: [{ src: song.artBase64 || '', sizes: '512x512', type: 'image/png' }]
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
        const btn = document.getElementById('expanded-btn-playpause');
        btn.innerHTML = `<svg class="icon" style="width:28px;height:28px;"><use href="${this.isPlaying ? '#icon-pause' : '#icon-play'}"></use></svg>`;
    },

    updatePlayerLikeIcons() {
        const currentSong = this.queue[this.currentIndex];
        if (!currentSong) return;
        const isLiked = window.Storage.isLiked(currentSong.id);
        const iconHref = isLiked ? '#icon-heart-filled' : '#icon-heart-outline';
        document.getElementById('btn-player-like').innerHTML = `<svg class="icon"><use href="${iconHref}"></use></svg>`;
        document.getElementById('btn-expanded-like').innerHTML = `<svg class="icon" style="width:24px;height:24px;"><use href="${iconHref}"></use></svg>`;
    },

    formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
};

window.Player.init();
