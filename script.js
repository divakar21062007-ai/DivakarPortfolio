// ============================================================
//  DIVAKAR V | WINORRA DIGITAL — Portfolio Script
//  Videos are stored in Supabase Storage + Postgres, so they
//  survive refresh and show on every device (phone, laptop...).
// ============================================================

const SUPABASE_URL = window.WINORRA_SUPABASE_URL || 'https://qodfxqzalnrkmslkjncc.supabase.co';
const SUPABASE_ANON_KEY = window.WINORRA_SUPABASE_ANON_KEY || 'sb_publishable_1ppAO_Rlge-bzBtEDeU6IQ_xllqJcNC';
const BUCKET = 'portfolio-videos';
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB per video file (matches the bucket limit)
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

let supabaseClient = null;
let portfolioData = [];
let currentFilter = 'all';
let currentFile = null;
let currentFileType = '';
let previewObjectUrl = null;
let currentUser = null; // signed-in admin (null for normal visitors)

const $ = (id) => document.getElementById(id);
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// Keep a reference to the empty-state node. (Older code wiped it out with
// grid.innerHTML and then could never find it again.)
const emptyStateEl = $('emptyState');

// Old versions saved videos as base64 in this browser only. Clean that up.
try { localStorage.removeItem('winorra_local_videos'); } catch (e) {}

function showGridMessage(title, text) {
  const grid = $('portfolioGrid');
  if (!grid) return;
  grid.innerHTML = `<div class="empty-state"><i class="fas fa-film"></i><h3>${escapeHTML(title)}</h3><p>${escapeHTML(text)}</p></div>`;
}

/* ---- Initialize Supabase ---- */
async function initializeSupabase() {
  if (!window.supabase?.createClient) {
    showGridMessage('Could not connect', 'The Supabase library did not load. Check your internet connection and refresh.');
    return;
  }
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error('Supabase client error:', err);
    showGridMessage('Could not connect', 'Supabase client failed to start. Check supabase-config.js.');
    return;
  }
  await setupAuth();
  await loadPortfolio();
}

/* ---- Admin Auth (only the admin can upload / delete) ---- */
function setAuthMessage(msg = '') {
  const el = $('adminAuthMessage');
  if (el) el.textContent = msg;
}

function applyAuthState(user) {
  currentUser = user || null;
  const signedIn = !!currentUser;
  if ($('adminLoginWrap')) $('adminLoginWrap').hidden = signedIn;
  if ($('adminSignedIn')) $('adminSignedIn').hidden = !signedIn;
  if ($('uploadTools')) $('uploadTools').hidden = !signedIn;
  if ($('adminStatus')) $('adminStatus').textContent = signedIn ? `Signed in as ${currentUser.email}` : '';
  renderPortfolio(currentFilter);
  renderUploadedList();
}

async function setupAuth() {
  const { data } = await supabaseClient.auth.getSession();
  applyAuthState(data?.session?.user || null);
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    // keep this callback synchronous (no awaited Supabase calls inside)
    applyAuthState(session?.user || null);
  });
}

$('adminLoginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabaseClient) return setAuthMessage('Supabase is not connected yet. Refresh and try again.');
  setAuthMessage('Signing in...');
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: $('adminEmail').value.trim(),
    password: $('adminPassword').value
  });
  if (error) return setAuthMessage(error.message);
  $('adminPassword').value = '';
  setAuthMessage('');
});

$('adminLogout')?.addEventListener('click', async () => {
  await supabaseClient?.auth.signOut();
});

