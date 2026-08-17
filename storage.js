<<<<<<< HEAD
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, collection, setDoc, getDocs, deleteDoc, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

=======
// Import Firebase Cloud Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, collection, setDoc, getDocs, deleteDoc, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js";

// Your exact Firebase Config
>>>>>>> 20264fdcea4aa13203d6635fb3c245e77e5264e6
const firebaseConfig = {
  apiKey: "AIzaSyCgDktoAQtDrWue-uLrtWhBUodEtTOKGfQ",
  authDomain: "sway-4e211.firebaseapp.com",
  projectId: "sway-4e211",
  storageBucket: "sway-4e211.firebasestorage.app",
  messagingSenderId: "1019900913759",
  appId: "1:1019900913759:web:55c82ca5844947a151d3ea"
};

<<<<<<< HEAD
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cloudinary Config
const CLOUD_NAME = "q3divsbj";
const UPLOAD_PRESET = "sway_preset"; // Make sure this matches the preset you created in Cloudinary

window.Storage = {
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('sway_current_user') || 'null');
    },
    async registerUser(username, password) {
        const userRef = doc(db, "users", username.toLowerCase().trim());
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
        const userRef = doc(db, "users", username.toLowerCase().trim());
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
        
        const userRef = doc(db, "users", user.username.toLowerCase().trim());
        await updateDoc(userRef, { [field]: data });
    },
    async saveSong(song) {
        // 1. Upload Audio to Cloudinary
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

        // 2. Upload Cover Art to Cloudinary (if provided)
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

        // 3. Save Metadata to Firestore Database
=======
// Initialize Cloud Services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

window.Storage = {
    async saveSong(song) {
        // 1. Upload the MP3 file to Firebase Storage
        const audioRef = ref(storage, `songs/audio/${song.id}_${song.audioFile.name}`);
        await uploadBytes(audioRef, song.audioFile);
        const audioUrl = await getDownloadURL(audioRef);

        // 2. Upload the Cover Art to Firebase Storage (if provided)
        let artUrl = '';
        if (song.artBase64) {
            const artRef = ref(storage, `songs/art/${song.id}_art.jpg`);
            await uploadString(artRef, song.artBase64, 'data_url');
            artUrl = await getDownloadURL(artRef);
        }

        // 3. Save the URLs and Metadata to Firestore Database
>>>>>>> 20264fdcea4aa13203d6635fb3c245e77e5264e6
        await setDoc(doc(db, "songs", song.id), {
            id: song.id,
            title: song.title,
            artist: song.artist,
            genre: (song.genre || 'unknown').toLowerCase().trim(),
            vibe: (song.vibe || 'unknown').toLowerCase().trim(),
            plays: 0,
            audioUrl: audioUrl,
            artUrl: artUrl,
            timestamp: Date.now()
        });
    },
<<<<<<< HEAD
=======

>>>>>>> 20264fdcea4aa13203d6635fb3c245e77e5264e6
    async getAllSongs() {
        try {
            const querySnapshot = await getDocs(collection(db, "songs"));
            const songs = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
<<<<<<< HEAD
                songs.push({ ...data, artBase64: data.artUrl });
            });
            return songs.sort((a, b) => a.timestamp - b.timestamp);
        } catch (err) { return []; }
    },
    async incrementPlay(id) {
        try { await updateDoc(doc(db, "songs", id), { plays: increment(1) }); } catch(e){}
    },
    async deleteSong(id) { await deleteDoc(doc(db, "songs", id)); },
    
    // Party System Helpers
    async sendPartyInvite(toUser, fromUser) {
        await setDoc(doc(db, "parties", toUser.toLowerCase().trim()), { from: fromUser, status: 'pending', timestamp: Date.now() });
    },
    async checkPartyInvites(username) {
        const ref = doc(db, "parties", username.toLowerCase().trim());
        const snap = await getDoc(ref);
        if(snap.exists()) return snap.data();
        return null;
    },
    async clearPartyInvite(username) {
        await deleteDoc(doc(db, "parties", username.toLowerCase().trim()));
    },

    getPlaylists() { const u = this.getCurrentUser(); return u ? u.playlists : []; },
    savePlaylists(pls) { this.syncUserData('playlists', pls); },
    getLikedSongs() { const u = this.getCurrentUser(); return u ? u.likedSongs : []; },
=======
                songs.push({
                    ...data,
                    artBase64: data.artUrl // Maps cloud image to UI
                });
            });
            // Sort by newest first
            return songs.sort((a, b) => a.timestamp - b.timestamp);
        } catch (err) {
            console.error("Cloud Sync Failed:", err);
            return [];
        }
    },

    async incrementPlay(id) {
        try {
            await updateDoc(doc(db, "songs", id), { plays: increment(1) });
        } catch(err) { console.error("Play increment failed", err); }
    },

    async deleteSong(id) {
        await deleteDoc(doc(db, "songs", id));
    },

    // Playlists and Likes remain on local device memory for user privacy
    getPlaylists() { return JSON.parse(localStorage.getItem('sway_playlists') || '[]'); },
    savePlaylists(playlists) { localStorage.setItem('sway_playlists', JSON.stringify(playlists)); },
    getLikedSongs() { return JSON.parse(localStorage.getItem('sway_liked') || '[]'); },
>>>>>>> 20264fdcea4aa13203d6635fb3c245e77e5264e6
    toggleLike(songId) {
        let liked = this.getLikedSongs();
        if (liked.includes(songId)) liked = liked.filter(id => id !== songId);
        else liked.push(songId);
<<<<<<< HEAD
        this.syncUserData('likedSongs', liked);
=======
        localStorage.setItem('sway_liked', JSON.stringify(liked));
>>>>>>> 20264fdcea4aa13203d6635fb3c245e77e5264e6
        return liked.includes(songId);
    },
    isLiked(songId) { return this.getLikedSongs().includes(songId); }
};
