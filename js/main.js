/* ======================================================
   RYAN NGUITUI — BEYOND CANVAS PORTFOLIO
   Main JS: GSAP Magnetic Cursor · Image Cursor Trail ·
   Morphing Text Cursor · Nav · Scroll Animations ·
   Watermark · Mobile Menu
   ====================================================== */
'use strict';

/* ======================================================
   1. GSAP MAGNETIC CURSOR
   Adapted from the MagneticCursor React component.
   Requires GSAP loaded via CDN in <head>.
   ====================================================== */
(function initMagneticCursor() {
    if (typeof gsap === 'undefined') {
        console.warn('[BeyondCanvas] GSAP not found — magnetic cursor disabled.');
        return;
    }

    const cursor = document.getElementById('magnetic-cursor');
    if (!cursor) return;

    /* --- Simple Vec2 (replaces 'vecteur' npm dep) --- */
    function Vec2(x, y) { this.x = x || 0; this.y = y || 0; }
    Vec2.prototype.lerp = function(t, f) {
        this.x += (t.x - this.x) * f;
        this.y += (t.y - this.y) * f;
        return this;
    };
    Vec2.prototype.clone  = function() { return new Vec2(this.x, this.y); };
    Vec2.prototype.sub    = function(v) { this.x -= v.x; this.y -= v.y; return this; };
    Vec2.prototype.copy   = function(v) { this.x = v.x; this.y = v.y; return this; };

    /* --- Config (mirrors MagneticCursorProps defaults) --- */
    const CFG = {
        size:            40,
        lerpAmount:      0.10,
        magneticFactor:  0.55,
        hoverPadding:    12,
        speedMultiplier: 0.022,
        maxScaleX:       1.0,
        maxScaleY:       0.3,
    };

    const pos = {
        current:  new Vec2(-200, -200),
        target:   new Vec2(-200, -200),
        previous: new Vec2(-200, -200),
    };

    let isHovered    = false;
    let isDetaching  = false;
    let initialized  = false;

    /* Position cursor off-screen, centred via xPercent/yPercent */
    gsap.set(cursor, { xPercent: -50, yPercent: -50, x: -200, y: -200 });

    /* --- GSAP ticker: lerp + velocity squish --- */
    function tick() {
        if (isHovered) return;

        pos.current.lerp(pos.target, CFG.lerpAmount);

        const prev  = pos.previous.clone();
        const delta = pos.current.clone().sub(prev);
        pos.previous.copy(pos.current);

        const speed = Math.sqrt(delta.x * delta.x + delta.y * delta.y) * CFG.speedMultiplier;

        if (isDetaching) {
            gsap.set(cursor, {
                x: pos.current.x, y: pos.current.y,
                scaleX: 1, scaleY: 1, rotate: 0,
                overwrite: 'auto'
            });
        } else {
            gsap.set(cursor, {
                x: pos.current.x, y: pos.current.y,
                rotate: Math.atan2(delta.y, delta.x) * (180 / Math.PI),
                scaleX: 1 + Math.min(speed, CFG.maxScaleX),
                scaleY: 1 - Math.min(speed, CFG.maxScaleY),
                overwrite: 'auto'
            });
        }
    }
    gsap.ticker.add(tick);

    /* --- Mouse tracking --- */
    window.addEventListener('pointermove', function onFirst(e) {
        if (!initialized) {
            pos.current.x  = e.clientX;
            pos.current.y  = e.clientY;
            pos.previous.x = e.clientX;
            pos.previous.y = e.clientY;
            gsap.set(cursor, { x: e.clientX, y: e.clientY });
            gsap.to(cursor, { opacity: 1, duration: 0.4 });
            initialized = true;
        }
        pos.target.x = e.clientX;
        pos.target.y = e.clientY;

        const inView = e.clientX >= 0 && e.clientX <= window.innerWidth &&
                       e.clientY >= 0 && e.clientY <= window.innerHeight;
        gsap.to(cursor, { opacity: inView ? 1 : 0, duration: 0.2, overwrite: 'auto' });
    });

    document.addEventListener('mouseleave', () => gsap.to(cursor, { opacity: 0, duration: 0.3 }));
    document.addEventListener('mouseenter', () => {
        if (initialized) gsap.to(cursor, { opacity: 1, duration: 0.3 });
    });

    /* --- Magnetic elements: [data-magnetic] --- */
    document.querySelectorAll('[data-magnetic]').forEach(function(el) {
        var xTo = gsap.quickTo(el, 'x', { duration: 1,   ease: 'elastic.out(1, 0.3)' });
        var yTo = gsap.quickTo(el, 'y', { duration: 1,   ease: 'elastic.out(1, 0.3)' });

        el.addEventListener('pointerenter', function(e) {
            isHovered   = true;
            isDetaching = false;

            var b   = el.getBoundingClientRect();
            var pad = CFG.hoverPadding;
            var br  = window.getComputedStyle(el).borderRadius;
            var cx  = b.left + b.width  / 2;
            var cy  = b.top  + b.height / 2;

            gsap.killTweensOf(cursor);
            gsap.to(cursor, {
                x: cx, y: cy,
                width:        b.width  + pad * 2,
                height:       b.height + pad * 2,
                borderRadius: br,
                scaleX: 1, scaleY: 1, rotate: 0,
                duration: 0.3, ease: 'power3.out',
                overwrite: 'all'
            });
        });

        el.addEventListener('pointerleave', function() {
            var cx = gsap.getProperty(cursor, 'x');
            var cy = gsap.getProperty(cursor, 'y');
            pos.current.x  = cx; pos.current.y  = cy;
            pos.previous.x = cx; pos.previous.y = cy;

            isHovered   = false;
            isDetaching = true;

            gsap.killTweensOf(cursor);
            gsap.to(cursor, {
                width:        CFG.size,
                height:       CFG.size,
                borderRadius: '50%',
                scaleX: 1, scaleY: 1,
                duration: 0.35, ease: 'power3.out',
                overwrite: 'all',
                onComplete: function() { isDetaching = false; }
            });

            xTo(0); yTo(0);
        });

        var rafId = null;
        el.addEventListener('pointermove', function(e) {
            if (rafId) return;
            rafId = requestAnimationFrame(function() {
                var b = el.getBoundingClientRect();
                xTo((e.clientX - (b.left + b.width  / 2)) * CFG.magneticFactor);
                yTo((e.clientY - (b.top  + b.height / 2)) * CFG.magneticFactor);
                rafId = null;
            });
        });

        el.addEventListener('pointerout', function() { xTo(0); yTo(0); });
    });

    /* Touch devices: hide cursor */
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        cursor.style.display = 'none';
    }
})();


