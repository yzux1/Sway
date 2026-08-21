const CLOUD_NAME = "q3divsbj";
const UPLOAD_PRESET = "sway_preset";

const SUPABASE_URL = "https://ajjfrwazhyvwokaphhsb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable__MaIsE2fe-96smnuC8H6mQ_tLELUpzD";

function uploadWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
        if (!file) { reject(new Error("Nle provided")); return; }
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
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    if (!res.secure_url) { reject(new Error("Cloudinary returned no URL")); return; }
                    resolve(res.secure_url);
                } catch (err) { reject(new Error("Cloudinary response could not be parsed")); }
            } else {
                let message = xhr.responseText;
                try {
                    const error = JSON.parse(xhr.responseText);
                    message = error?.error?.message || xhr.responseText;
                } catch (_) {}
                reject(new Error(`Cloudinary upload failed (${xhr.status}): ${message}`));
            }
        };
        xhr.onerror = () => reject(new Error("Cloudinary network error"));
        xhr.ontimeout = () => reject(new Error("Cloudinary upload timed out"));
        xhr.send(formData);
    });
}

async function supabaseRequest(endpoint, options = {}) {
    const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_PUBLISHABLE_KEY,
            ...(options.headers || {})
        }
    });
    const text = await response.text();
    if (!response.ok) {
        let message = text;
        try {
            const json = JSON.parse(text);
            message = json?.message || json?.error_description || json?.error || text;
        } catch (_) {}
        throw new Error(`Supabase ${response.status}: ${message}`);
    }
    if (!text) return null;
    try { return JSON.parse(text); } catch (_) { return text; }
}

function getLocalSongs() {
    try { return JSON.parse(localStorage.getItem("sway_global_songs") || "[]"); } catch (e) { return []; }
}

function setLocalSongs(songs) {
    localStorage.setItem("sway_global_songs", JSON.stringify(songs));
}

window.Storage = {
    async saveSong(song, onProgress) {
        if (!song || !song.audioFile) throw new Error("Song data or audio file missing");

        const audioUrl = await uploadWithProgress(song.audioFile, onProgress);
        if (!audioUrl) throw new Error("Audio upload failed");

        let artUrl = "";
        if (song.artBase64) {
            try {
                const res = await fetch(song.artBase64);
                const blob = await res.blob();
                artUrl = await uploadWithProgress(blob, null);
            } catch (e) {
                artUrl = song.artBase64;
            }
        }

        const songData = {
            id: String(song.id),
            title: song.title || "Unknown",
            artist: song.artist || "Unknown",
            genre: (song.genre || "unknown").toLowerCase().trim(),
            vibe: (song.vibe || "unknown").toLowerCase().trim(),
            plays: 0,
            audio_url: audioUrl,
            art_url: artUrl || "",
            timestamp: Date.now()
        };

        await supabaseRequest("/rest/v1/songs", {
            method: "POST",
            headers: { "Prefer": "return=minimal" },
            body: JSON.stringify(songData)
        });

        let localSongs = getLocalSongs().filter(s => String(s.id) !== String(songData.id));
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
        setLocalSongs(localSongs);
    },

    async updateSongMeta(updatedSong) {
        await supabaseRequest(`/rest/v1/songs?id=eq.${encodeURIComponent(updatedSong.id)}`, {
            method: "PATCH",
            headers: { "Prefer": "return=minimal" },
            body: JSON.stringify({
                title: updatedSong.title,
                artist: updatedSong.artist,
                genre: (updatedSong.genre || "unknown").toLowerCase().trim(),
                vibe: (updatedSong.vibe || "unknown").toLowerCase().trim()
            })
        });

        let localSongs = getLocalSongs();
        localSongs = localSongs.map(s => {
            if (String(s.id) === String(updatedSong.id)) {
                s.title = updatedSong.title;
                s.artist = updatedSong.artist;
                s.genre = updatedSong.genre;
                s.vibe = updatedSong.vibe;
            }
            return s;
        });
        setLocalSongs(localSongs);
    },

    async incrementPlay(id) {
        let localSongs = getLocalSongs();
        let targetSong = localSongs.find(s => String(s.id) === String(id));
        let newPlays = 1;
        if (targetSong) {
            newPlays = Number(targetSong.plays || 0) + 1;
            targetSong.plays = newPlays;
            setLocalSongs(localSongs);
        }
        try {
            await supabaseRequest(`/rest/v1/songs?id=eq.${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Prefer": "return=minimal" },
                body: JSON.stringify({ plays: newPlays })
            });
        } catch (e) {}
    },

    async getAllSongs() {
        let localSongs = getLocalSongs();
        try {
            const data = await supabaseRequest("/rest/v1/songs?select=*", { method: "GET" });
            if (Array.isArray(data)) {
                const cloudSongs = data.map(item => ({
                    id: String(item.id),
                    title: item.title,
                    artist: item.artist,
                    genre: item.genre,
                    vibe: item.vibe,
                    plays: Number(item.plays || 0),
                    audioUrl: item.audio_url,
                    artBase64: item.art_url,
                    timestamp: Number(item.timestamp || 0)
                }));
                const map = new Map();
                for (const song of localSongs) map.set(String(song.id), song);
                for (const song of cloudSongs) map.set(String(song.id), song);
                localSongs = Array.from(map.values());
                setLocalSongs(localSongs);
            }
        } catch (err) {
            console.warn("Cloud fetch failed, using local cache:", err);
        }
        return localSongs.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    },

    async deleteSong(id) {
        await supabaseRequest(`/rest/v1/songs?id=eq.${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: { "Prefer": "return=minimal" }
        });
        let songs = getLocalSongs().filter(song => String(song.id) !== String(id));
        setLocalSongs(songs);
    },

    getPlaylists() {
        try { return JSON.parse(localStorage.getItem("sway_global_playlists") || "[]"); } catch (e) { return []; }
    },

    savePlaylists(playlists) {
        localStorage.setItem("sway_global_playlists", JSON.stringify(playlists));
    },

    getLikedSongs() {
        try { return JSON.parse(localStorage.getItem("sway_global_likes") || "[]"); } catch (e) { return []; }
    },

    toggleLike(songId) {
        let liked = this.getLikedSongs();
        if (liked.includes(songId)) {
            liked = liked.filter(id => id !== songId);
        } else {
            liked.push(songId);
        }
        localStorage.setItem("sway_global_likes", JSON.stringify(liked));
        return liked.includes(songId);
    },

    isLiked(songId) {
        return this.getLikedSongs().includes(songId);
    }
};
