/**
 * Universal Duration & Time Formatter
 * Eliminates concatenation/malformed string bugs like 1:221:16.
 */
function formatDuration(value) {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value) || value < 0) {
        return "0:00";
    }
    let totalSeconds = Number(value);
    if (totalSeconds > 1000000000) {
        totalSeconds = totalSeconds / 1000;
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

    if (hours > 0) {
        const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
        return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${minutes}:${paddedSeconds}`;
}

class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.queue = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isShuffle = false;
        this.repeatMode = 'all'; // 'off', 'all', 'one'
        this.smartPlayEnabled = true; 
        this.allSongsDatabase = [];

        this.initElements();
        this.initEvents();
    }

    initElements() {
        this.mainPlayer = document.getElementById('main-player');
        this.expandedPlayer = document.getElementById('expanded-player');
        
        this.playerArt = document.getElementById('player-art');
        this.playerTitle = document.getElementById('player-title');
        this.playerArtist = document.getElementById('player-artist');
        this.progressBar = document.getElementById('progress-bar');
        this.btnPlayerLike = document.getElementById('btn-player-like');
        
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

        const collapseBtn = document.getElementById('btn-collapse-player');
        if(collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                this.expandedPlayer.classList.add('hidden');
            });
        }

        if(this.btnPlayPause) this.btnPlayPause.addEventListener('click', () => this.togglePlayPause());
        if(this.btnPrev) this.btnPrev.addEventListener('click', () => this.prevSong());
        if(this.btnNext) this.btnNext.addEventListener('click', () => this.nextSong());

        if(this.btnShuffle) {
            this.btnShuffle.addEventListener('click', () => {
                this.isShuffle = !this.isShuffle;
                this.btnShuffle.style.opacity = this.isShuffle ? '1' : '0.4';
                this.btnShuffle.classList.toggle('active', this.isShuffle);
            });
        }

        if(this.btnRepeat) {
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
        }

        const toggleLikeAction = () => {
            const currentSong = this.queue[this.currentIndex];
            if (!currentSong) return;
            window.Storage.toggleLike(currentSong.id);
            this.updateLikeButtons(currentSong.id);
            if (typeof renderSongs === 'function') renderSongs();
        };

        if(this.btnPlayerLike) this.btnPlayerLike.addEventListener('click', toggleLikeAction);
        if(this.btnExpandedLike) this.btnExpandedLike.addEventListener('click', toggleLikeAction);
    }

    setDatabase(songs) {
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

        if (this.smartPlayEnabled && this.queue.length < 15) {
            this.appendSmartQueue(song);
        }

        this.audio.src = song.audioUrl;
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayerUI();
            this.mainPlayer.classList.remove('hidden');
            window.Storage.incrementPlay(song.id);
            this.setupMediaSession(song);
        }).catch(err => console.error("Playback error:", err));
    }

    setupMediaSession(song) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title || 'Sway Track',
                artist: song.artist || 'Sway Artist',
                album: 'Sway Master Experience',
                artwork: [
                    { src: song.artBase64 || '', sizes: '512x512', type: 'image/png' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prevSong());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.nextSong());
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime && this.audio.duration) {
                    this.audio.currentTime = details.seekTime;
                }
            });
        }
    }

    appendSmartQueue(currentSong) {
        if (!this.allSongsDatabase || this.allSongsDatabase.length === 0) return;
        
        const related = this.allSongsDatabase.filter(s => 
            s.id !== currentSong.id && 
            !this.queue.some(q => q.id === s.id) &&
            (s.genre === currentSong.genre || s.vibe === currentSong.vibe)
        );

        const remaining = this.allSongsDatabase.filter(s => 
            s.id !== currentSong.id && 
            !this.queue.some(q => q.id === s.id)
        );

        const pool = [...related, ...remaining];
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
        if(!this.btnPlayPause) return;
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
                    this.currentIndex = 0;
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
        } else if (this.repeatMode === 'off' && this.currentIndex >= this.queue.length - 1 && !this.smartPlayEnabled) {
            this.isPlaying = false;
            this.updatePlayPauseIcon();
        } else {
            this.nextSong();
        }
    }

    updateProgress() {
        if (!this.audio.duration) return;
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        if(this.progressBar) this.progressBar.value = percent;
        if(this.expandedProgressBar) this.expandedProgressBar.value = percent;

        if(this.currentTimeEl) this.currentTimeEl.innerText = formatDuration(this.audio.currentTime);
        if(this.durationEl) this.durationEl.innerText = formatDuration(this.audio.duration);
    }

    updatePlayerUI() {
        const song = this.queue[this.currentIndex];
        if (!song) return;

        if(this.playerTitle) this.playerTitle.innerText = song.title;
        if(this.playerArtist) this.playerArtist.innerText = song.artist;
        if(this.playerArt) this.playerArt.src = song.artBase64 || '';

        if(this.expandedTitle) this.expandedTitle.innerText = song.title;
        if(this.expandedArtist) this.expandedArtist.innerText = song.artist;
        if(this.expandedArt) this.expandedArt.src = song.artBase64 || '';

        this.updatePlayPauseIcon();
        this.updateLikeButtons(song.id);
    }

    updateLikeButtons(songId) {
        const isLiked = window.Storage.isLiked(songId);
        const heartHtml = `<svg class="icon"><use href="${isLiked ? '#icon-heart-filled' : '#icon-heart-outline'}"></use></svg>`;
        if(this.btnPlayerLike) this.btnPlayerLike.innerHTML = heartHtml;
        if(this.btnExpandedLike) this.btnExpandedLike.innerHTML = heartHtml;
    }

    openExpandedPlayer() {
        if(this.expandedPlayer) this.expandedPlayer.classList.remove('hidden');
    }
}

window.Player = new MusicPlayer();