/* ---- Render Portfolio Grid ---- */
function renderPortfolio(filter = 'all') {
  const grid = $('portfolioGrid');
  if (!grid) return;

  const filtered = filter === 'all' ? portfolioData : portfolioData.filter(v => v.category === filter);

  if (!filtered.length) {
    grid.innerHTML = '';
    if (emptyStateEl) { emptyStateEl.style.display = 'block'; grid.appendChild(emptyStateEl); }
    return;
  }
  if (emptyStateEl) emptyStateEl.style.display = 'none';

  // "#t=0.5" makes iPhone/Android browsers draw a real thumbnail frame
  // instead of a black/empty box. No "reveal" class here: on phones it kept
  // cards invisible (opacity:0) until the observer fired.
  grid.innerHTML = filtered.map((v, idx) => `
    <div class="portfolio-card" style="animation-delay:${idx * 0.08}s">
      <div class="card-thumb">
        <div class="card-thumb-bg"><i class="fas fa-film"></i></div>
        <video src="${escapeHTML(v.url)}#t=0.5" muted playsinline webkit-playsinline preload="metadata"></video>
        <div class="card-overlay"><div class="card-play"><i class="fas fa-play"></i></div></div>
      </div>
      <div class="card-body">
        <div class="card-category">${escapeHTML(v.category)}</div>
        <div class="card-title">${escapeHTML(v.title)}</div>
        <div class="card-desc">${escapeHTML(v.desc || '')}</div>
      </div>
      <div class="card-footer">
        <span class="card-tag">${escapeHTML(v.category)}</span>
        ${currentUser ? `<button class="card-delete" type="button" data-delete-id="${escapeHTML(v.id)}" title="Delete video" aria-label="Delete ${escapeHTML(v.title)}"><i class="fas fa-trash"></i></button>` : ''}
      </div>
    </div>`).join('');

  grid.querySelectorAll('.portfolio-card').forEach((card, idx) => {
    const video = filtered[idx];
    const thumb = card.querySelector('.card-thumb');
    thumb?.addEventListener('click', () => openLightbox(video));
    const preview = card.querySelector('.card-thumb video');
    preview?.addEventListener('mouseenter', e => e.currentTarget.play().catch(() => {}));
    preview?.addEventListener('mouseleave', e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0.5; });
  });

  grid.querySelectorAll('[data-delete-id]').forEach(button => {
    button.addEventListener('click', () => deleteCard(button.dataset.deleteId));
  });
}

/* ---- Load Videos from Supabase (runs on every page load / refresh) ---- */
async function loadPortfolio() {
  if (!supabaseClient) return;

  if (!portfolioData.length) {
    const grid = $('portfolioGrid');
    if (grid) grid.innerHTML = '<p class="empty-state">Loading portfolio videos...</p>';
  }

  try {
    const { data, error } = await supabaseClient
      .from('portfolio_videos')
      .select('id,title,category,description,file_path,public_url,created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    portfolioData = (data || []).map(row => ({
      id: row.id,
      title: row.title,
      category: row.category,
      desc: row.description || '',
      url: row.public_url || '',
      storagePath: row.file_path || null,
      createdAt: row.created_at
    }));

    const active = document.querySelector('.filter-btn.active')?.dataset.filter || currentFilter;
    renderPortfolio(active);
    renderUploadedList();
  } catch (error) {
    console.error('Could not load portfolio videos:', error);
    showGridMessage('Videos could not be loaded', error.message || 'Check your Supabase setup and database policies.');
  }
}

/* ---- Delete Video (admin only) ---- */
window.deleteCard = async function (id) {
  if (!currentUser) return alert('Please sign in as admin to delete videos.');
  if (!confirm('Are you sure you want to delete this video?')) return;
  const video = portfolioData.find(v => v.id == id);
  if (!video) return;

  try {
    // 1) database row first, 2) then the file in storage
    const { error: rowError } = await supabaseClient.from('portfolio_videos').delete().eq('id', id);
    if (rowError) throw rowError;
    if (video.storagePath) {
      const { error: storageError } = await supabaseClient.storage.from(BUCKET).remove([video.storagePath]);
      if (storageError) console.warn('Row deleted, but file could not be removed from storage:', storageError);
    }
  } catch (e) {
    console.error('Delete failed:', e);
    return alert('Delete failed: ' + (e.message || e));
  }

  portfolioData = portfolioData.filter(v => v.id != id);
  renderPortfolio(currentFilter);
  renderUploadedList();
};

/* ---- Uploaded List in Upload Section (admin only) ---- */
function renderUploadedList() {
  const list = $('uploadedList');
  if (!list) return;
  if (!currentUser || !portfolioData.length) { list.innerHTML = ''; return; }

  list.innerHTML = `<h4 style="font-family:var(--font-title);font-size:.85rem;color:var(--w-blue);margin-bottom:1rem;letter-spacing:1px;">SAVED VIDEOS (${portfolioData.length})</h4>` +
    portfolioData.map(v => `
      <div class="uploaded-item">
        <div class="uploaded-thumb"><video src="${escapeHTML(v.url)}#t=0.5" muted playsinline preload="metadata"></video></div>
        <div class="uploaded-info"><h4>${escapeHTML(v.title)}</h4><p>${escapeHTML(v.category)} &bull; Available online</p></div>
        <div class="uploaded-actions"><button type="button" data-list-delete="${escapeHTML(v.id)}" title="Delete"><i class="fas fa-trash"></i></button></div>
      </div>`).join('');

  list.querySelectorAll('[data-list-delete]').forEach(button => {
    button.addEventListener('click', () => deleteCard(button.dataset.listDelete));
  });
}

