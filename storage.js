import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCgDktoAQtDrWue-uLrtWhBUodEtTOKGfQ",
  authDomain: "sway-4e211.firebaseapp.com",
  projectId: "sway-4e211",
  storageBucket: "sway-4e211.firebasestorage.app",
  messagingSenderId: "1019900913759",
  appId: "1:1019900913759:web:55c82ca5844947a151d3ea"
};

initializeApp(firebaseConfig);
const FIRESTORE_REST_URL = `https://firestore.googleapis.com/v1/projects/sway-4e211/databases/(default)/documents`;

const CLOUD_NAME = "q3divsbj";
const UPLOAD_PRESET = "sway_preset";

window.Storage = {
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('sway_current_user') || 'null');
    },
    async registerUser(username, password) {
        const cleanUser = username.toLowerCase().trim();
        if (!cleanUser || !password) throw new Error("Enter username and password!");

        const userData = {
            username: username.trim(),
            password: password,
            playlists: JSON.parse(localStorage.getItem(`sway_pl_${cleanUser}`) || '[]'),
            likedSongs: JSON.parse(localStorage.getItem(`sway_likes_${cleanUser}`) || '[]'),
            history: [],
            createdAt: Date.now()
        };

        // Save locally first so user is never blocked
        localStorage.setItem('sway_current_user', JSON.stringify(userData));

        // Try syncing to cloud in background (non-blocking)
        try {
            const url = `${FIRESTORE_REST_URL}/users/${cleanUser}`;
            fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: {
                        username: { stringValue: userData.username },
                        password: { stringValue: userData.password }
                    }
                })
            }).catch(() => {});
        } catch(e) {}

        return userData;
    },
    async loginUser(username, password) {
        const cleanUser = username.toLowerCase().trim();
        if (!cleanUser || !password) throw new Error("Enter username and password!");

        // Fallback to local profile check for instant login
        let user = JSON.parse(localStorage.getItem('sway_current_user') || 'null');
        if (!user || user.username.toLowerCase() !== cleanUser) {
            user = {
                username: username.trim(),
                password: password,
                playlists: JSON.parse(localStorage.getItem(`sway_pl_${cleanUser}`) || '[]'),
                likedSongs: JSON.parse(localStorage.getItem(`sway_likes_${cleanUser}`) || '[]'),
                history: []
            };
        }
        
        if (user.password !== password) throw new Error("Incorrect password!");

        localStorage.setItem('sway_current_user', JSON.stringify(user));
        return user;
    },
    async syncUserData(field, data) {
        const user = this.getCurrentUser();
        if (!user) return;
        user[field] = data;
        localStorage.setItem('sway_current_user', JSON.stringify(user));
        if (field === 'playlists') localStorage.setItem(`sway_pl_${user.username.toLowerCase()}`, JSON.stringify(data));
        if (field === 'likedSongs') localStorage.setItem(`sway_likes_${user.username.toLowerCase()}`, JSON.stringify(data));
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

        const songObj = {
            id: song.id,
            title: song.title,
            artist: song.artist || 'Unknown',
            genre: (song.genre || 'unknown').toLowerCase().trim(),
            vibe: (song.vibe || 'unknown').toLowerCase().trim(),
            plays: 0,
            audioUrl: audioData.secure_url,
            artUrl: artUrl,
            timestamp: Date.now()
        };

        // Save to local cache so songs appear instantly
        const localSongs = JSON.parse(localStorage.getItem('sway_local_songs') || '[]');
        localSongs.push(songObj);
        localStorage.setItem('sway_local_songs', JSON.stringify(localSongs));

        // Try syncing to Firestore REST
        try {
            await fetch(`${FIRESTORE_REST_URL}/songs/${song.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: {
                        id: { stringValue: songObj.id },
                        title: { stringValue: songObj.title },
                        artist: { stringValue: songObj.artist },
                        genre: { stringValue: songObj.genre },
                        vibe: { stringValue: songObj.vibe },
                        plays: { stringValue: "0" },
                        audioUrl: { stringValue: songObj.audioUrl },
                        artUrl: { stringValue: songObj.artUrl },
                        timestamp: { stringValue: String(songObj.timestamp) }
                    }
                })
            });
        } catch(e) {}
    },
    async getAllSongs() {
        try {
            const res = await fetch(`${FIRESTORE_REST_URL}/songs`);
            if (res.ok) {
                const data = await res.json();
                if (data.documents) {
                    const songs = data.documents.map(doc => {
                        const f = doc.fields;
                        return {
                            id: f.id ? f.id.stringValue : '',
                            title: f.title ? f.title.stringValue : '',
                            artist: f.artist ? f.artist.stringValue : '',
                            genre: f.genre ? f.genre.stringValue : 'unknown',
                            vibe: f.vibe ? f.vibe.stringValue : 'unknown',
                            plays: f.plays ? parseInt(f.plays.stringValue || 0) : 0,
                            audioUrl: f.audioUrl ? f.audioUrl.stringValue : '',
                            artBase64: f.artUrl ? f.artUrl.stringValue : '',
                            timestamp: f.timestamp ? parseInt(f.timestamp.stringValue || Date.now()) : Date.now()
                        };
                    });
                    return songs.sort((a, b) => a.timestamp - b.timestamp);
                }
            }
        } catch (err) {}
        
        // Fallback to local songs cache if offline/blocked
        return JSON.parse(localStorage.getItem('sway_local_songs') || '[]');
    },
    async incrementPlay(id) {
        try {
            const url = `${FIRESTORE_REST_URL}/songs/${id}`;
            const res = await fetch(url);
            if(res.ok) {
                const doc = await res.json();
                const currentPlays = parseInt(doc.fields.plays?.stringValue || 0);
                await fetch(`${url}?updateMask.fieldPaths=plays`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fields: { plays: { stringValue: String(currentPlays + 1) } } })
                });
            }
        } catch(e){}
    },
    async deleteSong(id) { 
        try {
            await fetch(`${FIRESTORE_REST_URL}/songs/${id}`, { method: 'DELETE' }); 
        } catch(e){}
        let localSongs = JSON.parse(localStorage.getItem('sway_local_songs') || '[]');
        localSongs = localSongs.filter(s => s.id !== id);
        localStorage.setItem('sway_local_songs', JSON.stringify(localSongs));
    },
    async sendPartyInvite(toUser, fromUser) {
        try {
            const url = `${FIRESTORE_REST_URL}/parties/${toUser.toLowerCase().trim()}`;
            await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: {
                        from: { stringValue: fromUser },
                        status: { stringValue: 'pending' },
                        timestamp: { stringValue: String(Date.now()) }
                    }
                })
            });
        } catch(e){}
    },
    async checkPartyInvites(username) {
        try {
            const url = `${FIRESTORE_REST_URL}/parties/${username.toLowerCase().trim()}`;
            const res = await fetch(url);
            if(res.ok) {
                const doc = await res.json();
                if(doc && doc.fields) {
                    return {
                        from: doc.fields.from.stringValue,
                        status: doc.fields.status.stringValue
                    };
                }
            }
        } catch(e){}
        return null;
    },
    async clearPartyInvite(username) {
        try {
            await fetch(`${FIRESTORE_REST_URL}/parties/${username.toLowerCase().trim()}`, { method: 'DELETE' });
        } catch(e){}
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
