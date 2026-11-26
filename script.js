// ============================================================
//  DIVAKAR V | WINORRA DIGITAL — Portfolio Script
//  Showcases ONLY Uploaded Videos via Supabase
// ============================================================

const SUPABASE_URL = window.WINORRA_SUPABASE_URL || 'https://qodfxqzalnrkmslkjncc.supabase.co';
const SUPABASE_ANON_KEY = window.WINORRA_SUPABASE_ANON_KEY || 'sb_publishable_1ppAO_Rlge-bzBtEDeU6IQ_xllqJcNC';
const BUCKET = 'portfolio-videos';
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB per file

let supabaseClient = null;
let currentAdminUser = null;
let portfolioData = [];
let currentFilter = 'all';
let currentFile = null;
let previewObjectUrl = null;

const $ = (id) => document.getElementById(id);
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/* ---- Initialize Supabase ---- */
async function initSupabase() {
  if (window.supabase?.createClient) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data } = await supabaseClient.auth.getSession();
      updateAdminAuthUI(data?.session?.user || null);

      supabaseClient.auth.onAuthStateChange((_event, session) => {
        updateAdminAuthUI(session?.user || null);
      });
    } catch (err) {
      console.warn('Supabase init note:', err);
    }
  }
  await loadPortfolio();
}

/* ---- Update Admin UI State ---- */
function updateAdminAuthUI(user) {
  currentAdminUser = user || null;
  const loginWrap = $('adminLoginWrap');
  const signedInWrap = $('adminSignedIn');
  const uploadTools = $('uploadTools');
  const statusText = $('adminStatus');

  if (user) {
    if (loginWrap) loginWrap.hidden = true;
    if (signedInWrap) signedInWrap.hidden = false;
    if (uploadTools) uploadTools.hidden = false;
    if (statusText) statusText.textContent = `Signed in as Admin: ${user.email}`;
  } else {
    if (loginWrap) loginWrap.hidden = false;
    if (signedInWrap) signedInWrap.hidden = true;
    if (uploadTools) uploadTools.hidden = true;
  }

  renderPortfolio(currentFilter);
  renderUploadedList();
}

/* ---- Admin Login Form Handler ---- */
$('adminLoginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const authMsg = $('adminAuthMessage');
  const email = $('adminEmail')?.value.trim();
  const password = $('adminPassword')?.value;

  if (!supabaseClient) {
    if (authMsg) authMsg.textContent = 'Connecting to database... Please try again in a moment.';
    return;
  }

  if (authMsg) {
    authMsg.style.color = 'var(--w-blue)';
    authMsg.textContent = 'Verifying admin credentials...';
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    if (authMsg) {
      authMsg.style.color = 'var(--w-red)';
      authMsg.textContent = 'Login failed: ' + error.message;
    }
    return;
  }

  if (authMsg) authMsg.textContent = '';
  updateAdminAuthUI(data.user);
  await loadPortfolio();
});

/* ---- Admin Logout Handler ---- */
$('adminLogout')?.addEventListener('click', async () => {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  updateAdminAuthUI(null);
  const authMsg = $('adminAuthMessage');
  if (authMsg) {
    authMsg.style.color = 'var(--w-blue)';
    authMsg.textContent = 'Signed out. Visitor mode active.';
    setTimeout(() => { if (authMsg) authMsg.textContent = ''; }, 3000);
  }
});

