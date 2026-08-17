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
        const url = `${FIRESTORE_REST_URL}/users/${cleanUser}`;
        
        try {
            // Check if user exists
            const checkRes = await fetch(url);
            if (checkRes.ok) {
                const data = await checkRes.json();
                if (data && data.fields) throw new Error("Username already taken!");
            }

            const userData = {
                username: username.trim(),
                password: password,
                playlists: [],
                likedSongs: [],
                history: [],
                createdAt: Date.now()
            };

            // Save user via REST API
            const saveRes = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: {
                        username: { stringValue: userData.username },
                        password: { stringValue: userData.password },
                        playlists: { arrayValue: { values: [] } },
                        likedSongs: { arrayValue: { values: [] } },
                        history: { arrayValue: { values: [] } },
                        createdAt: { integerValue: userData.createdAt.toString() }
                    }
                })
            });

            if (!saveRes.ok) throw new Error("Failed to create profile in cloud.");

            localStorage.setItem('sway_current_user', JSON.stringify(userData));
            return userData;
        } catch (err) {
            throw new Error(err.message || "Connection failed.");
        }
    },
    async loginUser(username, password) {
        const cleanUser = username.toLowerCase().trim();
        const url = `${FIRESTORE_REST_URL}/users/${cleanUser}`;
        
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("User not found!");
            const doc = await res.json();
            if (!doc || !doc.fields) throw new Error("User not found!");

            const storedPassword = doc.fields.password.stringValue;
            if (storedPassword !== password) throw new Error("Incorrect password!");

            const playlists = (doc.fields.playlists.arrayValue.values || []).map(v => {
                // simple mapper for saved arrays if needed
                return v.stringValue || v;
            });

            const userData = {
                username: doc.fields.username.stringValue,
                password: storedPassword,
                playlists: [],
                likedSongs: (doc.fields.likedSongs.arrayValue.values || []).map(v => v.stringValue),
                history: []
            };

            localStorage.setItem('sway_current_user', JSON.stringify(userData));
            return userData;
        } catch (err) {
            throw new Error(err.message || "Connection failed.");
        }
    },
    async syncUserData(field, data) {
        const user = this.getCurrentUser();
        if (!user) return;
        user[field] = data;
        localStorage.setItem('sway_current_user', JSON.stringify(user));
        
        try {
            const cleanUser = user.username.toLowerCase().trim();
            const url = `${FIRESTORE_REST_URL}/users/${cleanUser}`;
            
            // Partial update using updateMask
            await fetch(`${url}?updateMask.fieldPaths=${field}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: {
                        [field]: { arrayValue: { values: data.map(item => ({ stringValue: String(item) })) } }
                    }
                })
            });
        } catch(e) { console.error("Sync error", e); }
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

        const url = `${FIRESTORE_REST_URL}/songs/${song.id}`;
        await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    id: { stringValue: song.id },
                    title: { stringValue: song.title },
                    artist: { stringValue: song.artist },
                    genre: { stringValue: (song.genre || 'unknown').toLowerCase().trim() },
                    vibe: { stringValue: (song.vibe || 'unknown').toLowerCase().trim() },
                    plays: { integerValue: "0" },
                    audioUrl: { stringValue: audioData.secure_url },
                    artUrl: { stringValue: artUrl },
                    timestamp: { integerValue: song.id }
                }
            })
        });
    },
    async getAllSongs() {
        try {
            const res = await fetch(`${FIRESTORE_REST_URL}/songs`);
            if (!res.ok) return [];
            const data = await res.json();
            if (!data.documents) return [];

            const songs = data.documents.map(doc => {
                const f = doc.fields;
                return {
                    id: f.id ? f.id.stringValue : '',
                    title: f.title ? f.title.stringValue : '',
                    artist: f.artist ? f.artist.stringValue : '',
                    genre: f.genre ? f.genre.stringValue : 'unknown',
                    vibe: f.vibe ? f.vibe.stringValue : 'unknown',
                    plays: f.plays ? parseInt(f.plays.integerValue || 0) : 0,
                    audioUrl: f.audioUrl ? f.audioUrl.stringValue : '',
                    artBase64: f.artUrl ? f.artUrl.stringValue : '',
                    timestamp: f.timestamp ? parseInt(f.timestamp.integerValue || Date.now()) : Date.now()
                };
            });
            return songs.sort((a, b) => a.timestamp - b.timestamp);
        } catch (err) { return []; }
    },
    async incrementPlay(id) {
        try {
            const url = `${FIRESTORE_REST_URL}/songs/${id}`;
            const res = await fetch(url);
            if(res.ok) {
                const doc = await res.json();
                const currentPlays = parseInt(doc.fields.plays?.integerValue || 0);
                await fetch(`${url}?updateMask.fieldPaths=plays`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fields: { plays: { integerValue: String(currentPlays + 1) } } })
                });
            }
        } catch(e){}
    },
    async deleteSong(id) { 
        await fetch(`${FIRESTORE_REST_URL}/songs/${id}`, { method: 'DELETE' }); 
    },
    async sendPartyInvite(toUser, fromUser) {
        const url = `${FIRESTORE_REST_URL}/parties/${toUser.toLowerCase().trim()}`;
        await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    from: { stringValue: fromUser },
                    status: { stringValue: 'pending' },
                    timestamp: { integerValue: String(Date.now()) }
                }
            })
        });
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
        await fetch(`${FIRESTORE_REST_URL}/parties/${username.toLowerCase().trim()}`, { method: 'DELETE' });
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