/* ======================================================
   2. IMAGE CURSOR TRAIL  (hero section)
   Adapted from image-cursor-trail React component.
   ====================================================== */
(function initImageCursorTrail() {
    var hero = document.getElementById('hero');
    if (!hero) return;
    var images = [
        "img/hero-cursor/1_20240801_203948_0000.png",
        "img/hero-cursor/1_20250601_123911_0000.png",
        "img/hero-cursor/1_20250621_002811_0000.png",
        "img/hero-cursor/20240725_094905_0000.png",
        "img/hero-cursor/3_20241222_171321_0002.png",
        "img/hero-cursor/4_20260221_183908_0003.png",
        "img/hero-cursor/Africa_20240414_214039_0000.png",
        "img/hero-cursor/AllSaintsTeensCamp.png",
        "img/hero-cursor/ArtExibitionPoster.png",
        "img/hero-cursor/Beige Pink Cream Modern Number Typography Graduation Party Invitation_20250526_153405_0000.png",
        "img/hero-cursor/Black White Simple House Logo_20241115_124548_0000.png",
        "img/hero-cursor/Copy of Green yellow blue elegant book club logo_20240429_124308_0000.png",
        "img/hero-cursor/Neon and Black Geometric Digital Marketing Logo_20251124_223847_0001.png",
        "img/hero-cursor/Purple White Modern laboratory Medical Service Flyer_20240524_083257_0000.png",
        "img/hero-cursor/Purple Yellow Modern Restaurant Food Menu Promotion Instagram Post_20240731_065248_0000.png",
        "img/hero-cursor/Yellow Bold Flea Market Event Poster_20251118_225448_0000.png"
    ];

    var MAX_IMAGES = 15;
    var DISTANCE   = 25;   /* window.innerWidth / DISTANCE = min px to trigger */

    var imgEls      = [];
    var globalIndex = 0;
    var last        = { x: 0, y: 0 };
    var currentZ    = 20;

    images.forEach(function(src) {
        var img = document.createElement('img');
        img.src            = src;
        img.alt            = '';
        img.className      = 'trail-img';
        img.dataset.status = 'inactive';
        img.loading        = 'lazy';
        img.draggable      = false;
        hero.appendChild(img);
        imgEls.push(img);
    });

    var activeStack = [];

    function activate(img, cx, cy) {
        var r = hero.getBoundingClientRect();
        img.style.left = (cx - r.left) + 'px';
        img.style.top  = (cy - r.top)  + 'px';
        if (currentZ > 60) currentZ = 20;
        img.style.zIndex   = currentZ++;
        img.dataset.status = 'active';
        last = { x: cx, y: cy };
        
        var idx = activeStack.indexOf(img);
        if (idx > -1) activeStack.splice(idx, 1);
        activeStack.push(img);
    }

    function deactivate(img) {
        if (!img) return;
        img.dataset.status = 'inactive';
        var idx = activeStack.indexOf(img);
        if (idx > -1) activeStack.splice(idx, 1);
    }

    function distFromLast(x, y) {
        return Math.hypot(x - last.x, y - last.y);
    }

    var hideTimeout;
    var vanishTimeout;

    function startVanishing() {
        if (activeStack.length === 0) return;
        var img = activeStack.shift(); 
        deactivate(img);
        if (activeStack.length > 0) {
            vanishTimeout = setTimeout(startVanishing, 60);
        }
    }

    function onMove(cx, cy) {
        if (distFromLast(cx, cy) < window.innerWidth / DISTANCE) return;
        var lead = imgEls[globalIndex % imgEls.length];
        var tail = imgEls[(globalIndex - MAX_IMAGES + imgEls.length) % imgEls.length];
        
        if (lead) activate(lead, cx, cy);
        if (tail && tail !== lead) deactivate(tail);
        globalIndex++;

        clearTimeout(hideTimeout);
        clearTimeout(vanishTimeout);
        hideTimeout = setTimeout(startVanishing, 150);
    }

    hero.addEventListener('mousemove', function(e) { onMove(e.clientX, e.clientY); });
    hero.addEventListener('touchmove', function(e) {
        e.preventDefault();
        onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
})();


/* ======================================================
   3. MORPHING CURSOR TEXT
   Adapted from MagneticText React component.
   White circle follows mouse over [data-morph] elements;
   counter-transform keeps hover-text centred.
   ====================================================== */
(function initMorphingCursors() {
    document.querySelectorAll('[data-morph]').forEach(function(el) {
        var hoverText = el.dataset.morph;
        if (!hoverText) return;

        // Ensure el is positioned so absolute overlay aligns perfectly
        el.style.position = 'relative';

        // Create overlay container masking effect
        var overlay = document.createElement('div');
        overlay.className = 'morph-overlay';
        
        var label = document.createElement('span');
        label.className = 'morph-hover-text';
        // Allow <br> in data-morph for multi-line reveals matching the base layout.
        // Source is always a static HTML attribute we control, so no XSS surface.
        label.innerHTML = hoverText;

        overlay.appendChild(label);
        el.appendChild(overlay);

        var mousePos   = { x: el.offsetWidth / 2, y: el.offsetHeight / 2 };
        var currentPos = { x: el.offsetWidth / 2, y: el.offsetHeight / 2 };
        var raf;
        var r = 0; // current radius
        var targetR = 0; // target radius

        function lerp(a, b, f) { return a + (b - a) * f; }

        function animate() {
            currentPos.x = lerp(currentPos.x, mousePos.x, 0.15);
            currentPos.y = lerp(currentPos.y, mousePos.y, 0.15);
            r = lerp(r, targetR, 0.15);

            overlay.style.clipPath = 'circle(' + r + 'px at ' + currentPos.x + 'px ' + currentPos.y + 'px)';

            raf = requestAnimationFrame(animate);
        }
        raf = requestAnimationFrame(animate);

        el.addEventListener('mousemove', function(e) {
            var rect = el.getBoundingClientRect();
            mousePos.x = e.clientX - rect.left;
            mousePos.y = e.clientY - rect.top;
        });

        el.addEventListener('mouseenter', function(e) {
            var rect = el.getBoundingClientRect();
            mousePos.x = e.clientX - rect.left;
            mousePos.y = e.clientY - rect.top;
            currentPos.x = mousePos.x;
            currentPos.y = mousePos.y;
            targetR = 160; // mask radius increased from 90
            overlay.classList.add('active');
        });

        el.addEventListener('mouseleave', function() {
            targetR = 0;
            overlay.classList.remove('active');
        });
    });
})();


/* ======================================================
   3b. TYPEWRITER (contact title)
   Cycles through "Let's <word>." with a typing+deleting
   rhythm. Words come from data-words on the target span.
   ====================================================== */
(function initTypewriter() {
    var el = document.getElementById('tw-text');
    if (!el) return;

    var raw = el.getAttribute('data-words') || '';
    var words = raw.split('|').map(function (w) { return w.trim(); }).filter(Boolean);
    if (!words.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = words[0];
        return;
    }

    var wIdx = 0;
    var cIdx = words[0].length; // start fully typed for the initial word
    el.textContent = words[0];
    var deleting = true;
    var holdAfterType = 1700;
    var holdAfterClear = 240;

    function step() {
        var word = words[wIdx];

        if (!deleting) {
            cIdx++;
            el.textContent = word.slice(0, cIdx);
            if (cIdx >= word.length) {
                deleting = true;
                setTimeout(step, holdAfterType);
                return;
            }
            setTimeout(step, 75 + Math.random() * 60);
        } else {
            cIdx--;
            el.textContent = word.slice(0, Math.max(0, cIdx));
            if (cIdx <= 0) {
                deleting = false;
                wIdx = (wIdx + 1) % words.length;
                setTimeout(step, holdAfterClear);
                return;
            }
            setTimeout(step, 38);
        }
    }
    setTimeout(step, holdAfterType);
})();


/* ======================================================
   3c. TAP COUNTER — live, juicy, communal
   Fetches a global tally via abacus.jasoncameron.dev,
   increments on click with bump + particles + +1 float.
   Falls back to localStorage if the API is unreachable.
   ====================================================== */
(function initTapCounter() {
    var btn = document.getElementById('tap-counter-btn');
    var numEl = document.getElementById('tap-counter-number');
    var cueEl = document.getElementById('arcade-cue-text');
    if (!btn || !numEl) return;

    // Cheeky cue lines, sorted by min session-tap count.
    // The longer you tap, the more ridiculous it gets.
    var QUIPS = [
        { min: 0,    options: ['press to play'] },
        { min: 1,    options: ['nice', 'oh hello', 'mm'] },
        { min: 4,    options: ["you're into it", 'keep going', 'lovely'] },
        { min: 10,   options: ['still tapping?', 'ok ok', 'addicted yet?'] },
        { min: 25,   options: ["i'm flattered", 'easy tiger', 'wow'] },
        { min: 60,   options: ['ryan sees u', 'go outside', 'log off'] },
        { min: 120,  options: ['this is your job now', 'genuinely concerned'] },
        { min: 250,  options: ['you win nothing', 'earn a coffee', 'touch grass'] }
    ];
    function getQuip(count) {
        var tier = QUIPS[0];
        for (var i = QUIPS.length - 1; i >= 0; i--) {
            if (count >= QUIPS[i].min) { tier = QUIPS[i]; break; }
        }
        var opts = tier.options;
        return opts[Math.floor(Math.random() * opts.length)];
    }
    var sessionTaps = 0;
    var lastQuip = '';
    function flashQuip() {
        if (!cueEl) return;
        var next = getQuip(sessionTaps);
        // Avoid same quip twice in a row when the tier has multiple options
        var safety = 0;
        while (next === lastQuip && safety++ < 4) next = getQuip(sessionTaps);
        lastQuip = next;
        cueEl.textContent = next;
        cueEl.classList.remove('is-flashing');
        void cueEl.offsetWidth; // restart animation
        cueEl.classList.add('is-flashing');
    }

    var NS = 'beyond-canvas';
    var KEY = 'portfolio-taps';
    var GET_URL = 'https://abacus.jasoncameron.dev/get/' + NS + '/' + KEY;
    var HIT_URL = 'https://abacus.jasoncameron.dev/hit/' + NS + '/' + KEY;
    var LS_KEY = 'bc_tap_count_v1';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var current = 0;
    var apiOK = true;
    var pendingHits = 0;
    var hitTimer = null;

    function format(n) {
        // Arcade-style: pad to 4 digits min so the readout has a fixed width feel.
        // Beyond 9999, fall back to comma-grouped natural width.
        var v = Math.max(0, Math.round(n));
        if (v < 10000) return String(v).padStart(4, '0');
        return v.toLocaleString('en-US');
    }

    function setNumber(n) {
        numEl.textContent = format(Math.max(0, Math.round(n)));
    }

    // Animate 0 → target on first paint
    function countUpTo(target) {
        if (reduceMotion || target <= 0) {
            setNumber(target);
            return;
        }
        var start = performance.now();
        var dur = Math.min(1400, 600 + Math.log10(Math.max(10, target)) * 220);
        var from = 0;
        function tick(now) {
            var t = Math.min(1, (now - start) / dur);
            var eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
            setNumber(from + (target - from) * eased);
            if (t < 1) requestAnimationFrame(tick);
            else setNumber(target);
        }
        requestAnimationFrame(tick);
    }

    // Initial fetch — try API, fall back to localStorage, fall back to 0
    function loadInitial() {
        var stored = parseInt(localStorage.getItem(LS_KEY) || '0', 10) || 0;
        if (!('fetch' in window)) {
            current = stored;
            countUpTo(current);
            apiOK = false;
            return;
        }
        fetch(GET_URL, { method: 'GET', cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (data && typeof data.value === 'number') {
                    current = Math.max(stored, data.value);
                    countUpTo(current);
                } else {
                    apiOK = false;
                    current = stored;
                    countUpTo(current);
                }
            })
            .catch(function () {
                apiOK = false;
                current = stored;
                countUpTo(current);
            });
    }

    // Batch API hits so rapid taps don't spam the network
    function flushHits() {
        if (!apiOK || pendingHits <= 0) return;
        var batch = pendingHits;
        pendingHits = 0;
        // abacus.jasoncameron.dev increments by 1 per call. For batches >1
        // we issue parallel hits — small portfolio, not worth queueing logic.
        for (var i = 0; i < batch; i++) {
            fetch(HIT_URL, { method: 'GET', cache: 'no-store' }).catch(function () {
                apiOK = false;
            });
        }
    }
    function queueHit() {
        pendingHits++;
        if (hitTimer) clearTimeout(hitTimer);
        hitTimer = setTimeout(flushHits, 350);
    }

    // Visual: bump the number
    function bumpNumber() {
        if (reduceMotion) return;
        numEl.classList.remove('is-bumping');
        // force reflow so animation restarts on rapid taps
        void numEl.offsetWidth;
        numEl.classList.add('is-bumping');
    }

    // Visual: spawn +1 at click coords
    function spawnPlusOne(x, y) {
        if (reduceMotion) return;
        var p = document.createElement('span');
        p.className = 'tap-plus';
        p.textContent = '+1';
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        btn.appendChild(p);
        setTimeout(function () { p.remove(); }, 1100);
    }

    // Visual: spawn 7 particles bursting outward
    var particleColors = [
        'rgba(255, 200, 120, 0.95)',
        'rgba(255, 230, 180, 0.95)',
        'rgba(160, 200, 255, 0.9)',
        'rgba(255, 180, 200, 0.9)',
        '#f5ede0'
    ];
    function spawnParticles(x, y) {
        if (reduceMotion) return;
        var count = 7;
        for (var i = 0; i < count; i++) {
            var p = document.createElement('span');
            p.className = 'tap-particle';
            var angle = (Math.PI * 2 * i) / count + (Math.random() * 0.7 - 0.35);
            var dist = 60 + Math.random() * 60;
            p.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
            p.style.setProperty('--dy', (Math.sin(angle) * dist).toFixed(1) + 'px');
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.background = particleColors[i % particleColors.length];
            btn.appendChild(p);
            (function (node) {
                setTimeout(function () { node.remove(); }, 950);
            })(p);
        }
    }

    // Click handler — local optimistic increment + visuals + queued API hit
    var lastTap = 0;
    var pressTimer = null;
    function handleTap(ev) {
        var now = performance.now();
        if (now - lastTap < 40) return; // hard floor against repeat-fire
        lastTap = now;

        current += 1;
        sessionTaps += 1;
        setNumber(current);
        bumpNumber();
        flashQuip();
        localStorage.setItem(LS_KEY, String(current));

        // Hold the "pressed" state long enough that keyboard/programmatic
        // taps still feel like a real press, not just a flicker.
        btn.classList.add('is-pressed');
        if (pressTimer) clearTimeout(pressTimer);
        pressTimer = setTimeout(function () {
            btn.classList.remove('is-pressed');
        }, 130);

        var rect = btn.getBoundingClientRect();
        var x, y;
        if (ev && ev.clientX != null) {
            x = ev.clientX - rect.left;
            y = ev.clientY - rect.top;
        } else {
            x = rect.width / 2;
            y = rect.height / 2;
        }
        spawnPlusOne(x, y);
        spawnParticles(x, y);

        if (navigator.vibrate) {
            try { navigator.vibrate(8); } catch (e) {}
        }

        queueHit();
    }

    btn.addEventListener('click', handleTap);
    btn.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            handleTap(ev);
        }
    });

    // Make sure any unsent hits go out before unload
    window.addEventListener('pagehide', flushHits);
    window.addEventListener('beforeunload', flushHits);

    loadInitial();
})();


