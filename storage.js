// Import Firebase Cloud Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, collection, setDoc, getDocs, deleteDoc, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js";

// Your exact Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCgDktoAQtDrWue-uLrtWhBUodEtTOKGfQ",
  authDomain: "sway-4e211.firebaseapp.com",
  projectId: "sway-4e211",
  storageBucket: "sway-4e211.firebasestorage.app",
  messagingSenderId: "1019900913759",
  appId: "1:1019900913759:web:55c82ca5844947a151d3ea"
};

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

    async getAllSongs() {
        try {
            const querySnapshot = await getDocs(collection(db, "songs"));
            const songs = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
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
    toggleLike(songId) {
        let liked = this.getLikedSongs();
        if (liked.includes(songId)) liked = liked.filter(id => id !== songId);
        else liked.push(songId);
        localStorage.setItem('sway_liked', JSON.stringify(liked));
        return liked.includes(songId);
    },
    isLiked(songId) { return this.getLikedSongs().includes(songId); }
};
