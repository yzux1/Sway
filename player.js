const audio = new Audio();
let originalQueue = [];
let playbackQueue = [];
let currentIndex = -1;

let isShuffle = false;
let isRepeat = true; 
let isSmartPlay = true; 

const mainPlayer = document.getElementById('main-player');
const btnPlayPause = document.getElementById('btn-playpause');
const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const btnShuffle = document.getElementById('btn-shuffle');
const btnRepeat = document.getElementById('btn-repeat');
const btnLike = document.getElementById('btn-player-like');
const btnMore = document.getElementById('btn-player-more');

const plBtnShuffle = document.getElementById('btn-pl-shuffle');
const plBtnRepeat = document.getElementById('btn-pl-repeat');
const plBtnSmart = document.getElementById('btn-pl-smart');

window.Player = {
    async playSong(index, queue, isQueueIndex = false) {
        if (!isQueueIndex) {
            originalQueue = [...queue];
            if (isShuffle) {
                const songToPlay = originalQueue[index];
                playbackQueue = [...originalQueue].sort(() => Math.random() - 0.5);
                currentIndex = playbackQueue.findIndex(s => s.id === songToPlay.id);
            } else {
                playbackQueue = [...originalQueue];
                currentIndex = index;
            }
        } else {
            currentIndex = index;
        }

        const song = playbackQueue[currentIndex];
        if (!song) return;

        // **CLOUD SYNC UPDATE: Play Firebase URL**
        audio.src = song.audioUrl ? song.audioUrl : URL.createObjectURL(song.audioFile);
        audio.play();
        
        if(window.Storage) window.Storage.incrementPlay(song.id); 

        mainPlayer.classList.remove('hidden');
        document.getElementById('player-art').src = song.artBase64 || '';
        document.getElementById('player-title').innerText = song.title;
        document.getElementById('player-artist').innerText = song.artist;
        
        this.updateLikeUI(song.id);
        this.updateMediaSession(song);
    },
    updateLikeUI(songId) {
        if(!window.Storage) return;
        const isLiked = window.Storage.isLiked(songId);
        btnLike.innerHTML = `<svg class="icon"><use href="${isLiked ? '#icon-heart-filled' : '#icon-heart-outline'}"></use></svg>`;
        btnLike.style.color = isLiked ? '#fff' : '#888';
    },
    togglePlay() {
        if (!audio.src) return;
        audio.paused ? audio.play() : audio.pause();
    },
    async next() {
        if (currentIndex < playbackQueue.length - 1) {
            this.playSong(currentIndex + 1, playbackQueue, true);
        } else if (isSmartPlay) {
            await this.injectSmartSong();
        } else if (isRepeat && playbackQueue.length > 0) {
            this.playSong(0, playbackQueue, true);
        }
    },
    prev() { 
        if (audio.currentTime > 3) { audio.currentTime = 0; return; }
        if (currentIndex > 0) this.playSong(currentIndex - 1, playbackQueue, true); 
    },
    async injectSmartSong() {
        const currentSong = playbackQueue[currentIndex];
        if(!window.Storage) return;
        const allSongs = await window.Storage.getAllSongs();
        const playedIds = playbackQueue.map(s => s.id);
        const candidates = allSongs.filter(s => !playedIds.includes(s.id));
        
        if (candidates.length === 0) {
            if(isRepeat) this.playSong(0, playbackQueue, true);
            return;
        }

        let matches = candidates.filter(s => s.vibe === currentSong.vibe || s.genre === currentSong.genre);
        if (matches.length === 0) matches = candidates; 

        const randomMatch = matches[Math.floor(Math.random() * matches.length)];
        playbackQueue.push(randomMatch);
        this.playSong(currentIndex + 1, playbackQueue, true);
    },
    toggleShuffle() {
        isShuffle = !isShuffle;
        btnShuffle.classList.toggle('active', isShuffle);
        plBtnShuffle.classList.toggle('active', isShuffle);
        if (audio.src && playbackQueue.length > 0) {
            const currentSong = playbackQueue[currentIndex];
            if (isShuffle) {
                const remaining = playbackQueue.filter(s => s.id !== currentSong.id).sort(() => Math.random() - 0.5);
                playbackQueue = [currentSong, ...remaining];
            } else {
                playbackQueue = [...originalQueue];
            }
            currentIndex = playbackQueue.findIndex(s => s.id === currentSong.id);
        }
    },
    toggleRepeat() {
        isRepeat = !isRepeat;
        btnRepeat.classList.toggle('active', isRepeat);
        plBtnRepeat.classList.toggle('active', isRepeat);
    },
    toggleSmartPlay() {
        isSmartPlay = !isSmartPlay;
        plBtnSmart.classList.toggle('active', isSmartPlay);
    },
    updateMediaSession(song) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.artist, artwork: [{ src: song.artBase64 || '', sizes: '512x512', type: 'image/jpeg' }] });
            navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        }
    },
    getCurrentSong() { return currentIndex !== -1 ? playbackQueue[currentIndex] : null; }
};

btnPlayPause.addEventListener('click', () => window.Player.togglePlay());
document.getElementById('btn-next').addEventListener('click', () => window.Player.next());
document.getElementById('btn-prev').addEventListener('click', () => window.Player.prev());

btnShuffle.addEventListener('click', () => window.Player.toggleShuffle());
btnRepeat.addEventListener('click', () => window.Player.toggleRepeat());
plBtnShuffle.addEventListener('click', () => window.Player.toggleShuffle());
plBtnRepeat.addEventListener('click', () => window.Player.toggleRepeat());
plBtnSmart.addEventListener('click', () => window.Player.toggleSmartPlay());

if(isShuffle) plBtnShuffle.classList.add('active');
if(isRepeat) plBtnRepeat.classList.add('active');
if(isSmartPlay) plBtnSmart.classList.add('active');

btnLike.addEventListener('click', () => {
    const song = window.Player.getCurrentSong();
    if (song && window.Storage) { window.Storage.toggleLike(song.id); window.Player.updateLikeUI(song.id); }
});

btnMore.addEventListener('click', () => {
    const song = window.Player.getCurrentSong();
    if(song && window.ActionSheet) window.ActionSheet.open(song);
});

audio.addEventListener('ended', () => window.Player.next());
audio.addEventListener('play', () => { btnPlayPause.innerHTML = '<svg class="icon"><use href="#icon-pause"></use></svg>'; });
audio.addEventListener('pause', () => { btnPlayPause.innerHTML = '<svg class="icon"><use href="#icon-play"></use></svg>'; });
audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        progressBar.value = (audio.currentTime / audio.duration) * 100;
        currentTimeEl.innerText = formatTime(audio.currentTime);
    }
});
audio.addEventListener('loadedmetadata', () => durationEl.innerText = formatTime(audio.duration));
progressBar.addEventListener('input', () => { if (audio.duration) audio.currentTime = (progressBar.value / 100) * audio.duration; });
function formatTime(seconds) { const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; }