/* ======================================================
   4. TESTIMONIAL CIRCLE REVEAL
   Desktop: clip-path circle follows cursor.
   Touch: tap toggles full reveal (CSS .is-revealed class).
   Auto-demo: first testimonial plays a one-shot reveal when
   it scrolls into view so users learn the interaction.
   ====================================================== */
(function initTestimonialReveal() {
    var isTouch = window.matchMedia('(hover: none)').matches
        || ('ontouchstart' in window && navigator.maxTouchPoints > 0);

    var wraps = Array.from(document.querySelectorAll('.testi-text-wrap'));
    if (!wraps.length) return;

    wraps.forEach(function(wrap, i) {
        var reveal = wrap.querySelector('.testi-reveal');
        if (!reveal) return;

        if (isTouch) {
            // Mobile path: tap flips the 3D card. CSS handles the rotateY transition.
            var hasInteracted = false;
            function flip() {
                wrap.classList.toggle('is-flipped');
                if (!hasInteracted) {
                    hasInteracted = true;
                    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
                }
            }
            wrap.addEventListener('click', flip);
            wrap.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    flip();
                }
            });
            return;
        }

        // Desktop: cursor-following circle
        var mousePos   = { x: 0, y: 0 };
        var currentPos = { x: 0, y: 0 };
        var r = 0, targetR = 0;
        var demoActive = false;

        function lerp(a, b, f) { return a + (b - a) * f; }

        function animate() {
            currentPos.x = lerp(currentPos.x, mousePos.x, 0.14);
            currentPos.y = lerp(currentPos.y, mousePos.y, 0.14);
            r = lerp(r, targetR, 0.12);
            reveal.style.clipPath =
                'circle(' + r + 'px at ' + currentPos.x + 'px ' + currentPos.y + 'px)';
            requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);

        wrap.addEventListener('mousemove', function(e) {
            if (demoActive) return;
            var rect = wrap.getBoundingClientRect();
            mousePos.x = e.clientX - rect.left;
            mousePos.y = e.clientY - rect.top;
        });

        wrap.addEventListener('mouseenter', function(e) {
            if (demoActive) return;
            var rect = wrap.getBoundingClientRect();
            mousePos.x = e.clientX - rect.left;
            mousePos.y = e.clientY - rect.top;
            currentPos.x = mousePos.x;
            currentPos.y = mousePos.y;
            targetR = 360;
        });

        wrap.addEventListener('mouseleave', function() {
            if (demoActive) return;
            targetR = 0;
        });

        // Expose demo hooks for the IntersectionObserver below
        wrap._playDemo = function() {
            if (demoActive) return;
            demoActive = true;
            var rect = wrap.getBoundingClientRect();
            mousePos.x = rect.width / 2;
            mousePos.y = rect.height / 2;
            currentPos.x = mousePos.x;
            currentPos.y = mousePos.y;
            targetR = 480;
            setTimeout(function() { targetR = 0; }, 1400);
            setTimeout(function() { demoActive = false; }, 2400);
        };
    });

    // Auto-demo first testimonial when section enters view.
    // Mobile: a one-shot flip-and-back so users see the gesture.
    // Desktop: a soft cursor-circle reveal.
    var firstWrap = wraps[0];
    if (firstWrap && 'IntersectionObserver' in window) {
        var demoed = false;
        var io = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && !demoed) {
                    demoed = true;
                    setTimeout(function() {
                        if (isTouch) {
                            firstWrap.classList.add('is-flipped');
                            setTimeout(function() {
                                firstWrap.classList.remove('is-flipped');
                            }, 1900);
                        } else if (typeof firstWrap._playDemo === 'function') {
                            firstWrap._playDemo();
                        }
                    }, 500);
                    io.unobserve(firstWrap);
                }
            });
        }, { threshold: 0.55 });
        io.observe(firstWrap);
    }
})();


