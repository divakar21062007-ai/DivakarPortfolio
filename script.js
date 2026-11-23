// ======== PARTICLES ========
(function(){
  const canvas=document.getElementById("particleCanvas"),ctx=canvas.getContext("2d");
  let W=canvas.width=innerWidth,H=canvas.height=innerHeight;
  const colors=["rgba(255,60,172,","rgba(0,245,255,","rgba(180,0,255,","rgba(0,255,136,"];
  const pts=Array.from({length:70},()=>({
    x:Math.random()*W,y:Math.random()*H,
    vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,
    r:Math.random()*1.8+.4,
    color:colors[Math.floor(Math.random()*4)],
    alpha:Math.random()*.5+.1,
    life:0,maxLife:Math.random()*400+200
  }));
  function reset(p){p.x=Math.random()*W;p.y=Math.random()*H;p.vx=(Math.random()-.5)*.4;p.vy=(Math.random()-.5)*.4;p.life=0;p.maxLife=Math.random()*400+200;}
  function draw(){
    ctx.clearRect(0,0,W,H);
    pts.forEach((p,i)=>{
      p.x+=p.vx;p.y+=p.vy;p.life++;
      if(p.life>p.maxLife||p.x<0||p.x>W||p.y<0||p.y>H)reset(p);
      const a=p.alpha*(1-p.life/p.maxLife);
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.color+a+")";ctx.fill();
      pts.slice(i+1).forEach(q=>{
        const d=Math.hypot(p.x-q.x,p.y-q.y);
        if(d<110){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
          ctx.strokeStyle="rgba(0,245,255,"+(0.07*(1-d/110))+")";ctx.lineWidth=.4;ctx.stroke();}
      });
    });
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener("resize",()=>{W=canvas.width=innerWidth;H=canvas.height=innerHeight;});
})();

// ======== CURSOR ========
(function(){
  const dot=document.getElementById("cursorDot"),ring=document.getElementById("cursorRing");
  let rx=0,ry=0,mx=0,my=0;
  document.addEventListener("mousemove",e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+"px";dot.style.top=my+"px";});
  document.querySelectorAll("a,button,.filter-btn,.portfolio-card,.upload-zone").forEach(el=>{
    el.addEventListener("mouseenter",()=>{dot.style.width="14px";dot.style.height="14px";ring.style.width="50px";ring.style.height="50px";});
    el.addEventListener("mouseleave",()=>{dot.style.width="8px";dot.style.height="8px";ring.style.width="30px";ring.style.height="30px";});
  });
  (function anim(){rx+=(mx-rx)*.09;ry+=(my-ry)*.09;ring.style.left=rx+"px";ring.style.top=ry+"px";requestAnimationFrame(anim);})();
})();

// ======== LOADER ========
window.addEventListener("load",()=>setTimeout(()=>document.getElementById("loader").classList.add("hide"),2200));

// ======== NAVBAR & SCROLL ========
(function(){
  const nav=document.getElementById("navbar"),hbg=document.getElementById("hamburger"),links=document.getElementById("navLinks");
  window.addEventListener("scroll",()=>{
    nav.classList.toggle("scrolled",scrollY>50);
    document.getElementById("backToTop").classList.toggle("show",scrollY>400);
    let cur="";
    document.querySelectorAll("section[id]").forEach(s=>{if(scrollY>=s.offsetTop-200)cur=s.id;});
    document.querySelectorAll(".nav-link").forEach(l=>l.classList.toggle("active",l.getAttribute("href")==="#"+cur));
  });
  hbg.addEventListener("click",()=>links.classList.toggle("open"));
  document.querySelectorAll(".nav-link").forEach(l=>l.addEventListener("click",()=>links.classList.remove("open")));
})();
document.getElementById("backToTop").addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));

// ======== COUNTERS ========
let counted=false;
function runCounters(){
  if(counted)return;counted=true;
  document.querySelectorAll(".stat-num").forEach(el=>{
    const target=+el.dataset.target,step=target/60;
    let cur=0;
    const t=setInterval(()=>{cur+=step;if(cur>=target){cur=target;clearInterval(t);}el.textContent=Math.floor(cur);},30);
  });
}
setTimeout(runCounters,2500);

// ======== SCROLL REVEAL ========
(function(){
  const obs=new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting){e.target.classList.add("visible");if(e.target.id==="hero")runCounters();}
  }),{threshold:.1});
  document.querySelectorAll(".section,.skill-card,.portfolio-card,.contact-card,.tool-card").forEach(el=>{el.classList.add("reveal");obs.observe(el);});
  const skillObs=new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting)e.target.querySelectorAll(".skill-fill").forEach(f=>f.style.width=f.dataset.width+"%");
  }),{threshold:.3});
  document.querySelectorAll(".skills-grid").forEach(el=>skillObs.observe(el));
})();

// ======== PORTFOLIO ========
let portfolioData=[];
let nextId=1;
let currentFilter="all";

