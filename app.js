document.addEventListener('DOMContentLoaded', async () => {
    
    const authOverlay = document.getElementById('auth-overlay');
    const authUsernameInput = document.getElementById('auth-username');
    const authPasswordInput = document.getElementById('auth-password');
    const authConfirmInput = document.getElementById('auth-password-confirm');
    const btnAuthSubmit = document.getElementById('btn-auth-submit');
    const authToggleMode = document.getElementById('auth-toggle-mode');
    
    let isRegisterMode = false;

    // Check persistent developer access
    if (localStorage.getItem('sway_dev_unlocked') === 'true') {
        document.getElementById('nav-editor').classList.remove('hidden');
    }

    const currentUser = window.Storage.getCurrentUser();
    if (!currentUser) {
        authOverlay.classList.remove('hidden');
    } else {
        document.getElementById('settings-username').innerText = currentUser.username;
    }

    authToggleMode.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
            authConfirmInput.classList.remove('hidden');
            btnAuthSubmit.innerText = "Register Profile";
            authToggleMode.innerText = "Already have an account? Login";
        } else {
            authConfirmInput.classList.add('hidden');
            btnAuthSubmit.innerText = "Login";
            authToggleMode.innerText = "Don't have an account? Register";
        }
    });

    btnAuthSubmit.addEventListener('click', async () => {
        const u = authUsernameInput.value;
        const p = authPasswordInput.value;
        if(!u || !p) return alert("Fill in username and password!");

        try {
            if (isRegisterMode) {
                const cp = authConfirmInput.value;
                if(p !== cp) return alert("Passwords do not match!");
                await window.Storage.registerUser(u, p);
            } else {
                await window.Storage.loginUser(u, p);
            }
            authOverlay.classList.add('hidden');
            document.getElementById('settings-username').innerText = u;
            location.reload();
        } catch(err) {
            alert(err.message);
        }
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('sway_current_user');
        location.reload();
    });

    const activeUser = window.Storage.getCurrentUser();
    if (activeUser) {
        setInterval(async () => {
            const invite = await window.Storage.checkPartyInvites(activeUser.username);
            if (invite && invite.status === 'pending') {
                const accept = confirm(`${invite.from} invited you to a Party Session! Accept?`);
                if (accept) {
                    alert("Joined Party Session!");
                    await window.Storage.clearPartyInvite(activeUser.username);
                } else {
                    await window.Storage.clearPartyInvite(activeUser.username);
                }
            }
        }, 5000);
    }

    document.getElementById('btn-send-invite').addEventListener('click', async () => {
        const friendName = document.getElementById('party-friend-input').value;
        if (!friendName) return alert("Enter a username!");
        const me = window.Storage.getCurrentUser().username;
        await window.Storage.sendPartyInvite(friendName, me);
        alert(`Party invitation sent to ${friendName}!`);
        document.getElementById('party-friend-input').value = '';
    });

    const UI = {
        modal: document.getElementById('custom-modal'), title: document.getElementById('modal-title'), desc: document.getElementById('modal-desc'),
        input: document.getElementById('modal-input'), searchWrapper: document.getElementById('modal-search-wrapper'), searchInput: document.getElementById('modal-search-input'),
        list: document.getElementById('modal-list'), btnConfirm: document.getElementById('modal-btn-confirm'), btnCancel: document.getElementById('modal-btn-cancel'),
        allItems: [], resolveFn: null, requireTyping: false,
        
        show(options) {
            return new Promise((resolve) => {
                this.resolveFn = resolve; 
                this.title.innerText = options.title || 'Notice';
                options.desc ? (this.desc.innerText = options.desc, this.desc.classList.remove('hidden')) : this.desc.classList.add('hidden');
                
                this.input.classList.add('hidden'); this.searchWrapper.classList.add('hidden'); this.list.classList.add('hidden');
                this.requireTyping = options.requireTyping || false;

                if(options.type === 'input') {
                    this.input.value = ''; this.input.placeholder = options.placeholder || '...'; this.input.classList.remove('hidden'); 
                } else if(options.type === 'list') {
                    this.allItems = options.items; 
                    this.searchInput.value = ''; this.searchInput.placeholder = options.placeholder || 'Search...';
                    this.searchWrapper.classList.remove('hidden'); this.list.classList.remove('hidden'); 
                    this.requireTyping ? this.list.innerHTML = '<p class="sub-text center mt-4">Type to search...</p>' : this.renderList(this.allItems);
                }
                
                this.modal.classList.remove('hidden');
                this.btnConfirm.onclick = () => { this.hide(); resolve(options.type === 'input' ? this.input.value : true); };
                this.btnCancel.onclick = () => { this.hide(); resolve(null); };
            });
        },
        renderList(items) {
            this.list.innerHTML = '';
            if(items.length === 0) { this.list.innerHTML = '<p class="sub-text center mt-4">No results found.</p>'; return; }
            items.forEach(item => {
                const div = document.createElement('div'); div.className = 'song-card'; div.innerHTML = `<div class="song-info"><h4>${item.label}</h4></div>`;
                div.onclick = () => { this.hide(); this.resolveFn(item.value); }; this.list.appendChild(div);
            });
        },
        hide() { this.modal.classList.add('hidden'); }
    };
    
    UI.searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        if(UI.requireTyping && q.trim() === '') { UI.list.innerHTML = '<p class="sub-text center mt-4">Type to search...</p>'; return; }
        UI.renderList(UI.allItems.filter(item => item.label.toLowerCase().includes(q)));
    });

    const navButtons = document.querySelectorAll('.nav-btn[data-target]');
    const pages = document.querySelectorAll('.page');
    const navigateTo = (pageId) => {
        navButtons.forEach(b => b.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        const btn = document.querySelector(`.nav-btn[data-target="${pageId}"]`);
        if (btn) btn.classList.add('active');
        document.getElementById(pageId).classList.add('active');
    };
    navButtons.forEach(btn => btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-target'))));

    const createSongCard = (song, queue, index, isEditor = false) => {
        const card = document.createElement('div'); card.className = 'song-card';
        card.innerHTML = `<img src="${song.artBase64}"><div class="song-info"><h4>${song.title}</h4><p class="sub-text click-text artist-link">${song.artist}</p></div><button class="icon-btn btn-more" style="color:#888"><svg class="icon"><use href="#icon-more"></use></svg></button>`;
        card.addEventListener('click', (e) => {
            if(e.target.closest('.btn-more')) { 
                e.stopPropagation(); window.ActionSheet.open(song, isEditor); 
            } else if(e.target.closest('.artist-link')) { 
                e.stopPropagation(); openProfile('artist', song.artist); 
            } else { 
                window.Player.playSong(index, queue); 
            }
        });
        return card;
    };

    let allLoadedSongs = [];

    const renderSongs = async () => {
        allLoadedSongs = await window.Storage.getAllSongs();
        const homeList = document.getElementById('home-song-list');
        const editorList = document.getElementById('editor-song-list');
        homeList.innerHTML = ''; editorList.innerHTML = '';
        
        if(allLoadedSongs.length === 0) {
            homeList.innerHTML = '<p class="sub-text center mt-4">No songs in cloud.</p>';
            editorList.innerHTML = '<p class="sub-text center mt-4">No songs in cloud.</p>';
            return;
        }

        const vibes = [...new Set(allLoadedSongs.map(s => s.vibe).filter(v => v !== 'unknown' && v !== ''))];
        const genres = [...new Set(allLoadedSongs.map(s => s.genre).filter(g => g !== 'unknown' && g !== ''))];
        const discoveryTerms = [...new Set([...vibes, ...genres])].slice(0, 15);
        
        const vibeContainer = document.getElementById('genres-list');
        vibeContainer.innerHTML = '';
        discoveryTerms.forEach(term => {
            const pill = document.createElement('div'); pill.className = 'pill'; pill.innerText = term.toUpperCase();
            pill.onclick = () => openProfile('vibe', term);
            vibeContainer.appendChild(pill);
        });

        const reversedSongs = [...allLoadedSongs].reverse();
        reversedSongs.forEach((song, index) => {
            homeList.appendChild(createSongCard(song, reversedSongs, index, false));
            editorList.appendChild(createSongCard(song, reversedSongs, index, true));
        });
    };

    document.getElementById('btn-open-genres').addEventListener('click', () => navigateTo('page-genres'));
    document.getElementById('btn-back-genres').addEventListener('click', () => navigateTo('page-home'));

    document.getElementById('editor-search-input').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const editorList = document.getElementById('editor-song-list');
        editorList.innerHTML = '';
        const filtered = allLoadedSongs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
        filtered.reverse().forEach((song, idx) => { editorList.appendChild(createSongCard(song, filtered, idx, true)); });
    });

    const openProfile = async (type, name) => {
        const allSongs = await window.Storage.getAllSongs();
        let targetSongs = [];
        if (type === 'artist') {
            targetSongs = allSongs.filter(s => s.artist.toLowerCase() === name.toLowerCase());
        } else if (type === 'vibe' || type === 'genre') {
            targetSongs = allSongs.filter(s => s.vibe === name || s.genre === name).sort((a,b) => (b.plays||0) - (a.plays||0));
        }

        document.getElementById('profile-subtitle').innerText = type.toUpperCase();
        document.getElementById('profile-title').innerText = name.toUpperCase();
        
        const list = document.getElementById('profile-song-list'); list.innerHTML = '';
        targetSongs.forEach((song, idx) => list.appendChild(createSongCard(song, targetSongs, idx, false)));
        
        document.getElementById('btn-play-profile').onclick = () => { if(targetSongs.length > 0) window.Player.playSong(0, targetSongs); };
        navigateTo('page-profile');
    };
    
    document.getElementById('btn-back-profile').addEventListener('click', () => navigateTo('page-home'));
    document.getElementById('player-artist').addEventListener('click', (e) => { openProfile('artist', e.target.innerText); });

    document.getElementById('search-input').addEventListener('input', async (e) => {
        const q = e.target.value.toLowerCase();
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = '';
        if (!q) return;
        const songs = await window.Storage.getAllSongs();
        const filtered = songs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || s.genre.includes(q) || s.vibe.includes(q));
        filtered.forEach((song, idx) => searchResults.appendChild(createSongCard(song, filtered, idx, false)));
    });

    window.ActionSheet = {
        sheet: document.getElementById('action-sheet'), currentSong: null,
        open(song, fromEditor = false) {
            this.currentSong = song;
            document.getElementById('sheet-title').innerText = song.title; document.getElementById('sheet-artist').innerText = song.artist;
            document.getElementById('sheet-art').src = song.artBase64 || '';
            const isLiked = window.Storage.isLiked(song.id);
            document.getElementById('sheet-btn-like').innerHTML = `<svg class="icon"><use href="${isLiked ? '#icon-heart-filled' : '#icon-heart-outline'}"></use></svg> <span>${isLiked ? 'Unlike Song' : 'Like Song'}</span>`;
            document.getElementById('sheet-btn-delete').classList.toggle('hidden', !fromEditor);
            this.sheet.classList.remove('hidden');
        },
        close() { this.sheet.classList.add('hidden'); }
    };
    
    document.getElementById('sheet-btn-close').addEventListener('click', () => window.ActionSheet.close());
    document.getElementById('sheet-btn-like').addEventListener('click', () => { window.Storage.toggleLike(window.ActionSheet.currentSong.id); window.ActionSheet.close(); renderSongs(); renderLikedCount(); });
    
    document.getElementById('sheet-btn-artist').addEventListener('click', () => {
        const artist = window.ActionSheet.currentSong.artist;
        window.ActionSheet.close(); openProfile('artist', artist);
    });

    document.getElementById('sheet-btn-party').addEventListener('click', () => {
        const song = window.ActionSheet.currentSong;
        window.ActionSheet.close();
        const partyList = document.getElementById('party-queue-list');
        const card = document.createElement('div'); card.className = 'song-card';
        card.innerHTML = `<img src="${song.artBase64}"><div class="song-info"><h4>${song.title}</h4><p class="sub-text">${song.artist}</p></div>`;
        partyList.appendChild(card);
        alert("Added song to Party Queue!");
    });

    document.getElementById('sheet-btn-share').addEventListener('click', () => {
        const s = window.ActionSheet.currentSong;
        navigator.clipboard.writeText(`${s.title} by ${s.artist} on Sway`);
        window.ActionSheet.close();
        alert("Song info copied to clipboard!");
    });

    document.getElementById('sheet-btn-add').addEventListener('click', async () => {
        window.ActionSheet.close();
        const pls = window.Storage.getPlaylists();
        if(pls.length === 0) return UI.show({ title: 'No Playlists', desc: 'Create a playlist first.' });
        const selectedPlId = await UI.show({ title: 'Add to...', type: 'list', items: pls.map(p => ({ label: p.name, value: p.id })), placeholder: 'Search playlists...' });
        if (selectedPlId) {
            const plIndex = pls.findIndex(p => p.id === selectedPlId);
            if (!pls[plIndex].songIds.includes(window.ActionSheet.currentSong.id)) {
                pls[plIndex].songIds.push(window.ActionSheet.currentSong.id); window.Storage.savePlaylists(pls);
            }
        }
    });
    document.getElementById('sheet-btn-delete').addEventListener('click', async () => {
        window.ActionSheet.close();
        if(await UI.show({ title: 'Delete Song?', desc: 'Remove from Cloud?' })) { await window.Storage.deleteSong(window.ActionSheet.currentSong.id); renderSongs(); }
    });

    const renderLikedCount = () => { document.getElementById('liked-count').innerText = `${window.Storage.getLikedSongs().length} songs`; };

    const renderPlaylists = () => {
        const list = document.getElementById('playlist-list'); list.innerHTML = '';
        window.Storage.getPlaylists().forEach(pl => {
            const card = document.createElement('div'); card.className = 'song-card';
            card.innerHTML = `<div class="icon-wrap"><svg class="icon"><use href="#icon-play"></use></svg></div><div class="song-info"><h4>${pl.name}</h4><p class="sub-text">${pl.songIds.length} songs</p></div>`;
            card.addEventListener('click', () => openPlaylistView(pl.id)); list.appendChild(card);
        });
        renderLikedCount();
    };

    const openPlaylistView = async (id, asLiked = false) => {
        const allSongs = await window.Storage.getAllSongs();
        let targetSongs = []; let title = "";

        if (asLiked) {
            title = "Liked Songs"; targetSongs = allSongs.filter(s => window.Storage.getLikedSongs().includes(s.id));
            document.getElementById('btn-add-to-playlist').classList.add('hidden');
        } else {
            const pl = window.Storage.getPlaylists().find(p => p.id === id);
            title = pl.name; targetSongs = allSongs.filter(s => pl.songIds.includes(s.id));
            const btnAdd = document.getElementById('btn-add-to-playlist');
            btnAdd.classList.remove('hidden');
            btnAdd.onclick = async () => {
                const songIdToAdd = await UI.show({ 
                    title: 'Add Song', type: 'list', 
                    items: allSongs.map(s => ({ label: `${s.title} - ${s.artist}`, value: s.id })), 
                    placeholder: 'Type to search songs...', requireTyping: true 
                });
                if (songIdToAdd && !pl.songIds.includes(songIdToAdd)) {
                    pl.songIds.push(songIdToAdd);
                    const pls = window.Storage.getPlaylists(); pls[pls.findIndex(p => p.id === id)] = pl;
                    window.Storage.savePlaylists(pls); openPlaylistView(id); 
                }
            };
        }
        
        document.getElementById('playlist-list').classList.add('hidden'); document.querySelector('.liked-songs-card').classList.add('hidden');
        document.getElementById('playlist-view').classList.remove('hidden'); document.getElementById('playlist-view-title').innerText = title;
        document.getElementById('btn-play-playlist').onclick = () => { if(targetSongs.length > 0) window.Player.playSong(0, targetSongs); };

        const viewList = document.getElementById('playlist-view-songs'); viewList.innerHTML = '';
        targetSongs.forEach((song, idx) => viewList.appendChild(createSongCard(song, targetSongs, idx, false)));
    };

    document.getElementById('btn-open-liked').addEventListener('click', () => openPlaylistView(null, true));
    document.getElementById('btn-create-playlist').addEventListener('click', async () => {
        const name = await UI.show({ title: 'New Playlist', type: 'input', placeholder: 'Playlist Name' });
        if (name) {
            const pls = window.Storage.getPlaylists(); pls.push({ id: Date.now().toString(), name, songIds: [] });
            window.Storage.savePlaylists(pls); renderPlaylists();
        }
    });
    document.getElementById('btn-back-playlists').addEventListener('click', () => {
        document.getElementById('playlist-list').classList.remove('hidden'); document.querySelector('.liked-songs-card').classList.remove('hidden');
        document.getElementById('playlist-view').classList.add('hidden'); renderPlaylists();
    });

    document.getElementById('btn-save-song').addEventListener('click', async () => {
        const audioFile = document.getElementById('edit-audio').files[0];
        const artFile = document.getElementById('edit-art').files[0];
        const title = document.getElementById('edit-title').value;
        const artist = document.getElementById('edit-artist').value;
        const genre = document.getElementById('edit-genre').value;
        const vibe = document.getElementById('edit-vibe').value;

        if (!audioFile || !title) return UI.show({ title: 'Error', desc: 'Audio and Title required.' });

        let artBase64 = '';
        if (artFile) {
            const reader = new FileReader();
            artBase64 = await new Promise(res => { reader.onload = e => res(e.target.result); reader.readAsDataURL(artFile); });
        }

        UI.show({ title: 'Uploading...', desc: 'Sending to Cloud. Please wait...', type: 'notice' });

        try {
            await window.Storage.saveSong({ id: Date.now().toString(), title, artist: artist || 'Unknown', genre: genre || 'unknown', vibe: vibe || 'unknown', audioFile, artBase64 });
            UI.show({ title: 'Success', desc: 'Added to Cloud Database!' });
            ['edit-audio', 'edit-art', 'edit-title', 'edit-artist', 'edit-genre', 'edit-vibe'].forEach(id => document.getElementById(id).value = '');
            renderSongs();
        } catch(err) {
            UI.show({ title: 'Upload Failed', desc: 'Check connection.' });
        }
    });

    document.getElementById('btn-dev-access').addEventListener('click', async () => {
        const code = await UI.show({ title: 'Developer Login', type: 'input', placeholder: 'Code' });
        if (code === "1313dev") { 
            localStorage.setItem('sway_dev_unlocked', 'true');
            document.getElementById('nav-editor').classList.remove('hidden'); 
            UI.show({ title: 'Unlocked' }); 
        }
    });

    await renderSongs(); renderPlaylists();
});
