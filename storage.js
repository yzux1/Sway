const CLOUD_NAME = "q3divsbj";
const UPLOAD_PRESET = "sway_preset";
const SUPABASE_URL = "https://ajjfrwazhyvwokaphhsb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqamZyd2F6aHl2d29rYXBoaHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTExNjcsImV4cCI6MjEwMjUyNzE2N30.Cs0IyuZaH63pGSvDstyux363UtD_khtXxT4QoLOLTMg";

function uploadWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("resource_type", "auto");

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                const loadedMB = (e.loaded / (1024 * 1024)).toFixed(2);
                const totalMB = (e.total / (1024 * 1024)).toFixed(2);
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress({ loadedMB, totalMB, percent });
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    resolve(res.secure_url);
                } catch (err) { reject(new Error("Cloudinary parse error")); }
            } else { 
                reject(new Error("Cloudinary upload failed")); 
            }
        };

        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
    });
}

window.Storage = {
    async saveSong(song, onProgress) {
        const audioUrl = await uploadWithProgress(song.audioFile, onProgress);
        if (!audioUrl) throw new Error("Audio upload failed");

        let artUrl = '';
        if (song.artBase64) {
            try {
                const res = await fetch(song.artBase64);
                const blob = await res.blob();
                artUrl = await uploadWithProgress(blob, null);
            } catch(e) {
                artUrl = song.artBase64;
            }
        }

        const songData = {
            id: String(song.id),
            title: song.title,
            artist: song.artist || 'Unknown',
            genre: (song.genre || 'unknown').toLowerCase().trim(),
            vibe: (song.vibe || 'unknown').toLowerCase().trim(),
            plays: 0,
            audio_url: audioUrl,
            art_url: artUrl || song.artBase64,
            timestamp: Date.now()
        };

        // Save locally first
        let localSongs = JSON.parse(localStorage.getItem('sway_global_songs') || '[]');
        localSongs.push({ 
            id: songData.id,
            title: songData.title,
            artist: songData.artist,
            genre: songData.genre,
            vibe: songData.vibe,
            plays: songData.plays,
            audioUrl: songData.audio_url,
            artBase64: songData.art_url,
            timestamp: songData.timestamp
        });
        localStorage.setItem('sway_global_songs', JSON.stringify(localSongs));

        // Direct REST API Post to Supabase (bypasses SDK module errors)
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/songs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(songData)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error("Cloud save failed: " + errText);
            }
        } catch (err) {
            console.error("Cloud save error:", err);
            throw err;
        }
    },

    async getAllSongs() {
        let localSongs = JSON.parse(localStorage.getItem('sway_global_songs') || '[]');

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/songs?select=*`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const cloudSongs = data.map(item => ({
                        id: String(item.id),
                        title: item.title,
                        artist: item.artist,
                        genre: item.genre,
                        vibe: item.vibe,
                        plays: item.plays,
                        audioUrl: item.audio_url,
                        artBase64: item.art_url,
                        timestamp: Number(item.timestamp)
                    }));

                    const map = new Map();
                    [...localSongs, ...cloudSongs].forEach(s => map.set(s.id, s));
                    localSongs = Array.from(map.values());
                    localStorage.setItem('sway_global_songs', JSON.stringify(localSongs));
                }
            }
        } catch (err) {
            console.warn("Using local cache fallback");
        }

        return localSongs.sort((a, b) => a.timestamp - b.timestamp);
    },

    async incrementPlay(id) {
        let globalSongs = JSON.parse(localStorage.getItem('sway_global_songs') || '[]');
        globalSongs = globalSongs.map(s => {
            if (s.id === String(id)) s.plays = (s.plays || 0) + 1;
            return s;
        });
        localStorage.setItem('sway_global_songs', JSON.stringify(globalSongs));
    },

    async deleteSong(id) {
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/songs?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
        } catch (e) {}

        let globalSongs = JSON.parse(localStorage.getItem('sway_global_songs') || '[]');
        globalSongs = globalSongs.filter(s => s.id !== String(id));
        localStorage.setItem('sway_global_songs', JSON.stringify(globalSongs));
    },

    getPlaylists() {
        return JSON.parse(localStorage.getItem('sway_global_playlists') || '[]');
    },

    savePlaylists(pls) {
        localStorage.setItem('sway_global_playlists', JSON.stringify(pls));
    },

    getLikedSongs() {
        return JSON.parse(localStorage.getItem('sway_global_likes') || '[]');
    },

    toggleLike(songId) {
        let liked = this.getLikedSongs();
        if (liked.includes(songId)) liked = liked.filter(id => id !== songId);
        else liked.push(songId);
        localStorage.setItem('sway_global_likes', JSON.stringify(liked));
        return liked.includes(songId);
    },

    isLiked(songId) {
        return this.getLikedSongs().includes(songId);
    }
};
