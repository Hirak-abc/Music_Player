(() => {
  const audio = document.getElementById('audio');
  const fileInput = document.getElementById('fileInput');
  const folderInput = document.getElementById('folderInput');
  const playlistList = document.getElementById('playlistList');
  const trackList = document.getElementById('trackList');
  const playlistNameInput = document.getElementById('playlistName');
  const createPlaylistBtn = document.getElementById('createPlaylistBtn');
  const currentTrackLabel = document.getElementById('currentTrack');
  const currentTimeLabel = document.getElementById('currentTime');
  const totalTimeLabel = document.getElementById('totalTime');
  const playlistTitle = document.getElementById('playlistTitle');
  const playlistMeta = document.getElementById('playlistMeta');

  const playPauseBtn = document.getElementById('playPauseBtn');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const stopBtn = document.getElementById('stopBtn');
  const seekBar = document.getElementById('seekBar');
  const volumeSlider = document.getElementById('volume');
  const seekForwardBtn = document.getElementById('seekForwardBtn');
  const seekBackBtn = document.getElementById('seekBackBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const repeatBtn = document.getElementById('repeatBtn');
  const repeatLabel = document.getElementById('repeatLabel');

  const SUPPORTED_EXT = ['mp3', 'wav', 'aac'];
  const REPEAT_MODES = ['off', 'one', 'all'];

  let playlists = [];
  let selectedPlaylistId = null;
  let currentTrackIndex = -1;
  let shuffleEnabled = false;
  let repeatMode = 'off';
  let shuffleHistory = [];

  function init() {
    createPlaylist('All Tracks', true);
    bindEvents();
    volumeSlider.value = audio.volume;
    renderPlaylists();
  }

  function createPlaylist(name, select = false) {
    const id = crypto.randomUUID();
    playlists.push({ id, name: name.trim() || 'Untitled', tracks: [] });
    if (select || !selectedPlaylistId) {
      selectedPlaylistId = id;
      currentTrackIndex = -1;
    }
    renderPlaylists();
    renderTracks();
    return id;
  }

  function getSelectedPlaylist() {
    return playlists.find((p) => p.id === selectedPlaylistId);
  }

  function bindEvents() {
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    folderInput.addEventListener('change', (e) => handleFiles(e.target.files));

    createPlaylistBtn.addEventListener('click', () => {
      if (!playlistNameInput.value.trim()) return;
      createPlaylist(playlistNameInput.value, true);
      playlistNameInput.value = '';
    });

    playPauseBtn.addEventListener('click', togglePlayPause);
    nextBtn.addEventListener('click', () => playNext());
    prevBtn.addEventListener('click', () => playPrevious());
    stopBtn.addEventListener('click', stopPlayback);
    seekForwardBtn.addEventListener('click', () => seekBy(10));
    seekBackBtn.addEventListener('click', () => seekBy(-10));

    seekBar.addEventListener('input', handleSeek);
    volumeSlider.addEventListener('input', (e) => {
      audio.volume = Number(e.target.value);
    });

    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', cycleRepeatMode);

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
  }

  function handleFiles(fileList) {
    const playlist = getSelectedPlaylist();
    if (!playlist) return;
    const audioFiles = Array.from(fileList).filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext && SUPPORTED_EXT.includes(ext);
    });

    audioFiles.forEach((file) => {
      const track = {
        id: crypto.randomUUID(),
        name: file.name,
        file,
        url: URL.createObjectURL(file),
      };
      playlist.tracks.push(track);
    });

    renderTracks();
    renderPlaylists();
  }

  function renderPlaylists() {
    playlistList.innerHTML = '';
    playlists.forEach((playlist) => {
      const li = document.createElement('li');
      li.className = playlist.id === selectedPlaylistId ? 'active' : '';
      const name = document.createElement('span');
      name.textContent = `${playlist.name} (${playlist.tracks.length})`;
      name.className = 'track-title';

      const actions = document.createElement('div');
      actions.className = 'track-actions';

      const selectBtn = document.createElement('button');
      selectBtn.className = 'btn-small';
      selectBtn.textContent = 'Open';
      selectBtn.addEventListener('click', () => {
        selectedPlaylistId = playlist.id;
        currentTrackIndex = -1;
        shuffleHistory = [];
        renderPlaylists();
        renderTracks();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-small';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deletePlaylist(playlist.id));

      actions.append(selectBtn, deleteBtn);
      li.append(name, actions);
      playlistList.appendChild(li);
    });
  }

  function deletePlaylist(id) {
    if (playlists.length === 1) return; // keep at least one
    playlists = playlists.filter((p) => p.id !== id);
    if (selectedPlaylistId === id) {
      selectedPlaylistId = playlists[0]?.id || null;
      currentTrackIndex = -1;
    }
    renderPlaylists();
    renderTracks();
  }

  function renderTracks() {
    const playlist = getSelectedPlaylist();
    if (!playlist) return;
    playlistTitle.textContent = playlist.name;
    playlistMeta.textContent = `${playlist.tracks.length} track${playlist.tracks.length === 1 ? '' : 's'}`;

    trackList.innerHTML = '';
    playlist.tracks.forEach((track, index) => {
      const li = document.createElement('li');
      li.draggable = true;
      li.dataset.index = index;
      li.className = index === currentTrackIndex ? 'active' : '';

      const title = document.createElement('span');
      title.textContent = track.name;
      title.className = 'track-title';
      title.addEventListener('click', () => playTrack(index));

      const actions = document.createElement('div');
      actions.className = 'track-actions';

      const playBtn = document.createElement('button');
      playBtn.className = 'icon-btn';
      playBtn.textContent = '▶️';
      playBtn.title = 'Play';
      playBtn.addEventListener('click', () => playTrack(index));

      const removeBtn = document.createElement('button');
      removeBtn.className = 'icon-btn';
      removeBtn.textContent = '🗑';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeTrack(index);
      });

      actions.append(playBtn, removeBtn);
      li.append(title, actions);
      addDragHandlers(li);
      trackList.appendChild(li);
    });
  }

  function addDragHandlers(li) {
    li.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', li.dataset.index);
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      li.classList.add('active');
    });

    li.addEventListener('dragleave', () => li.classList.remove('active'));

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('active');
      const from = Number(e.dataTransfer.getData('text/plain'));
      const to = Number(li.dataset.index);
      reorderTracks(from, to);
    });
  }

  function reorderTracks(from, to) {
    const playlist = getSelectedPlaylist();
    if (!playlist || from === to) return;
    const [moved] = playlist.tracks.splice(from, 1);
    playlist.tracks.splice(to, 0, moved);
    if (currentTrackIndex === from) currentTrackIndex = to;
    renderTracks();
  }

  function removeTrack(index) {
    const playlist = getSelectedPlaylist();
    if (!playlist) return;
    playlist.tracks.splice(index, 1);
    if (index === currentTrackIndex) {
      stopPlayback();
      currentTrackIndex = -1;
    } else if (index < currentTrackIndex) {
      currentTrackIndex -= 1;
    }
    renderTracks();
    renderPlaylists();
  }

  function playTrack(index) {
    const playlist = getSelectedPlaylist();
    if (!playlist || !playlist.tracks[index]) return;
    currentTrackIndex = index;
    const track = playlist.tracks[index];
    audio.src = track.url;
    audio.play();
    currentTrackLabel.textContent = track.name;
    playPauseBtn.textContent = '⏸';
    renderTracks();
  }

  function togglePlayPause() {
    if (!audio.src) {
      const playlist = getSelectedPlaylist();
      if (playlist?.tracks.length) {
        playTrack(0);
      }
      return;
    }
    if (audio.paused) {
      audio.play();
      playPauseBtn.textContent = '⏸';
    } else {
      audio.pause();
      playPauseBtn.textContent = '▶️';
    }
  }

  function playNext() {
    const playlist = getSelectedPlaylist();
    if (!playlist) return;
    if (repeatMode === 'one') {
      audio.currentTime = 0;
      audio.play();
      return;
    }

    if (shuffleEnabled && playlist.tracks.length > 1) {
      const nextIndex = getRandomIndex(playlist.tracks.length, currentTrackIndex);
      shuffleHistory.push(currentTrackIndex);
      playTrack(nextIndex);
      return;
    }

    const nextIndex = currentTrackIndex + 1;
    if (nextIndex < playlist.tracks.length) {
      playTrack(nextIndex);
    } else if (repeatMode === 'all' && playlist.tracks.length) {
      playTrack(0);
    } else {
      stopPlayback();
    }
  }

  function playPrevious() {
    const playlist = getSelectedPlaylist();
    if (!playlist) return;

    if (shuffleEnabled && shuffleHistory.length) {
      const prevIndex = shuffleHistory.pop();
      playTrack(prevIndex);
      return;
    }

    const prevIndex = currentTrackIndex - 1;
    if (prevIndex >= 0) {
      playTrack(prevIndex);
    } else if (repeatMode === 'all' && playlist.tracks.length) {
      playTrack(playlist.tracks.length - 1);
    }
  }

  function stopPlayback() {
    audio.pause();
    audio.currentTime = 0;
    playPauseBtn.textContent = '▶️';
  }

  function seekBy(seconds) {
    if (!audio.src) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
  }

  function handleSeek(e) {
    if (!audio.duration) return;
    const pct = Number(e.target.value) / 100;
    audio.currentTime = pct * audio.duration;
  }

  function updateProgress() {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    seekBar.value = pct;
    currentTimeLabel.textContent = formatTime(audio.currentTime);
  }

  function updateDuration() {
    totalTimeLabel.textContent = formatTime(audio.duration);
  }

  function handleEnded() {
    playNext();
  }

  function toggleShuffle() {
    shuffleEnabled = !shuffleEnabled;
    shuffleBtn.classList.toggle('active', shuffleEnabled);
    shuffleHistory = [];
  }

  function cycleRepeatMode() {
    const currentIndex = REPEAT_MODES.indexOf(repeatMode);
    repeatMode = REPEAT_MODES[(currentIndex + 1) % REPEAT_MODES.length];
    repeatLabel.textContent = repeatMode === 'one' ? '🔂' : '🔁';
    repeatBtn.title = `Repeat: ${repeatMode}`;
  }

  function formatTime(sec = 0) {
    const minutes = Math.floor(sec / 60) || 0;
    const seconds = Math.floor(sec % 60) || 0;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function getRandomIndex(length, exclude) {
    if (length <= 1) return 0;
    let idx = Math.floor(Math.random() * length);
    if (idx === exclude) {
      idx = (idx + 1) % length;
    }
    return idx;
  }

  init();
})();

