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
                } catch (err) { reject(new Error("Parse error")); }
            } else { reject(new Error("Upload failed")); }
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
            const res = await fetch(song.artBase64);
            const blob = await res.blob();
            artUrl = await uploadWithProgress(blob, null);
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

        // Save globally to Firebase Firestore so all devices worldwide receive it
        await setDoc(doc(db, "songs", songData.id), songData);
    },

    async getAllSongs() {
        try {
            const querySnapshot = await getDocs(collection(db, "songs"));
            const songs = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                songs.push({ ...data, artBase64: data.artUrl });
            });
            return songs.sort((a, b) => a.timestamp - b.timestamp);
        } catch (err) {
            return [];
        }
    },

    async incrementPlay(id) {
        // Local play count tracker
    },

    async deleteSong(id) {
        try {
            await deleteDoc(doc(db, "songs", String(id)));
        } catch (e) {}
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