/* ======================================================
   6. NAVIGATION — scroll state + active section
   ====================================================== */
var nav = document.getElementById('nav');

window.addEventListener('scroll', function() {
    nav.classList.toggle('scrolled', window.scrollY > 32);
    highlightActive();
}, { passive: true });

var sections = document.querySelectorAll('section[id]');
var navLinks  = document.querySelectorAll('.nav-link[href^="#"]');

function highlightActive() {
    var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
    var current = '';
    sections.forEach(function(s) {
        if (window.scrollY >= s.offsetTop - navH - 80) current = s.id;
    });
    navLinks.forEach(function(l) {
        l.classList.toggle('active', l.getAttribute('href') === '#' + current);
    });
}


/* ======================================================
   5. SMOOTH SCROLL
   ====================================================== */
document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
        var id = a.getAttribute('href');
        if (id === '#') return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH - 16, behavior: 'smooth' });
        closeMobileMenu();
    });
});


/* ======================================================
   6. MOBILE MENU
   ====================================================== */
var burger     = document.getElementById('burger');
var mobileMenu = document.getElementById('mobile-menu');

function openMobileMenu() {
    burger.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}
function closeMobileMenu() {
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}
if (burger) burger.addEventListener('click', function() {
    burger.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
});
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeMobileMenu(); });
window.addEventListener('resize', function() { if (window.innerWidth > 768) closeMobileMenu(); }, { passive: true });


