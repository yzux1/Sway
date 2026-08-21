class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.queue = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isShuffle = false;
        this.repeatMode = 'all'; // 'off', 'all', 'one'
        this.smartPlayEnabled = true; // Enabled by default for endless smart shuffle
        this.allSongsDatabase = [];

        this.initElements();
        this.initEvents();
    }

    initElements() {
        this.mainPlayer = document.getElementById('main-player');
        this.expandedPlayer = document.getElementById('expanded-player');
        
        // Mini player elements
        this.playerArt = document.getElementById('player-art');
        this.playerTitle = document.getElementById('player-title');
        this.playerArtist = document.getElementById('player-artist');
        this.progressBar = document.getElementById('progress-bar');
        this.btnPlayerLike = document.getElementById('btn-player-like');
        
        // Expanded player elements
        this.expandedArt = document.getElementById('expanded-art');
        this.expandedTitle = document.getElementById('expanded-title');
        this.expandedArtist = document.getElementById('expanded-artist');
        this.expandedProgressBar = document.getElementById('expanded-progress-bar');
        this.currentTimeEl = document.getElementById('expanded-current-time');
        this.durationEl = document.getElementById('expanded-duration');
        this.btnPlayPause = document.getElementById('expanded-btn-playpause');
        this.btnShuffle = document.getElementById('expanded-btn-shuffle');
        this.btnRepeat = document.getElementById('expanded-btn-repeat');
        this.btnPrev = document.getElementById('expanded-btn-prev');
        this.btnNext = document.getElementById('expanded-btn-next');
        this.btnExpandedLike = document.getElementById('btn-expanded-like');
    }

    initEvents() {
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleSongEnd());

        this.progressBar.addEventListener('input', (e) => {
            if (this.audio.duration) {
                this.audio.currentTime = (e.target.value / 100) * this.audio.duration;
            }
        });

        this.expandedProgressBar.addEventListener('input', (e) => {
            if (this.audio.duration) {
                this.audio.currentTime = (e.target.value / 100) * this.audio.duration;
            }
        });

        this.mainPlayer.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.openExpandedPlayer();
            }
        });

        document.getElementById('btn-collapse-player').addEventListener('click', () => {
            this.expandedPlayer.classList.add('hidden');
        });

        this.btnPlayPause.addEventListener('click', () => this.togglePlayPause());
        this.btnPrev.addEventListener('click', () => this.prevSong());
        this.btnNext.addEventListener('click', () => this.nextSong());

        this.btnShuffle.addEventListener('click', () => {
            this.isShuffle = !this.isShuffle;
            this.btnShuffle.classList.toggle('active', this.isShuffle);
        });

        this.btnRepeat.addEventListener('click', () => {
            if (this.repeatMode === 'all') {
                this.repeatMode = 'one';
                this.btnRepeat.style.opacity = '1';
            } else if (this.repeatMode === 'one') {
                this.repeatMode = 'off';
                this.btnRepeat.style.opacity = '0.4';
            } else {
                this.repeatMode = 'all';
                this.btnRepeat.style.opacity = '1';
            }
        });

        const toggleLikeAction = () => {
            const currentSong = this.queue[this.currentIndex];
            if (!currentSong) return;
            window.Storage.toggleLike(currentSong.id);
            this.updateLikeButtons(currentSong.id);
            if (typeof renderSongs === 'function') renderSongs();
        };

        this.btnPlayerLike.addEventListener('click', toggleLikeAction);
        this.btnExpandedLike.addEventListener('click', toggleLikeAction);
    }

    async setDatabase(songs) {
        this.allSongsDatabase = songs;
    }

    async playSong(index, queue = []) {
        if (queue.length > 0) {
            this.queue = [...queue];
        } else if (this.queue.length === 0) {
            this.queue = await window.Storage.getAllSongs();
        }

        this.currentIndex = index >= 0 && index < this.queue.length ? index : 0;
        let song = this.queue[this.currentIndex];

        if (!song) return;

        // Smart Queue Extension if enabled and queue is small/ending
        if (this.smartPlayEnabled && this.queue.length < 10) {
            this.appendSmartQueue(song);
        }

        this.audio.src = song.audioUrl;
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayerUI();
            this.mainPlayer.classList.remove('hidden');
            window.Storage.incrementPlay(song.id);
        }).catch(err => console.error("Playback error:", err));
    }

    appendSmartQueue(currentSong) {
        if (!this.allSongsDatabase || this.allSongsDatabase.length === 0) return;
        
        // Find related songs by genre or vibe
        const related = this.allSongsDatabase.filter(s => 
            s.id !== currentSong.id && 
            !this.queue.some(q => q.id === s.id) &&
            (s.genre === currentSong.genre || s.vibe === currentSong.vibe)
        );

        // Fallback to any remaining unqueued songs if genre/vibe match runs out
        const remaining = this.allSongsDatabase.filter(s => 
            s.id !== currentSong.id && 
            !this.queue.some(q => q.id === s.id)
        );

        const pool = [...related, ...remaining];
        // Shuffle the pool to create smart endless discovery
        const shuffledPool = pool.sort(() => Math.random() - 0.5);
        this.queue.push(...shuffledPool.slice(0, 15));
    }

    togglePlayPause() {
        if (!this.audio.src) return;
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
        } else {
            this.audio.play();
            this.isPlaying = true;
        }
        this.updatePlayPauseIcon();
    }

    updatePlayPauseIcon() {
        const iconSymbol = this.isPlaying ? '#icon-pause' : '#icon-play';
        this.btnPlayPause.innerHTML = `<svg class="icon" style="width:30px;height:30px;"><use href="${iconSymbol}"></use></svg>`;
    }

    nextSong() {
        if (this.queue.length === 0) return;
        if (this.isShuffle) {
            this.currentIndex = Math.floor(Math.random() * this.queue.length);
        } else {
            this.currentIndex++;
            if (this.currentIndex >= this.queue.length) {
                if (this.smartPlayEnabled) {
                    this.appendSmartQueue(this.queue[this.queue.length - 1]);
                } else {
                    this.currentIndex = 0; // loop back to start if series play
                }
            }
        }
        this.playSong(this.currentIndex);
    }

    prevSong() {
        if (this.queue.length === 0) return;
        this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
        this.playSong(this.currentIndex);
    }

    handleSongEnd() {
        if (this.repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.audio.play();
        } else {
            this.nextSong();
        }
    }

    updateProgress() {
        if (!this.audio.duration) return;
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressBar.value = percent;
        this.expandedProgressBar.value = percent;

        this.currentTimeEl.innerText = this.formatTime(this.audio.currentTime);
        this.durationEl.innerText = this.formatTime(this.audio.duration);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    updatePlayerUI() {
        const song = this.queue[this.currentIndex];
        if (!song) return;

        this.playerTitle.innerText = song.title;
        this.playerArtist.innerText = song.artist;
        this.playerArt.src = song.artBase64 || '';

        this.expandedTitle.innerText = song.title;
        this.expandedArtist.innerText = song.artist;
        this.expandedArt.src = song.artBase64 || '';

        this.updatePlayPauseIcon();
        this.updateLikeButtons(song.id);
    }

    updateLikeButtons(songId) {
        const isLiked = window.Storage.isLiked(songId);
        const heartHtml = `<svg class="icon"><use href="${isLiked ? '#icon-heart-filled' : '#icon-heart-outline'}"></use></svg>`;
        this.btnPlayerLike.innerHTML = heartHtml;
        this.btnExpandedLike.innerHTML = heartHtml;
    }

    openExpandedPlayer() {
        this.expandedPlayer.classList.remove('hidden');
    }
}

window.Player = new MusicPlayer();