/* ---- Lightbox ---- */
function openLightbox(vid) {
  const lb = $('lightbox');
  if (!lb) return;
  $('lightboxVideo').src = vid.url;
  $('lightboxTitle').textContent = vid.title;
  $('lightboxDesc').textContent = vid.desc || vid.category;
  lb.classList.add('open');
  $('lightboxVideo').play().catch(() => {});
}

function closeLightbox() {
  $('lightbox')?.classList.remove('open');
  const video = $('lightboxVideo');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
}
$('lightboxClose')?.addEventListener('click', closeLightbox);
$('lightboxOverlay')?.addEventListener('click', closeLightbox);

// Play / Pause button inside the lightbox
(function setupLightboxToggle() {
  const btn = $('lightboxPlayPause');
  const video = $('lightboxVideo');
  if (!btn || !video) return;
  const sync = () => {
    const playing = !video.paused && !video.ended;
    btn.innerHTML = playing ? '<i class="fas fa-pause"></i><span>Pause</span>' : '<i class="fas fa-play"></i><span>Play</span>';
    btn.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
  };
  btn.addEventListener('click', () => { video.paused ? video.play().catch(() => {}) : video.pause(); });
  ['play', 'pause', 'ended', 'loadeddata'].forEach(ev => video.addEventListener(ev, sync));
})();

/* ---- Filter Tabs ---- */
document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  renderPortfolio(currentFilter);
}));

/* ---- Upload Handler (admin only) ---- */
const uploadZone   = $('uploadZone');
const fileInput    = $('videoFileInput');
const browseBtn    = $('browseBtn');
const uploadForm   = $('uploadForm');
const previewVideo = $('previewVideo');
const uploadProgress = $('uploadProgress');
const progressFill = $('progressFill');
const cancelBtn    = $('cancelUpload');
const addBtn       = $('addToPortfolio');

browseBtn?.addEventListener('click', () => fileInput?.click());
uploadZone?.addEventListener('click', e => { if (e.target === uploadZone) fileInput?.click(); });
uploadZone?.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone?.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput?.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

function resetUploadForm() {
  if (uploadZone) uploadZone.style.display = 'block';
  if (uploadForm) uploadForm.style.display = 'none';
  if (uploadProgress) uploadProgress.style.display = 'none';
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = null;
  if (previewVideo) { previewVideo.removeAttribute('src'); previewVideo.load(); }
  currentFile = null;
  currentFileType = '';
  if (fileInput) fileInput.value = '';
  if ($('vidTitle')) $('vidTitle').value = '';
  if ($('vidDesc')) $('vidDesc').value = '';
  if (progressFill) progressFill.style.width = '0%';
}

// Phones sometimes give an empty file.type (especially .mov / .mp4), so fall back to the extension.
function detectVideoType(file) {
  if (ALLOWED_TYPES.includes(file.type)) return file.type;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' }[ext] || '';
}

function handleFile(file) {
  const type = detectVideoType(file);
  if (!type) {
    alert('Please choose an MP4, WebM or MOV video file.');
    return;
  }
  if (file.size > MAX_VIDEO_BYTES) {
    alert('Video is larger than 50MB. Please export a 1080p web version under 50MB.');
    return;
  }
  currentFile = file;
  currentFileType = type;
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = URL.createObjectURL(file);
  previewVideo.src = previewObjectUrl;
  uploadZone.style.display = 'none';
  uploadForm.style.display = 'grid';
}

cancelBtn?.addEventListener('click', resetUploadForm);

