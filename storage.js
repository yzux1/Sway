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
        
        try {
            const userRef = doc(db, "users", user.username.toLowerCase().trim());
            await updateDoc(userRef, { [field]: data });
        } catch(e){}
    },
    async saveSong(song) {
        const audioFormData = new FormData();
        audioFormData.append("file", song.audioFile);
        audioFormData.append("upload_preset", UPLOAD_PRESET);
        audioFormData.append("resource_type", "auto");

        const audioRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
            method: "POST",
            body: audioFormData
        });
        const audioData = await audioRes.json();
        if (!audioData.secure_url) throw new Error("Cloudinary Audio Upload Failed");
        const audioUrl = audioData.secure_url;

        let artUrl = '';
        if (song.artBase64) {
            const artFormData = new FormData();
            artFormData.append("file", song.artBase64);
            artFormData.append("upload_preset", UPLOAD_PRESET);

            const artRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
                method: "POST",
                body: artFormData
            });
            const artData = await artRes.json();
            if (artData.secure_url) artUrl = artData.secure_url;
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
        } catch (err) { return []; }
    },
    async incrementPlay(id) {
        try { await updateDoc(doc(db, "songs", String(id)), { plays: increment(1) }); } catch(e){}
    },
    async deleteSong(id) { await deleteDoc(doc(db, "songs", String(id))); },
    
    async sendPartyInvite(toUser, fromUser) {
        await setDoc(doc(db, "parties", toUser.toLowerCase().trim()), { from: fromUser, status: 'pending', timestamp: Date.now() });
    },
    async checkPartyInvites(username) {
        try {
            const ref = doc(db, "parties", username.toLowerCase().trim());
            const snap = await getDoc(ref);
            if(snap.exists()) return snap.data();
        } catch(e){}
        return null;
    },
    async clearPartyInvite(username) {
        try { await deleteDoc(doc(db, "parties", username.toLowerCase().trim())); } catch(e){}
    },

    getPlaylists() { const u = this.getCurrentUser(); return u ? u.playlists : []; },
    savePlaylists(pls) { this.syncUserData('playlists', pls); },
    getLikedSongs() { const u = this.getCurrentUser(); return u ? u.likedSongs : []; },
    toggleLike(songId) {
        let liked = this.getLikedSongs();
        if (liked.includes(songId)) liked = liked.filter(id => id !== songId);
        else liked.push(songId);
        this.syncUserData('likedSongs', liked);
        return liked.includes(songId);
    },
    isLiked(songId) { return this.getLikedSongs().includes(songId); }
};
