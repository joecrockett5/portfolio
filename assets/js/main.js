(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── Theme toggle ── */
  var themeToggle = document.getElementById('themeToggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function syncThemeMeta() {
    if (themeMeta) themeMeta.content = root.dataset.theme === 'light' ? '#f5f4ef' : '#0b0c0e';
  }
  syncThemeMeta();
  themeToggle.addEventListener('click', function () {
    var next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
    syncThemeMeta();
    hero.readColour();
  });

  /* ── Mobile menu ── */
  var menuToggle = document.getElementById('menuToggle');
  var navLinks = document.getElementById('navLinks');
  function setMenu(open) {
    navLinks.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuToggle.addEventListener('click', function () {
    setMenu(!navLinks.classList.contains('is-open'));
  });
  navLinks.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  /* ── Scroll: nav state, progress bar, parallax ── */
  var nav = document.getElementById('nav');
  var progressBar = document.getElementById('progressBar');
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var ticking = false;

  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle('is-stuck', y > 12);
    progressBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';

    if (!reduceMotion.matches) {
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var offset = (r.top + r.height / 2 - vh / 2) * -parseFloat(el.dataset.parallax);
        el.style.setProperty('--py', offset.toFixed(1) + 'px');
      });
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ── Reveal on scroll ── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ── Active nav link ── */
  var sectionLinks = {};
  navLinks.querySelectorAll('a').forEach(function (a) {
    sectionLinks[a.getAttribute('href').slice(1)] = a;
  });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = sectionLinks[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          Object.keys(sectionLinks).forEach(function (k) { sectionLinks[k].classList.remove('is-active'); });
          link.classList.add('is-active');
        } else {
          link.classList.remove('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(sectionLinks).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  /* ── Count-up stats ── */
  var counters = document.querySelectorAll('[data-count]');
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countObserver.unobserve(entry.target);
        var el = entry.target;
        var target = parseInt(el.dataset.count, 10);
        var start = null;
        var duration = 1100;
        el.textContent = '0';
        function step(now) {
          if (start === null) start = now;
          var t = Math.min((now - start) / duration, 1);
          var eased = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(step);
        }
        setTimeout(function () { requestAnimationFrame(step); }, 800);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { countObserver.observe(el); });
  }

  /* ── Demo videos: play only while on screen ── */
  var videos = document.querySelectorAll('video');
  function applyVideoMode() {
    videos.forEach(function (v) {
      if (reduceMotion.matches) {
        v.pause();
        v.controls = true; // let people start the demo themselves
      } else {
        v.controls = false;
      }
    });
  }
  applyVideoMode();
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', applyVideoMode);

  if ('IntersectionObserver' in window) {
    var videoObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (reduceMotion.matches) return;
        if (entry.isIntersecting) {
          var p = v.play();
          if (p && p.catch) p.catch(function () { v.controls = true; });
        } else {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.15 });
    videos.forEach(function (v) { videoObserver.observe(v); });
  }

  /* ── Pointer tilt on project media ── */
  if (finePointer && !reduceMotion.matches) {
    document.querySelectorAll('[data-tilt]').forEach(function (stage) {
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        stage.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
        stage.style.setProperty('--rx', (py * -6).toFixed(2) + 'deg');
      });
      stage.addEventListener('pointerleave', function () {
        stage.style.setProperty('--ry', '0deg');
        stage.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ── Spotlight on skill cards ── */
  if (finePointer) {
    document.querySelectorAll('[data-spot]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ── Copy email ── */
  var copyBtn = document.getElementById('copyEmail');
  var copyLabel = document.getElementById('copyLabel');
  copyBtn.addEventListener('click', function () {
    var email = copyBtn.dataset.email;
    function done(ok) {
      copyLabel.textContent = ok ? 'Copied' : 'Press Ctrl+C';
      copyBtn.classList.toggle('is-done', ok);
      setTimeout(function () {
        copyLabel.textContent = 'Copy';
        copyBtn.classList.remove('is-done');
      }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(function () { done(true); }, function () { done(false); });
    } else {
      done(false);
    }
  });

  document.getElementById('year').textContent = String(new Date().getFullYear());

  /* ── Hero: a dot field that ripples and leans away from the pointer ── */
  var hero = (function () {
    var canvas = document.getElementById('heroCanvas');
    var ctx = canvas.getContext('2d');
    var section = canvas.parentElement;
    var w = 0, h = 0, dpr = 1;
    var gap = 30;
    var colour = '241, 240, 234';
    var accent = '#c8f560';
    var pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    var running = false;
    var visible = true;
    var raf = 0;

    function readColour() {
      var cs = getComputedStyle(root);
      colour = cs.getPropertyValue('--dot').trim() || colour;
      accent = cs.getPropertyValue('--accent').trim() || accent;
      if (!running) draw(0);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = section.clientWidth;
      h = section.clientHeight;
      gap = w < 700 ? 24 : 30;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw(0);
    }

    function draw(time) {
      var t = time / 1000;
      ctx.clearRect(0, 0, w, h);
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;

      var radius = 190;
      for (var y = gap / 2; y < h; y += gap) {
        for (var x = gap / 2; x < w; x += gap) {
          // two travelling waves give a slow, cloth-like swell
          var wave = Math.sin(x * 0.012 + t * 0.9) + Math.cos(y * 0.016 - t * 0.7 + x * 0.004);
          var lift = wave * 0.5; // -1..1
          var dx = x - pointer.x;
          var dy = y - pointer.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var push = dist < radius ? 1 - dist / radius : 0;
          var ox = 0, oy = lift * 5;
          if (push > 0 && dist > 0.001) {
            var f = push * push * 22;
            ox += (dx / dist) * f;
            oy += (dy / dist) * f;
          }
          var size = 1 + (lift + 1) * 0.55 + push * 1.6;
          if (push > 0.05) {
            ctx.globalAlpha = 0.35 + push * 0.65;
            ctx.fillStyle = accent;
          } else {
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(' + colour + ',' + (0.1 + (lift + 1) * 0.11).toFixed(3) + ')';
          }
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, size, 0, 6.2832);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(time) {
      draw(time);
      raf = requestAnimationFrame(loop);
    }
    function update() {
      var should = visible && !document.hidden && !reduceMotion.matches;
      if (should && !running) { running = true; raf = requestAnimationFrame(loop); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }

    section.addEventListener('pointermove', function (e) {
      var r = section.getBoundingClientRect();
      pointer.tx = e.clientX - r.left;
      pointer.ty = e.clientY - r.top;
      if (pointer.x < -5000) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    });
    section.addEventListener('pointerleave', function () {
      pointer.tx = -9999;
      pointer.ty = -9999;
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        update();
      }).observe(section);
    }
    document.addEventListener('visibilitychange', update);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', update);
    window.addEventListener('resize', resize);

    readColour();
    resize();
    update();
    return { readColour: readColour };
  })();
})();
