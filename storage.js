import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, collection, setDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCgDktoAQtDrWue-uLrtWhBUodEtTOKGfQ",
  authDomain: "sway-4e211.firebaseapp.com",
  projectId: "sway-4e211",
  storageBucket: "sway-4e211.firebasestorage.app",
  messagingSenderId: "1019900913759",
  appId: "1:1019900913759:web:55c82ca5844947a151d3ea"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CLOUD_NAME = "q3divsbj";
const UPLOAD_PRESET = "sway_preset";

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
                } catch (err) { reject(new Error("Cloudinary JSON parse error")); }
            } else { 
                try {
                    const errRes = JSON.parse(xhr.responseText);
                    reject(new Error(errRes.error?.message || "Upload failed"));
                } catch(e) {
                    reject(new Error("Cloudinary upload failed with status " + xhr.status)); 
                }
            }
        };

        xhr.onerror = () => reject(new Error("Network connection error during upload"));
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
            audioUrl: audioUrl,
            artUrl: artUrl || song.artBase64,
            timestamp: Date.now()
        };

        // Cache locally first so it appears instantly on this device
        const localSongs = JSON.parse(localStorage.getItem('sway_global_songs') || '[]');
        localSongs.push({ ...songData, artBase64: songData.artUrl });
        localStorage.setItem('sway_global_songs', JSON.stringify(localSongs));

        // Save globally to Firebase Firestore so other devices receive it
        try {
            await setDoc(doc(db, "songs", songData.id), songData);
        } catch (err) {
            console.error("Firebase sync error:", err);
        }
    },

    async getAllSongs() {
        let songs = [];
        try {
            const querySnapshot = await getDocs(collection(db, "songs"));
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                songs.push({ ...data, artBase64: data.artUrl });
            });
            if (songs.length > 0) {
                localStorage.setItem('sway_global_songs', JSON.stringify(songs));
            }
        } catch (err) {
            console.warn("Using local cache due to Firebase read restriction:", err);
        }

        // Fallback to local cache if Firebase is unreachable or blocked by rules
        if (songs.length === 0) {
            songs = JSON.parse(localStorage.getItem('sway_global_songs') || '[]');
        }

        return songs.sort((a, b) => a.timestamp - b.timestamp);
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
            await deleteDoc(doc(db, "songs", String(id)));
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