/* ======================================================
   7. SCROLL-TRIGGERED FADE-UP
   ====================================================== */
var fadeObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            fadeObs.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -56px 0px' });

document.querySelectorAll('.fade-up').forEach(function(el) { fadeObs.observe(el); });


/* ======================================================
   8. WATERMARK — appears after scrolling past work section
   ====================================================== */
(function initWatermark() {
    var watermark   = document.getElementById('ryan-watermark');
    var workSection = document.getElementById('work');
    if (!watermark || !workSection) return;

    var obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            watermark.classList.toggle('show', !entry.isIntersecting && window.scrollY > workSection.offsetTop);
        });
    }, { threshold: 0.05 });

    obs.observe(workSection);
})();


/* ======================================================
   9. PROJECT CARDS — subtle 3-D tilt
   ====================================================== */
if (!window.matchMedia('(hover: none)').matches) {
    document.querySelectorAll('.project-card').forEach(function(card) {
        var img = card.querySelector('.project-img');
        if (!img) return;

        card.addEventListener('mousemove', function(e) {
            var r  = card.getBoundingClientRect();
            var dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
            var dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
            img.style.transform = 'perspective(700px) rotateY(' + (dx * 4) + 'deg) rotateX(' + (-dy * 3) + 'deg) scale(0.97)';
        });
        card.addEventListener('mouseleave', function() { img.style.transform = ''; });
    });
}


/* ======================================================
   10. MARQUEE — pause on touch
   ====================================================== */
var mTrack = document.querySelector('.marquee-track');
if (mTrack) {
    mTrack.addEventListener('touchstart', function() { mTrack.style.animationPlayState = 'paused'; }, { passive: true });
    mTrack.addEventListener('touchend',   function() { mTrack.style.animationPlayState = 'running'; }, { passive: true });
}


/* ======================================================
   11. CARD STACK — fan/deck layout for work section
       Ported from 21.dev CardStack (React → vanilla JS)
   ====================================================== */