function createCard(item){
  const card=document.createElement("div");
  card.className="portfolio-card";
  card.dataset.category=item.category;
  card.dataset.id=item.id;
  card.innerHTML=`
    <div class="card-thumb">
      <div class="card-thumb-bg"><i class="fas fa-film"></i></div>
      <video src="${item.src}" muted preload="metadata"></video>
      <div class="card-overlay"><div class="card-play"><i class="fas fa-play"></i></div></div>
    </div>
    <div class="card-body">
      <div class="card-category">${item.category}</div>
      <div class="card-title">${item.title}</div>
      <div class="card-desc">${item.desc||"Edited with CapCut"}</div>
    </div>
    <div class="card-footer">
      <span class="card-tag">${item.category}</span>
      <button class="card-delete" title="Remove"><i class="fas fa-trash"></i></button>
    </div>`;
  const vid=card.querySelector("video");
  const thumb=card.querySelector(".card-thumb");
  thumb.addEventListener("mouseenter",()=>vid.play().catch(()=>{}));
  thumb.addEventListener("mouseleave",()=>{vid.pause();vid.currentTime=0;});
  card.querySelector(".card-overlay").addEventListener("click",()=>openLightbox(item));
  card.querySelector(".card-delete").addEventListener("click",e=>{e.stopPropagation();deleteCard(item.id);});
  return card;
}

function renderPortfolio(filter){
  currentFilter=filter;
  const grid=document.getElementById("portfolioGrid");
  grid.innerHTML="";
  const list=filter==="all"?portfolioData:portfolioData.filter(i=>i.category===filter);
  if(list.length===0){
    grid.innerHTML=`<div class="empty-state" id="emptyState"><i class="fas fa-film"></i><h3>No Videos Yet</h3><p>Upload your edited videos to showcase them here!</p><a href="#upload" class="btn btn-primary"><i class="fas fa-cloud-upload-alt"></i> Upload Now</a></div>`;
    return;
  }
  list.forEach((item,i)=>{
    const card=createCard(item);
    card.style.animationDelay=(i*.1)+"s";
    grid.appendChild(card);
    setTimeout(()=>card.classList.add("reveal","visible"),50+i*80);
  });
}

function deleteCard(id){
  portfolioData=portfolioData.filter(i=>i.id!==id);
  const listItem=document.querySelector(`#uploadedList [data-id="${id}"]`);
  if(listItem){listItem.style.opacity="0";listItem.style.transform="translateX(20px)";setTimeout(()=>listItem.remove(),400);}
  renderPortfolio(currentFilter);
}

renderPortfolio("all");

document.querySelectorAll(".filter-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".filter-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    renderPortfolio(btn.dataset.filter);
  });
});

// ======== LIGHTBOX ========
const lightbox=document.getElementById("lightbox");
const lbVid=document.getElementById("lightboxVideo");
const lbPlayPause=document.getElementById("lightboxPlayPause");
function syncLightboxPlayButton(){
  const isPlaying=!lbVid.paused&&!lbVid.ended;
  lbPlayPause.innerHTML=`<i class="fas fa-${isPlaying?"pause":"play"}"></i><span>${isPlaying?"Pause":"Play"}</span>`;
  lbPlayPause.setAttribute("aria-label",`${isPlaying?"Pause":"Play"} video`);
}
function openLightbox(item){
  document.getElementById("lightboxTitle").textContent=item.title;
  document.getElementById("lightboxDesc").textContent=item.desc||"";
  lbVid.pause();
  lbVid.src=item.src;
  lbVid.currentTime=0;
  syncLightboxPlayButton();
  lightbox.classList.add("open");
  document.body.style.overflow="hidden";
}
function closeLightbox(){lightbox.classList.remove("open");lbVid.pause();lbVid.src="";syncLightboxPlayButton();document.body.style.overflow="";}
lbPlayPause.addEventListener("click",()=>{
  if(lbVid.paused)lbVid.play().catch(()=>{});
  else lbVid.pause();
  syncLightboxPlayButton();
});
lbVid.addEventListener("play",syncLightboxPlayButton);
lbVid.addEventListener("pause",syncLightboxPlayButton);
lbVid.addEventListener("ended",syncLightboxPlayButton);
document.getElementById("lightboxClose").addEventListener("click",closeLightbox);
document.getElementById("lightboxOverlay").addEventListener("click",closeLightbox);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLightbox();});

// ======== UPLOAD ========
const uploadZone=document.getElementById("uploadZone");
const uploadForm=document.getElementById("uploadForm");
const uploadProgress=document.getElementById("uploadProgress");
const fileInput=document.getElementById("videoFileInput");
const previewVideo=document.getElementById("previewVideo");
let currentFile=null;

// Drag & Drop
["dragenter","dragover"].forEach(e=>uploadZone.addEventListener(e,ev=>{ev.preventDefault();uploadZone.classList.add("dragover");}));
["dragleave","drop"].forEach(e=>uploadZone.addEventListener(e,ev=>{ev.preventDefault();uploadZone.classList.remove("dragover");}));
uploadZone.addEventListener("drop",e=>{
  const f=e.dataTransfer.files[0];
  if(f&&f.type.startsWith("video/"))handleFile(f);
  else showToast("Please drop a video file!","error");
});

