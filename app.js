document.addEventListener('DOMContentLoaded', async () => {
    
    if (localStorage.getItem('sway_dev_unlocked') === 'true') {
        const navEditor = document.getElementById('nav-editor');
        if(navEditor) navEditor.classList.remove('hidden');
    }

    let devTapCount = 0;
    const devTrigger = document.getElementById('settings-brand-trigger');
    if(devTrigger) {
        devTrigger.addEventListener('click', async () => {
            devTapCount++;
            if(devTapCount >= 5) {
                devTapCount = 0;
                const code = await UI.show({ title: 'Studio Master Cipher', type: 'input', placeholder: 'Enter code...' });
                if (code === "1313dev") { 
                    localStorage.setItem('sway_dev_unlocked', 'true');
                    const navEditor = document.getElementById('nav-editor');
                    if(navEditor) navEditor.classList.remove('hidden'); 
                    UI.show({ title: 'Studio Access Granted' }); 
                }
            }
        });
    }

    const smartPlayToggle = document.getElementById('setting-smart-play');
    if(smartPlayToggle) {
        smartPlayToggle.addEventListener('change', (e) => {
            if(window.Player) {
                window.Player.smartPlayEnabled = e.target.checked;
            }
        });
    }

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
                    this.searchInput.value = ''; this.searchInput.placeholder = options.placeholder || 'Search track...';
                    this.searchWrapper.classList.remove('hidden'); this.list.classList.remove('hidden'); 
                    this.renderList(this.allItems);
                }
                
                this.modal.classList.remove('hidden');
                this.btnConfirm.onclick = () => { this.hide(); resolve(options.type === 'input' ? this.input.value : true); };
                this.btnCancel.onclick = () => { this.hide(); resolve(null); };
            });
        },
        renderList(items) {
            this.list.innerHTML = '';
            if(items.length === 0) { this.list.innerHTML = '<p class="sub-caption center mt-4" style="color:#004741;">No results found.</p>'; return; }
            items.forEach(item => {
                const div = document.createElement('div'); div.className = 'song-card'; div.innerHTML = `<div class="song-info"><h4>${item.label}</h4></div>`;
                div.onclick = () => { this.hide(); this.resolveFn(item.value); }; this.list.appendChild(div);
            });
        },
        hide() { this.modal.classList.add('hidden'); }
    };
    
    if(UI.searchInput) {
        UI.searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            UI.renderList(UI.allItems.filter(item => item.label.toLowerCase().includes(q)));
        });
    }

    const navButtons = document.querySelectorAll('.nav-btn[data-target]');
    const pages = document.querySelectorAll('.page');
    const navigateTo = (pageId) => {
        navButtons.forEach(b => b.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        const btn = document.querySelector(`.nav-btn[data-target="${pageId}"]`);
        if (btn) btn.classList.add('active');
        const targetPage = document.getElementById(pageId);
        if(targetPage) targetPage.classList.add('active');
    };
    navButtons.forEach(btn => btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-target'))));

    const createSongCard = (song, queue, index, isEditor = false) => {
        const card = document.createElement('div'); card.className = 'song-card';
        card.innerHTML = `
            <img src="${song.artBase64 || ''}" alt="Cover">
            <div class="song-info">
                <h4>${song.title}</h4>
                <p class="sub-caption click-text artist-link">${song.artist}</p>
            </div>
            <button class="icon-btn btn-more" style="color:#004741">
                <svg class="icon"><use href="#icon-more"></use></svg>
            </button>`;
        
        card.addEventListener('click', (e) => {
            if(e.target.closest('.btn-more')) { 
                e.stopPropagation(); 
                window.ActionSheet.open(song, isEditor); 
            } else if(e.target.closest('.artist-link')) { 
                e.stopPropagation(); 
                openProfile('artist', song.artist); 
            } else { 
                window.Player.playSong(index, queue); 
            }
        });
        return card;
    };

    let allLoadedSongs = [];
    let activePlaylistId = null;

    window.renderSongs = async function() {
        allLoadedSongs = await window.Storage.getAllSongs();
        
        if(window.Player && typeof window.Player.setDatabase === 'function') {
            window.Player.setDatabase(allLoadedSongs);
        }

        const homeList = document.getElementById('home-song-list');
        const trendingList = document.getElementById('trending-song-list');
        const editorList = document.getElementById('editor-song-list');
        
        if(homeList) homeList.innerHTML = ''; 
        if(trendingList) trendingList.innerHTML = '';
        if(editorList) editorList.innerHTML = '';
        
        if(allLoadedSongs.length === 0) {
            if(homeList) homeList.innerHTML = '<p class="sub-caption center mt-4" style="color:#8CA8A3;">No tracks available.</p>';
            if(trendingList) trendingList.innerHTML = '<p class="sub-caption center mt-4" style="color:#8CA8A3;">No trending tracks.</p>';
            if(editorList) editorList.innerHTML = '<p class="sub-caption center mt-4" style="color:#004741;">No tracks available.</p>';
            return;
        }

        const sortedByPlays = [...allLoadedSongs].sort((a, b) => (b.plays || 0) - (a.plays || 0));
        sortedByPlays.slice(0, 3).forEach((song, idx) => {
            if(trendingList) trendingList.appendChild(createSongCard(song, sortedByPlays, idx, false));
        });

        const vibes = [...new Set(allLoadedSongs.map(s => s.vibe).filter(v => v && v !== 'unknown'))];
        const genres = [...new Set(allLoadedSongs.map(s => s.genre).filter(g => g && g !== 'unknown'))];
        const discoveryTerms = [...new Set([...vibes, ...genres])].slice(0, 15);
        
        const vibeContainer = document.getElementById('genres-list');
        if(vibeContainer) {
            vibeContainer.innerHTML = '';
            discoveryTerms.forEach(term => {
                const pill = document.createElement('div'); pill.className = 'pill'; pill.innerText = term.toUpperCase();
                pill.onclick = () => openProfile('vibe', term);
                vibeContainer.appendChild(pill);
            });
        }

        const reversedSongs = [...allLoadedSongs].reverse();
        reversedSongs.forEach((song, index) => {
            if(homeList) homeList.appendChild(createSongCard(song, reversedSongs, index, false));
            if(editorList) editorList.appendChild(createSongCard(song, reversedSongs, index, true));
        });
    }

    const genresBtn = document.getElementById('btn-open-genres');
    if(genresBtn) genresBtn.addEventListener('click', () => navigateTo('page-genres'));
    const backGenresBtn = document.getElementById('btn-back-genres');
    if(backGenresBtn) backGenresBtn.addEventListener('click', () => navigateTo('page-home'));

    const editorSearch = document.getElementById('editor-search-input');
    if(editorSearch) {
        editorSearch.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const editorList = document.getElementById('editor-song-list');
            if(!editorList) return;
            editorList.innerHTML = '';
            const filtered = allLoadedSongs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
            filtered.reverse().forEach((song, idx) => { 
                const card = createSongCard(song, filtered, idx, true);
                card.addEventListener('click', (ev) => {
                    ev.stopImmediatePropagation();
                    if(!ev.target.closest('.btn-more') && !ev.target.closest('.artist-link')) {
                        openSubEditor(song);
                    }
                }, true);
                editorList.appendChild(card); 
            });
        });
    }

    const openSubEditor = (song) => {
        document.getElementById('sub-editor-panel').classList.remove('hidden');
        document.getElementById('sub-edit-id').value = song.id;
        document.getElementById('sub-edit-title').value = song.title || '';
        document.getElementById('sub-edit-artist').value = song.artist || '';
        document.getElementById('sub-edit-language').value = song.language || '';
        document.getElementById('sub-edit-genre').value = song.genre || '';
        document.getElementById('sub-edit-vibe').value = song.vibe || '';
    };

    const subUpdateBtn = document.getElementById('sub-btn-update');
    if(subUpdateBtn) {
        subUpdateBtn.addEventListener('click', async () => {
            const id = document.getElementById('sub-edit-id').value;
            const updated = {
                id,
                title: document.getElementById('sub-edit-title').value,
                artist: document.getElementById('sub-edit-artist').value,
                language: document.getElementById('sub-edit-language').value,
                genre: document.getElementById('sub-edit-genre').value,
                vibe: document.getElementById('sub-edit-vibe').value
            };
            await window.Storage.updateSongMeta(updated);
            document.getElementById('sub-editor-panel').classList.add('hidden');
            alert('Metadata updated successfully.');
            window.renderSongs();
        });
    }

    const subDeleteBtn = document.getElementById('sub-btn-delete');
    if(subDeleteBtn) {
        subDeleteBtn.addEventListener('click', async () => {
            const id = document.getElementById('sub-edit-id').value;
            if(confirm('Permanently delete track from database?')) {
                await window.Storage.deleteSong(id);
                document.getElementById('sub-editor-panel').classList.add('hidden');
                window.renderSongs();
            }
        });
    }

    const openProfile = async (type, name) => {
        const allSongs = await window.Storage.getAllSongs();
        let targetSongs = [];
        if (type === 'artist') {
            targetSongs = allSongs.filter(s => s.artist.toLowerCase().includes(name.toLowerCase()));
        } else if (type === 'vibe' || type === 'genre') {
            targetSongs = allSongs.filter(s => s.vibe === name || s.genre === name).sort((a,b) => (b.plays||0) - (a.plays||0));
        }

        document.getElementById('profile-subtitle').innerText = type.toUpperCase();
        document.getElementById('profile-title').innerText = name.toUpperCase();
        
        const list = document.getElementById('profile-song-list'); 
        if(list) {
            list.innerHTML = '';
            targetSongs.forEach((song, idx) => list.appendChild(createSongCard(song, targetSongs, idx, false)));
        }
        
        const playProfBtn = document.getElementById('btn-play-profile');
        if(playProfBtn) playProfBtn.onclick = () => { if(targetSongs.length > 0) window.Player.playSong(0, targetSongs); };
        navigateTo('page-profile');
    };
    
    const backProfileBtn = document.getElementById('btn-back-profile');
    if(backProfileBtn) backProfileBtn.addEventListener('click', () => navigateTo('page-home'));

    const searchInputEl = document.getElementById('search-input');
    if(searchInputEl) {
        searchInputEl.addEventListener('input', async (e) => {
            const q = e.target.value.toLowerCase();
            const searchResults = document.getElementById('search-results');
            if(!searchResults) return;
            searchResults.innerHTML = '';
            if (!q) return;
            const songs = await window.Storage.getAllSongs();
            const filtered = songs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || s.genre.includes(q) || s.vibe.includes(q));
            filtered.forEach((song, idx) => searchResults.appendChild(createSongCard(song, filtered, idx, false)));
        });
    }

    window.ActionSheet = {
        sheet: document.getElementById('action-sheet'), currentSong: null,
        open(song, fromEditor = false) {
            this.currentSong = song;
            document.getElementById('sheet-title').innerText = song.title; 
            document.getElementById('sheet-artist').innerText = song.artist;
            document.getElementById('sheet-art').src = song.artBase64 || '';
            const isLiked = window.Storage.isLiked(song.id);
            document.getElementById('sheet-btn-like').innerHTML = `<svg class="icon"><use href="${isLiked ? '#icon-heart-filled' : '#icon-heart-outline'}"></use></svg> <span>${isLiked ? 'Unlike Track' : 'Like Track'}</span>`;
            document.getElementById('sheet-btn-delete').classList.toggle('hidden', !fromEditor);
            this.sheet.classList.remove('hidden');
        },
        close() { this.sheet.classList.add('hidden'); }
    };
    
    const sheetClose = document.getElementById('sheet-btn-close');
    if(sheetClose) sheetClose.addEventListener('click', () => window.ActionSheet.close());
    const sheetLike = document.getElementById('sheet-btn-like');
    if(sheetLike) sheetLike.addEventListener('click', () => { window.Storage.toggleLike(window.ActionSheet.currentSong.id); window.ActionSheet.close(); window.renderSongs(); renderLikedCount(); });
    
    const sheetArtist = document.getElementById('sheet-btn-artist');
    if(sheetArtist) {
        sheetArtist.addEventListener('click', () => {
            const artist = window.ActionSheet.currentSong.artist;
            window.ActionSheet.close(); openProfile('artist', artist);
        });
    }

    const sheetShare = document.getElementById('sheet-btn-share');
    if(sheetShare) {
        sheetShare.addEventListener('click', () => {
            const s = window.ActionSheet.currentSong;
            navigator.clipboard.writeText(`${s.title} by ${s.artist} on Sway`);
            window.ActionSheet.close();
            alert("Track info copied.");
        });
    }

    const sheetAdd = document.getElementById('sheet-btn-add');
    if(sheetAdd) {
        sheetAdd.addEventListener('click', async () => {
            window.ActionSheet.close();
            const pls = window.Storage.getPlaylists();
            if(pls.length === 0) return UI.show({ title: 'No Playlists Found', desc: 'Create a playlist first.' });
            const selectedPlId = await UI.show({ title: 'Add to Playlist', type: 'list', items: pls.map(p => ({ label: p.name, value: p.id })) });
            if (selectedPlId) {
                const plIndex = pls.findIndex(p => p.id === selectedPlId);
                if (!pls[plIndex].songIds.includes(window.ActionSheet.currentSong.id)) {
                    pls[plIndex].songIds.push(window.ActionSheet.currentSong.id); 
                    window.Storage.savePlaylists(pls);
                    alert('Added to playlist successfully.');
                }
            }
        });
    }

    const sheetDel = document.getElementById('sheet-btn-delete');
    if(sheetDel) {
        sheetDel.addEventListener('click', async () => {
            window.ActionSheet.close();
            if(await UI.show({ title: 'Delete Track?', desc: 'Permanently remove track?' })) { 
                await window.Storage.deleteSong(window.ActionSheet.currentSong.id); 
                window.renderSongs(); 
            }
        });
    }

    const renderLikedCount = () => { 
        const count = window.Storage.getLikedSongs().length; 
        const likedCountEl = document.getElementById('liked-count');
        if(likedCountEl) likedCountEl.innerText = `${count} tracks`; 
    };

    const renderPlaylists = () => {
        const list = document.getElementById('playlist-list'); 
        if(!list) return;
        list.innerHTML = '';
        window.Storage.getPlaylists().forEach(pl => {
            const card = document.createElement('div'); card.className = 'song-card';
            card.innerHTML = `<div class="icon-box" style="width:40px;height:40px;background:#004741;display:flex;align-items:center;justify-content:center;border-radius:10px;color:#F0EDE4;"><svg class="icon"><use href="#icon-play"></use></svg></div><div class="song-info"><h4>${pl.name}</h4><p class="sub-caption">${pl.songIds.length} tracks</p></div>`;
            card.addEventListener('click', () => openPlaylistView(pl.id)); list.appendChild(card);
        });
        renderLikedCount();
    };

    const openPlaylistView = async (id, asLiked = false) => {
        activePlaylistId = asLiked ? null : id;
        const allSongs = await window.Storage.getAllSongs();
        let targetSongs = []; let title = "";

        const btnRename = document.getElementById('btn-rename-playlist');
        const btnDeletePl = document.getElementById('btn-delete-playlist');

        if (asLiked) {
            title = "Liked Songs"; targetSongs = allSongs.filter(s => window.Storage.getLikedSongs().includes(s.id));
            const btnAddPl = document.getElementById('btn-add-to-playlist');
            if(btnAddPl) btnAddPl.classList.add('hidden');
            if(btnRename) btnRename.classList.add('hidden');
            if(btnDeletePl) btnDeletePl.classList.add('hidden');
        } else {
            const pls = window.Storage.getPlaylists();
            const pl = pls.find(p => p.id === id);
            if (!pl) return;
            title = pl.name; targetSongs = allSongs.filter(s => pl.songIds.includes(s.id));
            const btnAdd = document.getElementById('btn-add-to-playlist');
            if(btnAdd) btnAdd.classList.remove('hidden');
            if(btnRename) btnRename.classList.remove('hidden');
            if(btnDeletePl) btnDeletePl.classList.remove('hidden');

            if(btnAdd) {
                btnAdd.onclick = async () => {
                    const songIdToAdd = await UI.show({ 
                        title: 'Select Track to Add', type: 'list', 
                        items: allSongs.map(s => ({ label: `${s.title} - ${s.artist}`, value: s.id }))
                    });
                    if (songIdToAdd && !pl.songIds.includes(songIdToAdd)) {
                        pl.songIds.push(songIdToAdd);
                        const updatedPls = window.Storage.getPlaylists();
                        const idx = updatedPls.findIndex(p => p.id === id);
                        if(idx !== -1) {
                            updatedPls[idx] = pl;
                            window.Storage.savePlaylists(updatedPls);
                            openPlaylistView(id); 
                        }
                    }
                };
            }
        }
        
        const playlistListEl = document.getElementById('playlist-list');
        const likedCardEl = document.querySelector('.liked-collection-card');
        const playlistViewEl = document.getElementById('playlist-view');
        
        if(playlistListEl) playlistListEl.classList.add('hidden'); 
        if(likedCardEl) likedCardEl.classList.add('hidden');
        if(playlistViewEl) playlistViewEl.classList.remove('hidden'); 
        
        const pvTitle = document.getElementById('playlist-view-title');
        if(pvTitle) pvTitle.innerText = title;

        const btnPlayPl = document.getElementById('btn-play-playlist');
        if(btnPlayPl) btnPlayPl.onclick = () => { if(targetSongs.length > 0) window.Player.playSong(0, targetSongs); };

        const viewList = document.getElementById('playlist-view-songs'); 
        if(viewList) {
            viewList.innerHTML = '';
            targetSongs.forEach((song, idx) => viewList.appendChild(createSongCard(song, targetSongs, idx, false)));
        }
    };

    const btnRename = document.getElementById('btn-rename-playlist');
    if(btnRename) {
        btnRename.onclick = async () => {
            if(!activePlaylistId) return;
            const newName = await UI.show({ title: 'Rename Playlist', type: 'input', placeholder: 'New playlist name...' });
            if(newName && newName.trim() !== '') {
                const pls = window.Storage.getPlaylists();
                const idx = pls.findIndex(p => p.id === activePlaylistId);
                if(idx !== -1) {
                    pls[idx].name = newName.trim();
                    window.Storage.savePlaylists(pls);
                    const pvTitle = document.getElementById('playlist-view-title');
                    if(pvTitle) pvTitle.innerText = pls[idx].name;
                    alert('Playlist renamed successfully.');
                }
            }
        };
    }

    const btnDeletePl = document.getElementById('btn-delete-playlist');
    if(btnDeletePl) {
        btnDeletePl.onclick = async () => {
            if(!activePlaylistId) return;
            if(confirm('Are you sure you want to delete this playlist?')) {
                let pls = window.Storage.getPlaylists();
                pls = pls.filter(p => p.id !== activePlaylistId);
                window.Storage.savePlaylists(pls);
                document.getElementById('playlist-list').classList.remove('hidden'); 
                document.querySelector('.liked-collection-card').classList.remove('hidden');
                document.getElementById('playlist-view').classList.add('hidden');
                activePlaylistId = null;
                renderPlaylists();
            }
        };
    }

    const btnOpenLiked = document.getElementById('btn-open-liked');
    if(btnOpenLiked) btnOpenLiked.addEventListener('click', () => openPlaylistView(null, true));
    
    const btnCreatePl = document.getElementById('btn-create-playlist');
    if(btnCreatePl) {
        btnCreatePl.addEventListener('click', async () => {
            const name = await UI.show({ title: 'New Playlist', type: 'input', placeholder: 'Playlist name...' });
            if (name) {
                const pls = window.Storage.getPlaylists(); pls.push({ id: Date.now().toString(), name, songIds: [] });
                window.Storage.savePlaylists(pls); renderPlaylists();
            }
        });
    }

    const btnBackPlaylists = document.getElementById('btn-back-playlists');
    if(btnBackPlaylists) {
        btnBackPlaylists.addEventListener('click', () => {
            document.getElementById('playlist-list').classList.remove('hidden'); 
            document.querySelector('.liked-collection-card').classList.remove('hidden');
            document.getElementById('playlist-view').classList.add('hidden'); 
            activePlaylistId = null; 
            renderPlaylists();
        });
    }

    const btnAddArtistField = document.getElementById('btn-add-artist-field');
    if(btnAddArtistField) {
        btnAddArtistField.addEventListener('click', () => {
            const container = document.getElementById('artist-inputs-container');
            const input = document.createElement('input');
            input.type = "text";
            input.placeholder = "Collaborating Artist";
            input.className = "sand-input artist-input";
            input.style.marginTop = "6px";
            container.appendChild(input);
        });
    }

    const btnTabAdd = document.getElementById('btn-tab-add');
    const btnTabEdit = document.getElementById('btn-tab-edit');
    if(btnTabAdd && btnTabEdit) {
        btnTabAdd.addEventListener('click', () => {
            btnTabAdd.className = 'action-pill-btn primary';
            btnTabEdit.className = 'action-pill-btn';
            document.getElementById('editor-add-section').classList.remove('hidden');
            document.getElementById('editor-manage-section').classList.add('hidden');
            document.getElementById('sub-editor-panel').classList.add('hidden');
        });
        btnTabEdit.addEventListener('click', () => {
            btnTabEdit.className = 'action-pill-btn primary';
            btnTabAdd.className = 'action-pill-btn';
            document.getElementById('editor-manage-section').classList.remove('hidden');
            document.getElementById('editor-add-section').classList.add('hidden');
            window.renderSongs();
        });
    }

    const btnSaveSong = document.getElementById('btn-save-song');
    if(btnSaveSong) {
        btnSaveSong.addEventListener('click', async () => {
            const audioFile = document.getElementById('edit-audio').files[0];
            const artFile = document.getElementById('edit-art').files[0];
            const title = document.getElementById('edit-title').value;
            const language = document.getElementById('edit-language').value;
            const genre = document.getElementById('edit-genre').value;
            const vibe = document.getElementById('edit-vibe').value;

            const artistInputs = document.querySelectorAll('.artist-input');
            const artists = Array.from(artistInputs).map(i => i.value.trim()).filter(Boolean);
            const artist = artists.length > 0 ? artists.join(', ') : 'Unknown';

            if (!audioFile || !title) return alert('Audio file and Track Title are required.');

            btnSaveSong.disabled = true;

            try {
                let artBase64 = '';
                if (artFile) {
                    const reader = new FileReader();
                    artBase64 = await new Promise(res => { reader.onload = e => res(e.target.result); reader.readAsDataURL(artFile); });
                }

                await window.Storage.saveSong({ 
                    id: Date.now().toString(), 
                    title, 
                    artist, 
                    language: language || 'Unknown',
                    genre: genre || 'unknown', 
                    vibe: vibe || 'unknown', 
                    audioFile, 
                    artBase64 
                }, (progress) => {
                    btnSaveSong.innerText = `Uploading: ${progress.loadedMB}MB / ${progress.totalMB}MB (${progress.percent}%)`;
                });

                alert('Track successfully published.');
                ['edit-audio', 'edit-art', 'edit-title', 'edit-language', 'edit-genre', 'edit-vibe'].forEach(id => {
                    const el = document.getElementById(id);
                    if(el) el.value = '';
                });
                window.renderSongs();
            } catch(err) {
                alert('Upload Failed: ' + err.message);
            } finally {
                btnSaveSong.innerText = "Upload to Cloud Database";
                btnSaveSong.disabled = false;
            }
        });
    }

    const btnClearCache = document.getElementById('btn-clear-cache');
    if(btnClearCache) {
        btnClearCache.addEventListener('click', () => {
            if(confirm('Clear local song cache?')) {
                localStorage.removeItem('sway_global_songs');
                alert('Cache cleared.');
                window.renderSongs();
            }
        });
    }

    const btnExportData = document.getElementById('btn-export-data');
    if(btnExportData) {
        btnExportData.addEventListener('click', () => {
            const data = { playlists: window.Storage.getPlaylists(), likes: window.Storage.getLikedSongs() };
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'sway-backup.json'; a.click();
        });
    }

    await window.renderSongs(); 
    renderPlaylists();
});
