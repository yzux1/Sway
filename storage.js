import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, collection, setDoc, getDocs, deleteDoc, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

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
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('sway_current_user') || 'null');
    },
    async registerUser(username, password) {
        const cleanUser = username.toLowerCase().trim();
        const userRef = doc(db, "users", cleanUser);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) throw new Error("Username already taken!");

        const userData = {
            username: username.trim(),
            password: password,
            playlists: [],
            likedSongs: [],
            history: [],
            createdAt: Date.now()
        };
        await setDoc(userRef, userData);
        localStorage.setItem('sway_current_user', JSON.stringify(userData));
        return userData;
    },
    async loginUser(username, password) {
        const cleanUser = username.toLowerCase().trim();
        const userRef = doc(db, "users", cleanUser);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error("User not found!");
        const data = userSnap.data();
        if (data.password !== password) throw new Error("Incorrect password!");

        localStorage.setItem('sway_current_user', JSON.stringify(data));
        return data;
    },
    async syncUserData(field, data) {
        const user = this.getCurrentUser();
        if (!user) return;
        user[field] = data;
        localStorage.setItem('sway_current_user', JSON.stringify(user));
        
        localStorage.setItem(`sway_user_${user.username.toLowerCase()}_${field}`, JSON.stringify(data));

        try {
            const userRef = doc(db, "users", user.username.toLowerCase().trim());
            await updateDoc(userRef, { [field]: data });
        } catch(e){}
    },
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
            artUrl: artUrl,
            timestamp: Date.now()
        };

        await setDoc(doc(db, "songs", songData.id), songData);
        
        const localSongs = JSON.parse(localStorage.getItem('sway_cached_songs') || '[]');
        localSongs.push({ ...songData, artBase64: artUrl });
        localStorage.setItem('sway_cached_songs', JSON.stringify(localSongs));
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
                localStorage.setItem('sway_cached_songs', JSON.stringify(songs));
            }
        } catch (err) {}

        if (songs.length === 0) {
            songs = JSON.parse(localStorage.getItem('sway_cached_songs') || '[]');
        }

        return songs.sort((a, b) => a.timestamp - b.timestamp);
    },
    async incrementPlay(id) {
        try { await updateDoc(doc(db, "songs", String(id)), { plays: increment(1) }); } catch(e){}
    },
    async deleteSong(id) { 
        try { await deleteDoc(doc(db, "songs", String(id))); } catch(e){}
        let localSongs = JSON.parse(localStorage.getItem('sway_cached_songs') || '[]');
        localSongs = localSongs.filter(s => s.id !== String(id));
        localStorage.setItem('sway_cached_songs', JSON.stringify(localSongs));
    },
    async sendPartyInvite(toUser, fromUser) {
        try { await setDoc(doc(db, "parties", toUser.toLowerCase().trim()), { from: fromUser, status: 'pending', timestamp: Date.now() }); } catch(e){}
    },
    async checkPartyInvites(username) {
        try {
            const snap = await getDoc(doc(db, "parties", username.toLowerCase().trim()));
            if(snap.exists()) return snap.data();
        } catch(e){}
        return null;
    },
    async clearPartyInvite(username) {
        try { await deleteDoc(doc(db, "parties", username.toLowerCase().trim())); } catch(e){}
    },

    getPlaylists() { 
        const u = this.getCurrentUser(); 
        if (!u) return [];
        const isolated = localStorage.getItem(`sway_user_${u.username.toLowerCase()}_playlists`);
        if (isolated) return JSON.parse(isolated);
        return u.playlists || []; 
    },
    savePlaylists(pls) { this.syncUserData('playlists', pls); },
    getLikedSongs() { 
        const u = this.getCurrentUser(); 
        if (!u) return [];
        const isolated = localStorage.getItem(`sway_user_${u.username.toLowerCase()}_likedSongs`);
        if (isolated) return JSON.parse(isolated);
        return u.likedSongs || []; 
    },
    toggleLike(songId) {
        let liked = this.getLikedSongs();
        if (liked.includes(songId)) liked = liked.filter(id => id !== songId);
        else liked.push(songId);
        this.syncUserData('likedSongs', liked);
        return liked.includes(songId);
    },
    isLiked(songId) { return this.getLikedSongs().includes(songId); }
};