document.getElementById("browseBtn").addEventListener("click",()=>fileInput.click());
fileInput.addEventListener("change",e=>{if(e.target.files[0])handleFile(e.target.files[0]);});

// Also allow clicking the zone (excluding the button)
uploadZone.addEventListener("click",e=>{if(e.target.id!=="browseBtn"&&!e.target.closest("#browseBtn"))fileInput.click();});

function handleFile(file){
  currentFile=file;
  const url=URL.createObjectURL(file);
  previewVideo.src=url;
  uploadZone.style.display="none";
  uploadForm.style.display="grid";
  // Auto-fill title from filename
  const name=file.name.replace(/\.[^/.]+$/,"").replace(/[-_]/g," ");
  document.getElementById("vidTitle").value=name.charAt(0).toUpperCase()+name.slice(1);
}

document.getElementById("cancelUpload").addEventListener("click",()=>{
  uploadZone.style.display="block";
  uploadForm.style.display="none";
  currentFile=null;previewVideo.src="";fileInput.value="";
});

document.getElementById("addToPortfolio").addEventListener("click",()=>{
  const title=document.getElementById("vidTitle").value.trim();
  if(!title){
    document.getElementById("vidTitle").style.borderColor="var(--neon-pink)";
    document.getElementById("vidTitle").focus();
    return;
  }
  const category=document.getElementById("vidCategory").value;
  const desc=document.getElementById("vidDesc").value.trim();
  uploadForm.style.display="none";
  uploadProgress.style.display="block";
  const fill=document.getElementById("progressFill");
  let pct=0;
  const prog=setInterval(()=>{
    pct+=Math.random()*12+3;
    if(pct>=100){
      pct=100;clearInterval(prog);
      setTimeout(()=>{
        uploadProgress.style.display="none";
        uploadZone.style.display="block";
        const url=URL.createObjectURL(currentFile);
        const item={id:nextId++,title,category,desc,src:url};
        portfolioData.push(item);
        addUploadedItem(item);
        renderPortfolio(currentFilter);
        document.getElementById("vidTitle").value="";
        document.getElementById("vidDesc").value="";
        document.getElementById("vidTitle").style.borderColor="";
        currentFile=null;previewVideo.src="";fileInput.value="";
        showToast("Video added to your portfolio!");
      },500);
    }
    fill.style.width=pct+"%";
  },60);
});

function addUploadedItem(item){
  const list=document.getElementById("uploadedList");
  const div=document.createElement("div");
  div.className="uploaded-item";
  div.dataset.id=item.id;
  div.innerHTML=`
    <div class="uploaded-thumb"><video src="${item.src}" muted preload="metadata"></video></div>
    <div class="uploaded-info">
      <h4>${item.title}</h4>
      <p>${item.category} &middot; ${item.desc||"CapCut Edit"}</p>
    </div>
    <div class="uploaded-actions">
      <button onclick="openLightboxById(${item.id})" title="Preview"><i class="fas fa-eye"></i></button>
      <button onclick="deleteCard(${item.id})" title="Remove"><i class="fas fa-trash"></i></button>
    </div>`;
  list.prepend(div);
  setTimeout(()=>div.classList.add("reveal","visible"),50);
}

window.openLightboxById=function(id){const item=portfolioData.find(i=>i.id===id);if(item)openLightbox(item);};
window.deleteCard=deleteCard;

// ======== TOAST ========
function showToast(msg,type="success"){
  const t=document.createElement("div");
  const bg=type==="error"?"linear-gradient(135deg,#ff4444,#cc0000)":"linear-gradient(135deg,#ff3cac,#784ba0)";
  t.style.cssText=`position:fixed;bottom:5rem;right:2rem;background:${bg};color:#fff;padding:.8rem 1.5rem;border-radius:50px;font-family:'Orbitron',monospace;font-size:.78rem;z-index:9999;box-shadow:0 0 30px rgba(255,60,172,.5);letter-spacing:1px;animation:fadeInUp .4s ease`;
  t.textContent=msg;document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity="0";t.style.transition="opacity .5s";setTimeout(()=>t.remove(),500);},3000);
}

// ======== CONTACT FORM ========
document.getElementById("contactForm").addEventListener("submit",e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const formData=new FormData(form);
  const message=[
    "Hi Divakar, I'd like to enquire about your creative services.",
    `Name: ${formData.get("name")}`,
    `My contact: ${formData.get("contact")}`,
    `Service: ${formData.get("service")}`,
    `Details: ${formData.get("details")}`
  ].join("\n");
  const whatsappUrl=`https://wa.me/916381869475?text=${encodeURIComponent(message)}`;
  const fallback=document.getElementById("whatsappFallback");
  fallback.href=whatsappUrl;
  window.open(whatsappUrl,"_blank","noopener,noreferrer");
  const success=document.getElementById("formSuccess");
  success.classList.add("show");
  form.reset();
  setTimeout(()=>success.classList.remove("show"),5000);
});

// ======== SMOOTH SCROLL ========
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener("click",e=>{
    const t=document.querySelector(a.getAttribute("href"));
    if(t){e.preventDefault();t.scrollIntoView({behavior:"smooth",block:"start"});}
  });
});