/* ---- Load ONLY Uploaded Videos from Supabase ---- */
async function loadPortfolio() {
  let cloudVideos = [];

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('portfolio_videos')
        .select('id, title, category, description, public_url, file_path, created_at')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        cloudVideos = data.map(row => ({
          id: row.id,
          title: row.title,
          category: row.category,
          desc: row.description || '',
          url: row.public_url,
          storagePath: row.file_path,
          createdAt: row.created_at
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch note:', e);
    }
  }

  // Also check local storage for any locally uploaded videos
  let localUploaded = [];
  try {
    const local = localStorage.getItem('winorra_user_videos');
    if (local) {
      localUploaded = JSON.parse(local);
      if (!Array.isArray(localUploaded)) localUploaded = [];
    }
  } catch (e) {}

  // ONLY uploaded videos (Cloud + Local uploads) — NO hardcoded demo videos
  const allUploaded = [...cloudVideos];
  localUploaded.forEach(lv => {
    if (!allUploaded.some(cv => cv.id === lv.id || cv.url === lv.url)) {
      allUploaded.push(lv);
    }
  });

  portfolioData = allUploaded;
  renderPortfolio(currentFilter);
  renderUploadedList();
}

/* ---- Render Portfolio Grid ---- */
function renderPortfolio(filter = 'all') {
  const grid = $('portfolioGrid');
  const empty = $('emptyState');
  if (!grid) return;

  const filtered = filter === 'all' ? portfolioData : portfolioData.filter(v => v.category === filter);

  if (!filtered.length) {
    grid.innerHTML = '';
    if (empty) {
      empty.style.display = 'block';
      grid.appendChild(empty);
    }
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = filtered.map((v, idx) => `
    <div class="portfolio-card reveal visible" style="animation-delay:${Math.min(idx * 0.05, 0.4)}s">
      <div class="card-thumb">
        <div class="card-thumb-bg"><i class="fas fa-play"></i></div>
        <video src="${escapeHTML(v.url)}" muted preload="metadata" playsinline></video>
        <div class="card-overlay"><div class="card-play"><i class="fas fa-play"></i></div></div>
      </div>
      <div class="card-body">
        <div class="card-category">${escapeHTML(v.category)}</div>
        <div class="card-title">${escapeHTML(v.title)}</div>
        <div class="card-desc">${escapeHTML(v.desc || '')}</div>
      </div>
      <div class="card-footer">
        <span class="card-tag">${escapeHTML(v.category)}</span>
        ${currentAdminUser ? `<button class="card-delete" data-delete-id="${escapeHTML(v.id)}" title="Delete video" aria-label="Delete"><i class="fas fa-trash"></i> Delete</button>` : `<a href="https://www.instagram.com/divakarrr._.off" target="_blank" rel="noopener noreferrer" style="font-size:0.75rem;color:var(--w-blue);font-weight:700;display:flex;align-items:center;gap:4px;"><i class="fab fa-instagram"></i> Divakar V</a>`}
      </div>
    </div>`).join('');

  grid.querySelectorAll('.portfolio-card').forEach((card, idx) => {
    const video = filtered[idx];
    const thumbVideo = card.querySelector('.card-thumb video');

    card.querySelector('.card-overlay')?.addEventListener('click', () => openLightbox(video));

    card.querySelector('.card-thumb')?.addEventListener('mouseenter', () => {
      if (thumbVideo) thumbVideo.play().catch(() => {});
    });
    card.querySelector('.card-thumb')?.addEventListener('mouseleave', () => {
      if (thumbVideo) {
        thumbVideo.pause();
        thumbVideo.currentTime = 0;
      }
    });
  });

  grid.querySelectorAll('[data-delete-id]').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCard(button.dataset.deleteId);
    });
  });
}

/* ---- Delete Uploaded Video (Admin Only) ---- */
window.deleteCard = async function(id) {
  if (!currentAdminUser) return alert('Only the Admin can delete videos.');
  const video = portfolioData.find(v => v.id == id);
  if (!video || !confirm(`Delete "${video.title}" from your portfolio?`)) return;

  if (supabaseClient) {
    try {
      if (video.storagePath) {
        await supabaseClient.storage.from(BUCKET).remove([video.storagePath]);
      }
      await supabaseClient.from('portfolio_videos').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
  }

  // Also remove from local storage if present
  try {
    let local = JSON.parse(localStorage.getItem('winorra_user_videos') || '[]');
    local = local.filter(v => v.id != id);
    localStorage.setItem('winorra_user_videos', JSON.stringify(local));
  } catch (e) {}

  await loadPortfolio();
};

/* ---- Render Uploaded List (Admin Panel) ---- */
function renderUploadedList() {
  const list = $('uploadedList');
  if (!list || !currentAdminUser) {
    if (list) list.innerHTML = '';
    return;
  }

  if (!portfolioData.length) {
    list.innerHTML = '<p style="color:var(--text-dim);font-size:0.85rem;padding:0.5rem 0;">No uploaded videos yet. Use the upload box above to add your first video.</p>';
    return;
  }

  list.innerHTML = `<h4 style="font-family:var(--font-title);font-size:.85rem;color:var(--w-blue);margin-bottom:1rem;letter-spacing:1px;">MY UPLOADED VIDEOS (${portfolioData.length})</h4>` +
    portfolioData.map(v => `
      <div class="uploaded-item">
        <div class="uploaded-thumb"><video src="${escapeHTML(v.url)}" muted preload="metadata"></video></div>
        <div class="uploaded-info"><h4>${escapeHTML(v.title)}</h4><p>${escapeHTML(v.category)} &bull; Uploaded</p></div>
        <div class="uploaded-actions"><button type="button" data-list-delete="${escapeHTML(v.id)}" title="Delete"><i class="fas fa-trash"></i></button></div>
      </div>`).join('');

  list.querySelectorAll('[data-list-delete]').forEach(button => {
    button.addEventListener('click', () => deleteCard(button.dataset.listDelete));
  });
}

/* ---- Lightbox Player ---- */
function openLightbox(vid) {
  const lb = $('lightbox');
  if (!lb) return;
  const lbVideo = $('lightboxVideo');
  lbVideo.src = vid.url;
  $('lightboxTitle').textContent = vid.title;
  $('lightboxDesc').textContent = vid.desc || vid.category;
  lb.classList.add('open');
  lbVideo.play().catch(() => {});
}

function closeLightbox() {
  $('lightbox')?.classList.remove('open');
  const video = $('lightboxVideo');
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
}
$('lightboxClose')?.addEventListener('click', closeLightbox);
$('lightboxOverlay')?.addEventListener('click', closeLightbox);

/* ---- Filter Tabs ---- */
document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  renderPortfolio(currentFilter);
}));

