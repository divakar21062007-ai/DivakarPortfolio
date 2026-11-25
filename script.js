// ============================================================
//  DIVAKAR V | WINORRA DIGITAL — Portfolio Script
//  Featured Video Showcase — Vercel Production Ready
// ============================================================

const BUILT_IN_VIDEOS = [
  {
    id: 'sago-1',
    title: 'SagoTalks Brand Reel',
    category: 'reels',
    desc: 'Dynamic pacing, custom typography & engaging short-form reel edit.',
    url: 'videos/sagotalks_20261114_113455471.mp4',
    isBuiltIn: true
  },
  {
    id: 'sago-2',
    title: 'SagoTalks Podcast Clip',
    category: 'reels',
    desc: 'Speaker highlights, sound design & smooth visual cuts.',
    url: 'videos/sagotalks_20261114_123024731.mp4',
    isBuiltIn: true
  },
  {
    id: 'sago-3',
    title: 'SagoTalks Promo Beat Sync',
    category: 'beats',
    desc: 'High energy transitions synced to the beat with dynamic zoom ramps.',
    url: 'videos/sagotalks_20261114_123035754.mp4',
    isBuiltIn: true
  },
  {
    id: 'sago-4',
    title: 'SagoTalks Talk Series',
    category: 'reels',
    desc: 'Clean subtitles, color grading & brand-focused content layout.',
    url: 'videos/sagotalks_20261114_123042493.mp4',
    isBuiltIn: true
  },
  {
    id: 'cine-1',
    title: 'Cinematic Visual Edit',
    category: 'cinematic',
    desc: 'Cinematic color tones, smooth slow-motion & storytelling flow.',
    url: 'videos/lv_0_20260620204938.mp4',
    isBuiltIn: true
  }
];

let portfolioData = [];
let currentFilter = 'all';
let currentFile = null;
let previewObjectUrl = null;

const $ = (id) => document.getElementById(id);
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/* ---- Load All Videos ---- */
function loadVideos() {
  let userVideos = [];
  try {
    const saved = localStorage.getItem('winorra_user_videos');
    if (saved) {
      userVideos = JSON.parse(saved);
      if (!Array.isArray(userVideos)) userVideos = [];
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }

  portfolioData = [...userVideos, ...BUILT_IN_VIDEOS];
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
    if (empty) { empty.style.display = 'block'; grid.appendChild(empty); }
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = filtered.map((v, idx) => `
    <div class="portfolio-card reveal visible" style="animation-delay:${idx * 0.08}s">
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
        ${!v.isBuiltIn ? `<button class="card-delete" data-delete-id="${escapeHTML(v.id)}" title="Delete video" aria-label="Delete"><i class="fas fa-trash"></i></button>` : `<span style="font-size:0.75rem;color:var(--w-blue);font-weight:700;"><i class="fas fa-check-circle"></i> WINORRA Edit</span>`}
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

/* ---- Delete User-Uploaded Video ---- */
window.deleteCard = function(id) {
  if (!confirm('Are you sure you want to delete this uploaded video?')) return;
  try {
    let userVideos = JSON.parse(localStorage.getItem('winorra_user_videos') || '[]');
    userVideos = userVideos.filter(v => v.id != id);
    localStorage.setItem('winorra_user_videos', JSON.stringify(userVideos));
  } catch (e) {}

  loadVideos();
};

/* ---- Uploaded List in Upload Section ---- */
function renderUploadedList() {
  const list = $('uploadedList');
  if (!list) return;

  const userVideos = portfolioData.filter(v => !v.isBuiltIn);
  if (!userVideos.length) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = `<h4 style="font-family:var(--font-title);font-size:.85rem;color:var(--w-blue);margin-bottom:1rem;letter-spacing:1px;">MY RECENTLY UPLOADED VIDEOS (${userVideos.length})</h4>` +
    userVideos.map(v => `
      <div class="uploaded-item">
        <div class="uploaded-thumb"><video src="${escapeHTML(v.url)}" muted preload="metadata"></video></div>
        <div class="uploaded-info"><h4>${escapeHTML(v.title)}</h4><p>${escapeHTML(v.category)} &bull; Saved</p></div>
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

/* ---- Upload Controls ---- */
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
  const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (!allowed.includes(file.type)) {
    alert('Please choose an MP4, WebM or MOV video file.');
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

addBtn?.addEventListener('click', () => {
  const title = $('vidTitle')?.value.trim();
  if (!title) return alert('Please enter a video title!');
  if (!currentFile) return alert('Please select a video file!');

  uploadForm.style.display = 'none';
  uploadProgress.style.display = 'block';
  addBtn.disabled = true;

  if (progressFill) progressFill.style.width = '40%';

  const category = $('vidCategory')?.value || 'reels';
  const desc = $('vidDesc')?.value.trim() || '';

  const reader = new FileReader();
  reader.onload = function(e) {
    if (progressFill) progressFill.style.width = '80%';
    const base64 = e.target.result;
    const newVideo = {
      id: 'upload-' + Date.now(),
      title,
      category,
      desc,
      url: base64,
      isBuiltIn: false,
      createdAt: new Date().toISOString()
    };

    try {
      const userVideos = JSON.parse(localStorage.getItem('winorra_user_videos') || '[]');
      userVideos.unshift(newVideo);
      localStorage.setItem('winorra_user_videos', JSON.stringify(userVideos));
    } catch (err) {
      console.warn('LocalStorage limit for large file.');
    }

    if (progressFill) progressFill.style.width = '100%';
    setTimeout(() => {
      addBtn.disabled = false;
      resetUploadForm();
      loadVideos();
      $('portfolio')?.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  };
  reader.readAsDataURL(currentFile);
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
  loadVideos();
  setTimeout(() => {
    const loader = $('loader');
    if (loader) loader.classList.add('hide');
    document.querySelectorAll('.reveal').forEach(el => observer?.observe(el));
  }, 1600);
});