addBtn?.addEventListener('click', async () => {
  if (!supabaseClient || !currentUser) return alert('Please sign in as admin first.');
  const title = $('vidTitle')?.value.trim();
  if (!title) return alert('Please enter a video title!');
  if (!currentFile) return alert('Please select a video file!');

  uploadForm.style.display = 'none';
  uploadProgress.style.display = 'block';
  addBtn.disabled = true;

  const progressText = uploadProgress.querySelector('p');
  if (progressText) progressText.textContent = 'Uploading to cloud storage... Please wait.';
  if (progressFill) progressFill.style.width = '20%';

  const safeName = currentFile.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(-100);
  // The storage policy only allows the admin to write inside a folder named after their user id.
  const storagePath = `${currentUser.id}/${Date.now()}-${safeName}`;
  const category = $('vidCategory')?.value || 'reels';
  const desc = $('vidDesc')?.value.trim() || '';

  try {
    if (progressFill) progressFill.style.width = '45%';
    const { data: uploaded, error: uploadError } = await supabaseClient.storage
      .from(BUCKET)
      .upload(storagePath, currentFile, { cacheControl: '3600', contentType: currentFileType, upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseClient.storage.from(BUCKET).getPublicUrl(uploaded.path);

    if (progressFill) progressFill.style.width = '80%';
    const { error: insertError } = await supabaseClient
      .from('portfolio_videos')
      .insert({
        title,
        category,
        description: desc,
        file_path: uploaded.path,
        public_url: publicData.publicUrl,
        created_by: currentUser.id
      });

    if (insertError) {
      // don't leave an orphan file behind if the database row failed
      await supabaseClient.storage.from(BUCKET).remove([uploaded.path]);
      throw insertError;
    }

    if (progressFill) progressFill.style.width = '100%';
    // Re-read from the database so what you see is exactly what a refresh will show.
    await loadPortfolio();
    setTimeout(() => {
      addBtn.disabled = false;
      resetUploadForm();
      $('portfolio')?.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  } catch (err) {
    console.error('Upload failed:', err);
    addBtn.disabled = false;
    uploadProgress.style.display = 'none';
    uploadForm.style.display = 'grid';
    alert('Upload failed: ' + (err.message || err) + '\n\nTip: make sure you ran supabase-setup.sql and are signed in as the admin user.');
  }
});

/* ---- Navbar & Scroll ---- */
const navbar = $('navbar');
const navLinks = $('navLinks');
const hamburger = $('hamburger');

window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 50);
  $('backToTop')?.classList.toggle('show', window.scrollY > 300);

  const sections = document.querySelectorAll('section[id]');
  let current = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === '#' + current);
  });
});

hamburger?.addEventListener('click', () => navLinks?.classList.toggle('open'));
document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => navLinks?.classList.remove('open')));
$('backToTop')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---- Scroll Reveal & Counters ---- */
let observer = null;
if ('IntersectionObserver' in window) {
  observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  const skillObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const fill = e.target.querySelector('.skill-fill');
        if (fill) fill.style.width = fill.dataset.width + '%';
        skillObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.skill-card').forEach(c => skillObserver.observe(c));

  const statObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.stat-num').forEach(el => {
          const target = +el.dataset.target;
          let cur = 0;
          const step = Math.max(1, target / 50);
          const timer = setInterval(() => {
            cur += step;
            if (cur >= target) { el.textContent = target; clearInterval(timer); return; }
            el.textContent = Math.floor(cur);
          }, 30);
        });
        statObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.hero-stats').forEach(s => statObs.observe(s));
}

/* ---- Cursor ---- */
const dot  = $('cursorDot');
const ring = $('cursorRing');
document.addEventListener('mousemove', e => {
  if (dot)  { dot.style.left  = e.clientX + 'px'; dot.style.top  = e.clientY + 'px'; }
  if (ring) { ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; }
});

/* ---- Particles ---- */
const canvas = $('particleCanvas');
const ctx = canvas?.getContext('2d');
if (canvas && ctx) {
  let particles = [];
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  const colors = ['rgba(26,35,126,0.25)','rgba(211,47,47,0.2)','rgba(249,168,37,0.2)','rgba(56,142,60,0.2)'];
  for (let i = 0; i < 40; i++) particles.push({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    r: Math.random() * 2.5 + 1, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4,
    color: colors[Math.floor(Math.random() * colors.length)]
  });

  (function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(animate);
  })();
}

/* ---- Start ---- */
// Load the portfolio right away (do not wait for the window "load" event,
// which on phones can be delayed by fonts/images).
initializeSupabase();

function hideLoader() {
  $('loader')?.classList.add('hide');
  document.querySelectorAll('.reveal').forEach(el => observer?.observe(el));
}
window.addEventListener('load', () => setTimeout(hideLoader, 1800));
setTimeout(hideLoader, 4500); // safety net so the loader can never get stuck on slow mobile networks
