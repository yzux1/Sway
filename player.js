window.Player = {
    audio: new Audio(),
    queue: [],
    currentIndex: 0,
    isPlaying: false,
    isShuffle: false,
    isRepeat: true,

    init() {
        this.audio.preload = "auto";
        
        // Setup main player & widget controllers
        const handlePlayPause = () => this.togglePlayPause();
        const handleNext = () => this.next();
        const handlePrev = () => this.prev();

        document.getElementById('btn-playpause').addEventListener('click', handlePlayPause);
        document.getElementById('widget-btn-playpause').addEventListener('click', handlePlayPause);
        
        document.getElementById('btn-next').addEventListener('click', handleNext);
        document.getElementById('widget-btn-next').addEventListener('click', handleNext);
        
        document.getElementById('btn-prev').addEventListener('click', handlePrev);
        document.getElementById('widget-btn-prev').addEventListener('click', handlePrev);
        
        const progressBar = document.getElementById('progress-bar');
        const widgetProgressBar = document.getElementById('widget-progress-bar');

        const seekAudio = (e) => {
            if (this.audio.duration) {
                this.audio.currentTime = (e.target.value / 100) * this.audio.duration;
            }
        };
        progressBar.addEventListener('input', seekAudio);
        widgetProgressBar.addEventListener('input', seekAudio);

        this.audio.addEventListener('timeupdate', () => {
            if (this.audio.duration) {
                const percent = (this.audio.currentTime / this.audio.duration) * 100;
                progressBar.value = percent;
                widgetProgressBar.value = percent;
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

        const toggleShuffle = () => {
            this.isShuffle = !this.isShuffle;
            document.getElementById('btn-shuffle').classList.toggle('active', this.isShuffle);
            document.getElementById('widget-btn-shuffle').classList.toggle('active', this.isShuffle);
        };
        document.getElementById('btn-shuffle').addEventListener('click', toggleShuffle);
        document.getElementById('widget-btn-shuffle').addEventListener('click', toggleShuffle);

        const toggleRepeat = () => {
            this.isRepeat = !this.isRepeat;
            document.getElementById('btn-repeat').classList.toggle('active', this.isRepeat);
            document.getElementById('widget-btn-repeat').classList.toggle('active', this.isRepeat);
        };
        document.getElementById('btn-repeat').addEventListener('click', toggleRepeat);
        document.getElementById('widget-btn-repeat').addEventListener('click', toggleRepeat);
        
        const toggleLikeCurrent = () => {
            const currentSong = this.queue[this.currentIndex];
            if (currentSong) {
                window.Storage.toggleLike(currentSong.id);
                this.updatePlayerLikeIcon();
            }
        };
        document.getElementById('btn-player-like').addEventListener('click', toggleLikeCurrent);
        document.getElementById('widget-btn-like').addEventListener('click', toggleLikeCurrent);

        // Setup Media Session API for Background Playback & Notification Controls with Focus Handling
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

        if (!song.audioUrl) return alert("Audio URL missing for this song!");

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
        
        document.getElementById('widget-title').innerText = song.title;
        document.getElementById('widget-artist').innerText = song.artist;
        document.getElementById('widget-art').src = song.artBase64 || '';
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
                    { src: song.artBase64 || 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/png' }
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
        const iconHTML = `<svg class="icon"><use href="${this.isPlaying ? '#icon-pause' : '#icon-play'}"></use></svg>`;
        document.getElementById('btn-playpause').innerHTML = iconHTML;
        document.getElementById('widget-btn-playpause').innerHTML = iconHTML;
    },

    updatePlayerLikeIcon() {
        const currentSong = this.queue[this.currentIndex];
        if (!currentSong) return;
        const isLiked = window.Storage.isLiked(currentSong.id);
        const iconHTML = `<svg class="icon"><use href="${isLiked ? '#icon-heart-filled' : '#icon-heart-outline'}"></use></svg>`;
        document.getElementById('btn-player-like').innerHTML = iconHTML;
        document.getElementById('widget-btn-like').innerHTML = iconHTML;
    },

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
};

window.Player.init();