/* ---- Upload Controls (Admin Only) ---- */
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
  e.preventDefault();
  uploadZone.classList.remove('dragover');
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
  if (fileInput) fileInput.value = '';
  if ($('vidTitle')) $('vidTitle').value = '';
  if ($('vidDesc')) $('vidDesc').value = '';
  if (progressFill) progressFill.style.width = '0%';
}

function handleFile(file) {
  if (!currentAdminUser) {
    alert('Please sign in as Admin to upload videos.');
    return;
  }
  const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (!allowed.includes(file.type)) {
    alert('Please choose an MP4, WebM or MOV video file.');
    return;
  }
  if (file.size > MAX_VIDEO_BYTES) {
    alert('Maximum video size is 50MB for cloud storage. Please choose a video under 50MB.');
    return;
  }
  currentFile = file;
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = URL.createObjectURL(file);
  previewVideo.src = previewObjectUrl;
  uploadZone.style.display = 'none';
  uploadForm.style.display = 'grid';
}

cancelBtn?.addEventListener('click', resetUploadForm);

addBtn?.addEventListener('click', async () => {
  if (!currentAdminUser) return alert('Only signed-in Admin can upload videos.');
  const title = $('vidTitle')?.value.trim();
  if (!title) return alert('Please enter a video title!');
  if (!currentFile) return alert('Please select a video file!');

  uploadForm.style.display = 'none';
  uploadProgress.style.display = 'block';
  addBtn.disabled = true;

  const progressLabel = uploadProgress.querySelector('p');
  if (progressLabel) progressLabel.textContent = 'Uploading to Cloud Database... Please wait.';
  if (progressFill) progressFill.style.width = '25%';

  const safeName = currentFile.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(-100);
  const storagePath = `${currentAdminUser.id}/${Date.now()}-${safeName}`;
  const category = $('vidCategory')?.value || 'reels';
  const desc = $('vidDesc')?.value.trim() || '';

  try {
    let finalUrl = null;
    let savedStoragePath = null;

    // 1. Try uploading to Supabase Storage
    if (supabaseClient) {
      if (progressFill) progressFill.style.width = '55%';
      const { data: uploaded, error: uploadError } = await supabaseClient.storage
        .from(BUCKET)
        .upload(storagePath, currentFile, {
          cacheControl: '3600',
          contentType: currentFile.type,
          upsert: false
        });

      if (!uploadError && uploaded) {
        const { data: publicData } = supabaseClient.storage.from(BUCKET).getPublicUrl(uploaded.path);
        finalUrl = publicData.publicUrl;
        savedStoragePath = uploaded.path;

        if (progressFill) progressFill.style.width = '85%';
        await supabaseClient.from('portfolio_videos').insert({
          title,
          category,
          description: desc,
          file_path: savedStoragePath,
          public_url: finalUrl,
          created_by: currentAdminUser.id
        });
      }
    }

    // 2. Fallback to local storage if cloud is offline or quota reached
    if (!finalUrl) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const base64 = e.target.result;
        const localItem = {
          id: 'user-' + Date.now(),
          title,
          category,
          desc,
          url: base64,
          createdAt: new Date().toISOString()
        };
        try {
          const userVids = JSON.parse(localStorage.getItem('winorra_user_videos') || '[]');
          userVids.unshift(localItem);
          localStorage.setItem('winorra_user_videos', JSON.stringify(userVids));
        } catch (e) {}
        finishUpload();
      };
      reader.readAsDataURL(currentFile);
      return;
    }

    finishUpload();

    function finishUpload() {
      if (progressFill) progressFill.style.width = '100%';
      setTimeout(async () => {
        addBtn.disabled = false;
        resetUploadForm();
        await loadPortfolio();
        $('portfolio')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }

  } catch (err) {
    console.error('Upload error:', err);
    alert('Upload failed: ' + (err.message || 'Please check your connection.'));
    addBtn.disabled = false;
    resetUploadForm();
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

/* ---- Stat Counters & Skill Animation ---- */
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

/* ---- Cursor Follower ---- */
const dot  = $('cursorDot');
const ring = $('cursorRing');
document.addEventListener('mousemove', e => {
  if (dot)  { dot.style.left  = e.clientX + 'px'; dot.style.top  = e.clientY + 'px'; }
  if (ring) { ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; }
});

/* ---- Ambient Particle Canvas ---- */
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

/* ---- Window Load ---- */
window.addEventListener('load', () => {
  initSupabase();
  setTimeout(() => {
    const loader = $('loader');
    if (loader) loader.classList.add('hide');
    document.querySelectorAll('.reveal').forEach(el => observer?.observe(el));
  }, 1600);
});