(function initCardStack() {
    var PROJECTS = [
        { title: 'Modern Cushions',       cat: 'Luxury Auto Seating',             tag: 'Graphic Design · Web',      img: 'img/projects/1.jpg',  grad: 'linear-gradient(140deg,#5c1a1a,#1a0606)',
          desc: 'Modern Cushions manufactures and installs premium custom seat upholstery for vehicles across Nairobi. Their clientele is aspirational — buyers who want their car interiors to reflect the same quality as the rest of their lifestyle. The brief was clear: make everything look as premium as the product itself. I came on board as the brand\'s full creative retainer — responsible for every visual touchpoint, from the daily Instagram grid to the massive banners that anchor their presence at trade expos and automotive shows across Kenya.' },
        { title: 'Zalika Africa',          cat: 'Caregiver Training School',        tag: 'Branding · Web',            img: 'img/projects/2.jpg',  grad: 'linear-gradient(140deg,#2c6e6b,#0d2625)',
          desc: 'Zalika Africa trains and certifies caregivers across Kenya — a profession that carries enormous responsibility and deserves to be presented with corresponding seriousness and warmth. The school needed a visual identity that communicated trustworthiness to both students and the families who would employ their graduates. I led the end-to-end brand build: from the initial logo concept through to the physical print collateral used at their open days, and ultimately the website and a custom school management system for tracking enrolments, schedules, and certifications.' },
        { title: 'Angawatch',             cat: 'Flood Early-Warning System',      tag: 'Brand · App · Pitch',       img: 'img/projects/3.jpg',  grad: 'linear-gradient(140deg,#0a3d62,#051d30)',
          desc: 'Angawatch is a flood early-warning system and cognitive community platform built to protect lives and livelihoods in flood-prone regions of Kenya. I co-founded the venture and lead all visual design — from the initial logo through to the pitch materials used at international competitions. The design challenge was significant: we needed a brand that felt credible to both local communities we serve and international judges, investors, and tech organisations evaluating our work.' },
        { title: 'Strathmore University', cat: 'Event Creative & Assets',         tag: 'Graphic Design · Video',    img: 'img/projects/4.jpg',  grad: 'linear-gradient(140deg,#0a3d7a,#03152e)',
          desc: 'SCESA — the Strathmore Computing & Engineering Students Association — hosts a regular calendar of events: team-building days, hackathons, panel discussions, and industry networking sessions. As the designer embedded within the Strathmore community, I was the natural choice to handle their event creative and on-the-ground content capture. The work spanned both digital and physical: poster designs created and distributed to noticeboards and WhatsApp groups ahead of events, plus live shooting and post-production editing of video content published on the association\'s social channels.' },
        { title: 'Yakoyo Restaurant',     cat: 'Promotional Creative',             tag: 'Graphic Design',            img: 'img/projects/7.jpg',  grad: 'linear-gradient(140deg,#c2540a,#3a1604)',
          desc: 'Yakoyo is a Nairobi brand operating in the food, events, and hospitality space — an industry where visual presence directly drives footfall and bookings. In a competitive market flooded with generic templates, they needed creative that felt distinctive: warm, inviting, and unmistakably theirs. I was brought on to design a promotional poster series for their events and seasonal offerings. Each poster needed to communicate the atmosphere of the experience before anyone set foot through the door.' },
        { title: 'Flossytrukid',          cat: 'Influencer / Content',            tag: 'Graphic Design',            img: 'img/projects/9.jpg',  grad: 'linear-gradient(140deg,#8a1a5e,#2a0820)',
          desc: 'FlossyTruKid is a Kenyan content creator building an audience across YouTube and social platforms — someone whose growth depends on the immediate impact of their visual presence. In the creator economy, a thumbnail has under 200 milliseconds to convince a viewer to click. I was brought in to elevate the visual quality across both business-facing and audience-facing creative: promotional business posters for partnerships and brand collaborations, and a YouTube thumbnail system that could consistently outperform competing content in a crowded feed.' },
    ];

    /* --- geometry constants --- */
    var SPREAD_DEG    = 60;
    var MAX_OFFSET    = 3;   /* maxVisible=7 → floor(7/2)=3 */
    var OVERLAP       = 0.48;
    var DEPTH_PX      = 140;
    var TILT_X        = 12;
    var LIFT_PX       = 22;
    var ACTIVE_SCALE  = 1.03;
    var INACTIVE_SCALE= 0.94;
    var DRAG_THRESH   = 80;
    var MOBILE_BP     = 768;

    var len    = PROJECTS.length;
    var active = 0;
    var dragStartX  = 0;
    var dragDeltaX  = 0;
    var dragging    = false;

    var stage  = document.getElementById('card-stack-stage');
    var dotsCt = document.getElementById('card-stack-dots');
    if (!stage || !dotsCt) return;

    function isMobile() { return window.innerWidth <= MOBILE_BP; }

    function getParams() {
        var mob = isMobile();
        var cw  = mob ? 220 : 480;
        var ch  = mob ? 300 : 600;
        var mo  = mob ? 2 : MAX_OFFSET;
        return {
            cw: cw, ch: ch,
            maxOff:  mo,
            spacing: Math.round(cw * (1 - OVERLAP)),
            stepDeg: SPREAD_DEG / mo,
        };
    }

    function wrap(n) { return ((n % len) + len) % len; }

    function signedOff(i, a) {
        var raw = i - a;
        var alt = raw > 0 ? raw - len : raw + len;
        return Math.abs(alt) < Math.abs(raw) ? alt : raw;
    }

    /* --- Build card DOM --- */
    var cardEls = [];
    PROJECTS.forEach(function(p, i) {
        var el = document.createElement('div');
        el.className = 'stack-card';
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', p.title);
        el.innerHTML =
            '<div class="stack-card-bg" style="background:url(\'' + p.img + '\') center/cover no-repeat,' + p.grad + ';"></div>' +
            '<div class="stack-card-overlay"></div>' +
            '<div class="stack-card-content">' +
                '<div class="stack-card-text">' +
                    '<div class="stack-card-tag">' + p.tag + '</div>' +
                    '<div class="stack-card-title">' + p.title + '</div>' +
                    '<div class="stack-card-cat">' + p.cat + '</div>' +
                '</div>' +
                '<span class="stack-card-cta">View ↗</span>' +
            '</div>';

        el.addEventListener('click', function() {
            if (Math.abs(dragDeltaX) > 8) return;
            if (i === active) { openProjectModal(p); }
            else { setActive(i); }
        });

        stage.appendChild(el);
        cardEls.push(el);
    });

    /* --- Build dots --- */
    var dotEls = [];
    PROJECTS.forEach(function(p, i) {
        var btn = document.createElement('button');
        btn.className = 'stack-dot';
        btn.setAttribute('aria-label', 'Go to ' + p.title);
        btn.addEventListener('click', function() { setActive(i); });
        dotsCt.appendChild(btn);
        dotEls.push(btn);
    });

    /* --- Layout engine --- */
    function render() {
        var p = getParams();
        stage.style.height = Math.max(380, p.ch + 100) + 'px';

        cardEls.forEach(function(el, i) {
            el.style.width      = p.cw + 'px';
            el.style.height     = p.ch + 'px';
            el.style.marginLeft = (-p.cw / 2) + 'px';

            var off = signedOff(i, active);
            var abs = Math.abs(off);
            var visible = abs <= MAX_OFFSET;

            if (!visible) {
                el.style.opacity       = '0';
                el.style.pointerEvents = 'none';
                el.style.zIndex        = '0';
                return;
            }

            var isAct    = off === 0;
            var rotZ     = off * p.stepDeg;
            var x        = off * p.spacing;
            var y        = abs * 10 + (isAct ? -LIFT_PX : 0);
            var z        = -abs * DEPTH_PX;
            var scale    = isAct ? ACTIVE_SCALE : INACTIVE_SCALE;
            var rotX     = isAct ? 0 : TILT_X;

            el.style.opacity       = '1';
            el.style.pointerEvents = 'auto';
            el.style.zIndex        = String(100 - abs);
            el.style.transform     =
                'translateX(' + x + 'px) ' +
                'translateY(' + y + 'px) ' +
                'translateZ(' + z + 'px) ' +
                'rotateX(' + rotX + 'deg) ' +
                'rotateZ(' + rotZ + 'deg) ' +
                'scale(' + scale + ')';

            el.classList.toggle('is-active', isAct);
        });

        dotEls.forEach(function(d, i) {
            d.classList.toggle('is-active', i === active);
        });
    }

    function setActive(idx) {
        active = wrap(idx);
        render();
    }

    /* --- Keyboard --- */
    stage.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft')  setActive(active - 1);
        if (e.key === 'ArrowRight') setActive(active + 1);
    });

    /* --- Mouse drag (active card only) --- */
    stage.addEventListener('mousedown', function(e) {
        var card = e.target.closest('.stack-card');
        if (!card || cardEls.indexOf(card) !== active) return;
        dragging   = true;
        dragStartX = e.clientX;
        dragDeltaX = 0;
        e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        dragDeltaX = e.clientX - dragStartX;
    });
    document.addEventListener('mouseup', function(e) {
        if (!dragging) return;
        dragging = false;
        var d = e.clientX - dragStartX;
        dragDeltaX = d;
        if      (d >  DRAG_THRESH) setActive(active - 1);
        else if (d < -DRAG_THRESH) setActive(active + 1);
        setTimeout(function() { dragDeltaX = 0; }, 120);
    });

    /* --- Touch swipe --- */
    stage.addEventListener('touchstart', function(e) {
        dragStartX = e.touches[0].clientX;
        dragDeltaX = 0;
        dragging   = true;
    }, { passive: true });
    stage.addEventListener('touchmove', function(e) {
        if (!dragging) return;
        dragDeltaX = e.touches[0].clientX - dragStartX;
    }, { passive: true });
    stage.addEventListener('touchend', function() {
        if (!dragging) return;
        dragging = false;
        if      (dragDeltaX >  DRAG_THRESH) setActive(active - 1);
        else if (dragDeltaX < -DRAG_THRESH) setActive(active + 1);
        setTimeout(function() { dragDeltaX = 0; }, 120);
    });

    /* --- Resize --- */
    window.addEventListener('resize', render);

    /* --- Init --- */
    render();
})();

