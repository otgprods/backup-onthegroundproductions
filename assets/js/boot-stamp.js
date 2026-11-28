/* On The Ground Productions - hero "boot stamp" motion graphic.
   Cracked-earth plate, then a boot print presses in (masked sweep + dust + camera shake). */
(function () {
  var cvs = document.getElementById("boot-stamp");
  if (!cvs) return;
  // On small screens the animation is skipped entirely — a static image is shown
  // instead (much faster to paint). Nothing here runs, so no images load either.
  if (window.matchMedia && window.matchMedia("(max-width: 700px)").matches) return;
  var ctx = cvs.getContext("2d");

  var IMG = {
    before: "assets/img/boot/before.jpg",
    after:  "assets/img/boot/after.jpg",
    mask:   "assets/img/boot/mask.png",
    shadow: "assets/img/boot/shadow.png"
  };
  var W = 1920, H = 1080, DUR = 5.0, IMPACT = 32 / 30, SWEEP = 1.2;
  var SH_IN0 = 24/30, SH_IN1 = 32/30, SH_OUT0 = 38/30, SH_OUT1 = 52/30, FADE0 = 68/30, FADE1 = 96/30;
  var HEEL = [0.2153*W, 0.8993*H], TOE = [0.7622*W, 0.1363*H], CTR = [0.4781*W, 0.5102*H];

  function load(src){ return new Promise(function(r){ var i = new Image(); i.onload = function(){ r(i); }; i.onerror = function(){ r(i); }; i.src = src; }); }
  var off = function(w,h){ var c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  var smooth = function(t){ return t*t*(3-2*t); };
  var clamp = function(v,a,b){ return Math.max(a, Math.min(b, v)); };

  var imgs = {}, particles = [], t0 = null, playing = false;
  var shadowTint, maskedAfter;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function buildShadowTint(){
    shadowTint = off(W,H); var x = shadowTint.getContext("2d");
    x.drawImage(imgs.shadow,0,0,W,H); x.globalCompositeOperation = "source-in";
    x.fillStyle = "#000"; x.fillRect(0,0,W,H);
  }
  function sampleEdges(){
    var s = off(160,90), x = s.getContext("2d");
    x.drawImage(imgs.mask,0,0,160,90);
    var d = x.getImageData(0,0,160,90).data, pts = [];
    for (var i=0;i<160*90;i++){ var v=d[i*4]; if(v>60&&v<200) pts.push([(i%160)/160*W, Math.floor(i/160)/90*H]); }
    return pts;
  }
  function spawnDust(){
    var pts = sampleEdges(); particles = [];
    if(!pts.length) return;
    for (var i=0;i<140;i++){
      var p = pts[Math.floor(Math.random()*pts.length)];
      var ang = Math.atan2(p[1]-CTR[1], p[0]-CTR[0]);
      var spd = 25+Math.random()*95;
      particles.push({x:p[0],y:p[1],
        vx:Math.cos(ang)*spd+(Math.random()*80-40),
        vy:Math.sin(ang)*spd*0.5-(25+Math.random()*85),
        t0:IMPACT+Math.random()*1.15, life:0.5+Math.random()*0.8,
        r:3+Math.random()*10, a:0.18+Math.random()*0.32});
    }
  }
  function drawMaskedAfter(s){
    var mc = maskedAfter.getContext("2d");
    mc.globalCompositeOperation = "source-over"; mc.clearRect(0,0,W,H);
    mc.drawImage(imgs.after,0,0,W,H);
    mc.globalCompositeOperation = "destination-in"; mc.drawImage(imgs.mask,0,0,W,H);
    var e = s*1.3, st = e-0.3;
    var g = mc.createLinearGradient(HEEL[0],HEEL[1],TOE[0],TOE[1]);
    g.addColorStop(0,"rgba(0,0,0,1)");
    g.addColorStop(clamp(st,0,1),"rgba(0,0,0,1)");
    g.addColorStop(clamp(e,0,1),"rgba(0,0,0,0)");
    g.addColorStop(1,"rgba(0,0,0,"+(e>=1.29?1:0)+")");
    mc.fillStyle = g; mc.fillRect(0,0,W,H);
  }
  function drawFinal(){ ctx.clearRect(0,0,W,H); ctx.drawImage(imgs.after,0,0,W,H); }
  function frame(ts){
    if(t0===null) t0 = ts;
    var t = (ts-t0)/1000;
    if(t>DUR){ playing=false; t=DUR; }
    var z = 1+0.006*(t/DUR), sx=0, sy=0;   // camera locked off, slow drift only
    ctx.save(); ctx.clearRect(0,0,W,H);
    ctx.translate(W/2+sx,H/2+sy); ctx.scale(z,z); ctx.translate(-W/2,-H/2);
    ctx.drawImage(imgs.before,0,0,W,H);
    if(t>=IMPACT){ drawMaskedAfter(smooth(Math.min(1,(t-IMPACT)/SWEEP))); ctx.drawImage(maskedAfter,0,0); }
    if(t>=FADE0){ ctx.globalAlpha=smooth(clamp((t-FADE0)/(FADE1-FADE0),0,1)); ctx.drawImage(imgs.after,0,0,W,H); ctx.globalAlpha=1; }
    for(var k=0;k<particles.length;k++){ var p=particles[k]; var age=t-p.t0; if(age<0||age>p.life) continue;
      var px=p.x+p.vx*age, py=p.y+p.vy*age+0.5*900*age*age;
      var r=p.r*(1+age*2.2), a=p.a*(1-age/p.life);
      var gd=ctx.createRadialGradient(px,py,0,px,py,r*1.6);
      gd.addColorStop(0,"rgba(206,172,126,"+a.toFixed(3)+")"); gd.addColorStop(1,"rgba(206,172,126,0)");
      ctx.fillStyle=gd; ctx.beginPath(); ctx.arc(px,py,r*1.6,0,7); ctx.fill();
    }
    ctx.restore();
    if(playing) requestAnimationFrame(frame);
  }
  function play(){ if(playing) return; if(reduce){ drawFinal(); return; } playing=true; t0=null; spawnDust(); requestAnimationFrame(frame); }

  Promise.all([load(IMG.before),load(IMG.after),load(IMG.mask)]).then(function(a){
    imgs = {before:a[0], after:a[1], mask:a[2]};
    maskedAfter = off(W,H);
    // The static <img> underlay shows the cracked-earth plate instantly (it is the
    // LCP element); the canvas stays transparent until the animation plays.
    if(reduce){ drawFinal(); return; }
    cvs.style.cursor = "pointer";
    cvs.addEventListener("click", play);
    // Start the scroll-triggered animation only after the page has painted, so the
    // fast <img> stays the Largest Contentful Paint. Replays on every re-entry.
    var start = function(){
      if("IntersectionObserver" in window){
        var io = new IntersectionObserver(function(entries){
          entries.forEach(function(e){ if(e.isIntersecting) play(); });
        }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });
        io.observe(cvs);
      } else {
        play();
      }
    };
    if(document.readyState === "complete") setTimeout(start, 400);
    else window.addEventListener("load", function(){ setTimeout(start, 400); });
  });
})();