/* ======================================================
   11b. PROJECT MODAL
   ====================================================== */
(function initProjectModal() {
    var backdrop = document.getElementById('projModalBackdrop');
    var closeBtn = document.getElementById('projModalClose');
    var imgEl    = document.getElementById('projModalImg');
    var tagEl    = document.getElementById('projModalTag');
    var titleEl  = document.getElementById('projModalTitle');
    var catEl    = document.getElementById('projModalCat');
    var descEl   = document.getElementById('projModalDesc');
    if (!backdrop) return;

    window.openProjectModal = function(p) {
        imgEl.style.background  = 'url(\'' + p.img + '\') center/cover no-repeat,' + p.grad;
        tagEl.textContent        = p.tag;
        titleEl.textContent      = p.title;
        catEl.textContent        = p.cat;
        descEl.textContent       = p.desc;
        backdrop.setAttribute('aria-hidden', 'false');
        backdrop.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
    };

    function closeModal() {
        backdrop.classList.remove('is-open');
        backdrop.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', function(e) {
        if (e.target === backdrop) closeModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal();
    });
})();

/* ======================================================
   11c. IMAGE GALLERY — work showcase above contact
   ====================================================== */
(function initGallery() {
    var IMGS = [
        'img/hero-cursor/1_20240801_203948_0000.png',
        'img/hero-cursor/1_20250601_123911_0000.png',
        'img/hero-cursor/1_20250621_002811_0000.png',
        'img/hero-cursor/20240725_094905_0000.png',
        'img/hero-cursor/3_20241222_171321_0002.png',
        'img/hero-cursor/4_20260221_183908_0003.png',
        'img/hero-cursor/Africa_20240414_214039_0000.png',
        'img/hero-cursor/AllSaintsTeensCamp.png',
        'img/hero-cursor/ArtExibitionPoster.png',
        'img/hero-cursor/Beige Pink Cream Modern Number Typography Graduation Party Invitation_20250526_153405_0000.png',
        'img/hero-cursor/Black White Simple House Logo_20241115_124548_0000.png',
        'img/hero-cursor/Copy of Green yellow blue elegant book club logo_20240429_124308_0000.png',
        'img/hero-cursor/Neon and Black Geometric Digital Marketing Logo_20251124_223847_0001.png',
        'img/hero-cursor/Purple White Modern laboratory Medical Service Flyer_20240524_083257_0000.png',
        'img/hero-cursor/Purple Yellow Modern Restaurant Food Menu Promotion Instagram Post_20240731_065248_0000.png',
        'img/hero-cursor/Yellow Bold Flea Market Event Poster_20251118_225448_0000.png',
    ];

    var stage    = document.getElementById('galleryStage');
    var reelEl   = document.getElementById('galleryReel');
    if (!stage) return;

    var W       = 140;    /* card width  (px) */
    var H       = 210;    /* card height (px) */
    var OVERLAP = 100;    /* negative margin overlap */
    var MAX_H   = 100;    /* max vertical stagger (centre card) */
    var HOVER_Y = -148;   /* lift height on hover */

    var len  = IMGS.length;
    var mid  = (len - 1) / 2;
    var step = MAX_H / mid;

    var cards = [];

    function mkT(y) {
        return 'perspective(1200px) rotateY(-40deg) translateY(' + y + 'px)';
    }

    /* --- Desktop 3D fan --- */
    IMGS.forEach(function(src, i) {
        var dist    = Math.abs(i - mid);
        var stagger = Math.max(6, MAX_H - dist * step);
        var baseY   = -stagger;

        var el  = document.createElement('div');
        el.className      = 'gallery-card';
        el.style.width    = W + 'px';
        el.style.height   = H + 'px';
        el.style.zIndex   = String(len - i);
        if (i > 0) el.style.marginLeft = (-OVERLAP) + 'px';
        el.style.opacity  = '0';
        el.style.transform = mkT(200);

        var img       = document.createElement('img');
        img.src       = encodeURI(src);
        img.alt       = '';
        img.loading   = 'lazy';
        img.draggable = false;
        el.appendChild(img);
        stage.appendChild(el);
        cards.push({ el: el, baseY: baseY });

        el.addEventListener('mouseenter', function() {
            cards.forEach(function(c, j) {
                c.el.style.transition = 'transform 0.18s cubic-bezier(0.16,1,0.3,1)';
                c.el.style.transform  = mkT(j === i ? HOVER_Y : 0);
            });
        });
        el.addEventListener('mouseleave', function() {
            cards.forEach(function(c) {
                c.el.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1)';
                c.el.style.transform  = mkT(c.baseY);
            });
        });
    });

    /* --- Mobile reel (duplicate for seamless loop) --- */
    if (reelEl) {
        var track = reelEl.querySelector('.gallery-reel-track');
        if (track) {
            IMGS.concat(IMGS).forEach(function(src) {
                var el  = document.createElement('div');
                el.className  = 'gallery-reel-card';
                var img       = document.createElement('img');
                img.src       = encodeURI(src);
                img.alt       = '';
                img.loading   = 'lazy';
                img.draggable = false;
                el.appendChild(img);
                track.appendChild(el);
            });
        }
    }

    /* --- Entrance animation --- */
    var triggered = false;
    var obs = new IntersectionObserver(function(entries) {
        if (!entries[0].isIntersecting || triggered) return;
        triggered = true;
        cards.forEach(function(c, i) {
            var delay = i * 40;
            c.el.style.transition = 'transform 0.85s cubic-bezier(0.16,1,0.3,1) ' + delay + 'ms, opacity 0.55s ease ' + delay + 'ms';
            c.el.style.opacity    = '1';
            c.el.style.transform  = mkT(c.baseY);
        });
        obs.disconnect();
    }, { threshold: 0.15 });
    obs.observe(document.getElementById('gallery') || stage);
})();

/* ======================================================
   12. HERO FALLING PATTERN
       Vanilla JS port of React Falling Pattern from 21st.dev
   ====================================================== */
(function initFallingPattern() {
    var color = 'rgba(255, 255, 255, 1.0)'; // Maximum visibility white elements
    var bg = '#000000'; // Match site bg

    var patterns = [
        "radial-gradient(4px 100px at 0px 235px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 235px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 117.5px, " + color + " 100%, transparent 150%)",
        "radial-gradient(4px 100px at 0px 252px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 252px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 126px, " + color + " 100%, transparent 150%)",
        "radial-gradient(4px 100px at 0px 150px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 150px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 75px, " + color + " 100%, transparent 150%)",
        "radial-gradient(4px 100px at 0px 253px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 253px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 126.5px, " + color + " 100%, transparent 150%)",
        "radial-gradient(4px 100px at 0px 204px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 204px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 102px, " + color + " 100%, transparent 150%)",
        "radial-gradient(4px 100px at 0px 134px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 134px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 67px, " + color + " 100%, transparent 150%)",
        "radial-gradient(4px 100px at 0px 179px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 179px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 89.5px, " + color + " 100%, transparent 150%)",
        "radial-gradient(4px 100px at 0px 299px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 299px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 149.5px, " + color + " 100%, transparent 150%)",
        "radial-gradient(4px 100px at 0px 215px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 215px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 107.5px, " + color + " 100%, transparent 150%)",
        "radial-gradient(4px 100px at 0px 281px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 281px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 140.5px, " + color + " 100%, transparent 150%)",
        "radial-gradient(4px 100px at 0px 158px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 158px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 79px, " + color + " 100%, transparent 150%)",
        "radial-gradient(4px 100px at 0px 210px, " + color + ", transparent)", "radial-gradient(4px 100px at 300px 210px, " + color + ", transparent)", "radial-gradient(1.5px 1.5px at 150px 105px, " + color + " 100%, transparent 150%)"
    ].join(', ');

    var sizes = [
        "300px 235px", "300px 235px", "300px 235px", "300px 252px", "300px 252px", "300px 252px", "300px 150px", "300px 150px", "300px 150px", "300px 253px", "300px 253px", "300px 253px", "300px 204px", "300px 204px", "300px 204px", "300px 134px", "300px 134px", "300px 134px", "300px 179px", "300px 179px", "300px 179px", "300px 299px", "300px 299px", "300px 299px", "300px 215px", "300px 215px", "300px 215px", "300px 281px", "300px 281px", "300px 281px", "300px 158px", "300px 158px", "300px 158px", "300px 210px", "300px 210px", "300px 210px"
    ].join(', ');

    var ctn = document.createElement('div');
    ctn.style.cssText = "position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; opacity: 0; transition: opacity 1.5s ease 0.5s;";
    
    var layer = document.createElement('div');
    layer.style.cssText = "position: absolute; inset: 0; z-index: 0; background-color: " + bg + "; background-image: " + patterns + "; background-size: " + sizes + "; animation: fallingBg 150s linear infinite;";
    
    var overlay = document.createElement('div');
    var overlayPattern = "radial-gradient(circle at 50% 50%, transparent 0, transparent 2px, " + bg + " 2px)";
    overlay.style.cssText = "position: absolute; inset: 0; z-index: 1; backdrop-filter: blur(1em); -webkit-backdrop-filter: blur(1em); background-image: " + overlayPattern + "; background-size: 8px 8px;";
    
    ctn.appendChild(layer);
    ctn.appendChild(overlay);
    
    // Inject globally
    document.body.insertBefore(ctn, document.body.firstChild);
    
    // Fade in gracefully
    setTimeout(function() { requestAnimationFrame(function() { ctn.style.opacity = '1'; }); }, 500);
})();


/* ======================================================
   13. ZOOM PARALLAX (Vanilla port of 21.dev ZoomParallax)
   Force auto-scrolls through the zoom in the direction of
   travel — both downward (entering from above) and upward
   (re-entering from below). Cannot be aborted mid-flight;
   the only way out is to wait for it to land.
   ====================================================== */
(function initZoomParallax() {
    var ctn = document.getElementById('zoom-parallax');
    if (!ctn) return;

    var layers = Array.from(ctn.querySelectorAll('.zoom-layer'));
    if (!layers.length) return;

    var isAutoScrolling = false;
    var inZoomPhase = false;
    var prevTop = null;
    var prevBottom = null;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function easeInOutCubic(t) {
        return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
    }

    // direction: 'down' scrolls past the bottom of the zoom; 'up' scrolls back above its top
    function autoScrollThroughZoom(direction) {
        if (isAutoScrolling || reducedMotion) return;

        var rect = ctn.getBoundingClientRect();
        var vh = window.innerHeight;
        var startY = window.pageYOffset || document.documentElement.scrollTop;

        var distance;
        if (direction === 'down') {
            // Travel until the section's bottom hits the viewport bottom (zoom phase ends).
            distance = (rect.bottom - vh) + 8;
        } else {
            // Travel until the section's top is just below the viewport top (zoom phase ends going up).
            distance = rect.top - 8; // rect.top is negative here, so this is a negative distance
        }
        if (Math.abs(distance) <= 40) return;

        isAutoScrolling = true;

        var startTime = performance.now();
        var duration = Math.min(2600, 700 + Math.abs(distance) * 0.5);

        function step(now) {
            var t = Math.min(1, (now - startTime) / duration);
            var eased = easeInOutCubic(t);
            window.scrollTo(0, startY + distance * eased);

            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                isAutoScrolling = false;
            }
        }
        requestAnimationFrame(step);
    }

    function tick() {
        var rect = ctn.getBoundingClientRect();
        var vh = window.innerHeight;
        var progress = 0;
        var nowInZoom = rect.top <= 0 && rect.bottom > vh;

        // Trigger on transitions INTO the zoom phase from either direction.
        // Skip the first sample so a mid-zoom reload doesn't fire spuriously.
        if (!isAutoScrolling && prevTop !== null && prevBottom !== null && !inZoomPhase && nowInZoom) {
            // Entering downward: section's top crossed the viewport top.
            if (prevTop > 0) {
                autoScrollThroughZoom('down');
            }
            // Entering upward: section's bottom crossed the viewport bottom.
            else if (prevBottom <= vh) {
                autoScrollThroughZoom('up');
            }
        }

        inZoomPhase = nowInZoom;
        prevTop = rect.top;
        prevBottom = rect.bottom;

        if (rect.top <= 0) {
            var totalScroll = rect.height - vh;
            if (totalScroll > 0) {
                progress = Math.max(0, Math.min(1, -rect.top / totalScroll));
            }
        }

        var isMob = window.innerWidth <= 768;

        layers.forEach(function(layer) {
            var targetScale = parseFloat(layer.getAttribute('data-scale-target')) || 4;
            if (isMob) {
                targetScale = targetScale * 2; // Double the target zoom on mobile to compensate for 1.5X starting layout
            }
            var currentScale = 1 + progress * (targetScale - 1);
            layer.style.transform = 'scale(' + currentScale + ')';
        });
    }

    if (typeof gsap !== 'undefined' && gsap.ticker) {
        gsap.ticker.add(tick);
    } else {
        window.addEventListener('scroll', function() { requestAnimationFrame(tick); }, { passive: true });
    }
})();
