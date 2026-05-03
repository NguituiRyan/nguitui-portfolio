/* ======================================================
   RYAN NGUITUI — BEYOND CANVAS PORTFOLIO
   Main JS: GSAP Magnetic Cursor · Image Cursor Trail ·
   Nav · Scroll Animations · Watermark · Mobile Menu
   ====================================================== */
'use strict';

/* ======================================================
   1. GSAP MAGNETIC CURSOR
   Adapted from the MagneticCursor React component.
   Requires GSAP loaded via CDN in <head>.
   Adds .has-magnetic-cursor on <html> on success so CSS can hide
   the native cursor only when the custom one is actually running.
   If GSAP fails to load (CDN down, slow network), the native
   cursor stays visible so visitors aren't left without one.
   ====================================================== */
(function initMagneticCursor() {
    var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    if (typeof gsap === 'undefined') {
        console.warn('[BeyondCanvas] GSAP not found — magnetic cursor disabled, native cursor used.');
        return;
    }

    const cursor = document.getElementById('magnetic-cursor');
    if (!cursor) return;

    document.documentElement.classList.add('has-magnetic-cursor');

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
})();


/* ======================================================
   2. IMAGE CURSOR TRAIL  (hero section)
   Adapted from image-cursor-trail React component.
   ====================================================== */
(function initImageCursorTrail() {
    var hero = document.getElementById('hero');
    if (!hero) return;
    var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

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
        { min: 1,    options: ['nice', 'oh hello', 'mm', 'hey there', 'noted'] },
        { min: 4,    options: ["you're into it", 'keep going', 'lovely', 'more more more', 'ooh'] },
        { min: 10,   options: ['still tapping?', 'ok ok', 'addicted yet?', 'hire me maybe?', 'tap tap tap'] },
        { min: 25,   options: ["i'm flattered", 'easy tiger', 'wow', 'your finger ok?', 'dedication'] },
        { min: 40,   options: ['are you procrastinating?', 'tell your boss i said hi', 'this counts as cardio'] },
        { min: 60,   options: ['ryan sees u', 'go outside', 'log off', 'the sun misses you', 'grass exists'] },
        { min: 90,   options: ['seriously?', 'you could be designing rn', 'this is art i guess'] },
        { min: 120,  options: ['this is your job now', 'genuinely concerned', 'professional tapper', 'put this on your CV'] },
        { min: 180,  options: ['your therapist should know', 'we need to talk', "i'm telling your mum"] },
        { min: 250,  options: ['you win nothing', 'earn a coffee', 'touch grass', 'ok legend', 'certified maniac'] },
        { min: 400,  options: ['nairobi is proud of you', 'strathmore did not teach this', 'you broke the simulation'] },
        { min: 600,  options: ['ryan owes you lunch now', 'this tap has a pension plan', 'call guinness world records'] },
        { min: 1000, options: ['1000. you absolute menace.', 'i have no more words', 'the button fears you'] }
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

    var inviteEl = document.getElementById('tap-invite');
    function inviteTap() {
        if (sessionTaps > 0) return;
        btn.classList.add('is-inviting');
        if (inviteEl) inviteEl.classList.add('is-calling');
        if (cueEl) {
            cueEl.textContent = 'tap me once';
            cueEl.classList.remove('is-flashing');
            void cueEl.offsetWidth;
            cueEl.classList.add('is-flashing');
        }
        setTimeout(function () {
            btn.classList.remove('is-inviting');
            if (inviteEl) inviteEl.classList.remove('is-calling');
        }, 2600);
    }

    if (!reduceMotion && 'IntersectionObserver' in window) {
        var inviteSeen = false;
        var inviteObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (inviteSeen || !entry.isIntersecting) return;
                inviteSeen = true;
                inviteTap();
                inviteObserver.disconnect();
            });
        }, { threshold: 0.55 });
        inviteObserver.observe(btn);
    }

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
        || window.matchMedia('(pointer: coarse)').matches
        || ('ontouchstart' in window && navigator.maxTouchPoints > 0)
        || window.innerWidth <= 768;

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
   11. CARD STACK — fan/deck layout for work section
       Ported from 21.dev CardStack (React → vanilla JS)
   ====================================================== */
(function initCardStack() {
    var PROJECTS = [
        {
            title: 'Modern Cushions',
            cat: 'Luxury Auto Seating',
            tag: 'Graphic Design · Web',
            img: 'img/projects/1.jpg',
            grad: 'linear-gradient(140deg,#5c1a1a,#1a0606)',
            problem: 'The brand sold premium vehicle upholstery, but the visuals needed to feel as polished as the product before customers reached out.',
            delivered: 'Brand-aligned social creatives, large-format banners, promotional posters, and web direction for a cleaner enquiry journey.',
            before: 'Scattered touchpoints made the offer feel less premium than the actual installation work.',
            after: 'A more consistent luxury look across Instagram, event banners, and customer-facing promos.',
            result: 'Cleaner brand perception, stronger event presence, and faster trust with customers comparing custom interior providers.'
        },
        {
            title: 'Zalika Africa',
            cat: 'Caregiver Training School',
            tag: 'Branding · Web',
            img: 'img/projects/2.jpg',
            grad: 'linear-gradient(140deg,#2c6e6b,#0d2625)',
            problem: 'A caregiver training school needed to look credible, warm, and organised for students, parents, and families hiring graduates.',
            delivered: 'Identity direction, print collateral, website visuals, and school-management interface direction.',
            before: 'The school needed a clearer visual system to explain its training value and build confidence.',
            after: 'A calmer, more trustworthy presentation with visuals that fit education, care, and enrolment.',
            result: 'Sharper public image, easier enrolment conversations, and a brand system that supports both digital and print communication.'
        },
        {
            title: 'Angawatch',
            cat: 'Flood Early-Warning System',
            tag: 'Brand · App · Pitch',
            img: 'img/projects/3.jpg',
            grad: 'linear-gradient(140deg,#0a3d62,#051d30)',
            problem: 'A climate-tech startup needed to explain flood-risk technology clearly to local communities, judges, and potential partners.',
            delivered: 'Logo direction, app visuals, pitch-deck design, diagrams, and competition-ready presentation assets.',
            before: 'The concept was strong, but needed a visual language that made the system easier to understand quickly.',
            after: 'A credible tech-for-impact identity that could work in pitch rooms and community-facing explanations.',
            result: 'More confident pitching, clearer storytelling, and stronger trust signals for partners evaluating the startup.'
        },
        {
            title: 'Strathmore University',
            cat: 'Event Creative & Assets',
            tag: 'Graphic Design · Video',
            img: 'img/projects/4.jpg',
            grad: 'linear-gradient(140deg,#0a3d7a,#03152e)',
            problem: 'Campus events needed posters and media that could cut through noisy WhatsApp groups, noticeboards, and social feeds.',
            delivered: 'Event posters, social assets, photography/video capture, and post-event content edits.',
            before: 'Event communication risked blending into the usual campus announcements.',
            after: 'Sharper event visuals built for quick recognition across screens, print, and social posts.',
            result: 'Better event visibility, stronger association presence, and reusable creative direction for student activities.'
        },
        {
            title: 'Yakoyo Restaurant',
            cat: 'Promotional Creative',
            tag: 'Graphic Design',
            img: 'img/projects/7.jpg',
            grad: 'linear-gradient(140deg,#c2540a,#3a1604)',
            problem: 'A food and events brand needed warm promotional designs that could make offers feel inviting before people arrived.',
            delivered: 'Seasonal posters, menu-style promotions, social media creatives, and event campaign visuals.',
            before: 'The offer needed more atmosphere and appetite appeal than a standard template could provide.',
            after: 'Distinctive, warm visuals that made the restaurant/event experience easier to imagine.',
            result: 'Stronger promotional presence, clearer event communication, and more booking-friendly social posts.'
        },
        {
            title: 'Flossytrukid',
            cat: 'Influencer / Content',
            tag: 'Graphic Design',
            img: 'img/projects/9.jpg',
            grad: 'linear-gradient(140deg,#8a1a5e,#2a0820)',
            problem: 'A creator needed business-facing posters and thumbnails that could compete in fast-moving social feeds.',
            delivered: 'Promotional posters, creator-brand assets, YouTube thumbnail direction, and visual systems for content drops.',
            before: 'Content needed stronger first-glance impact for audiences and potential brand partners.',
            after: 'Bolder, more clickable visuals with clearer hierarchy and creator personality.',
            result: 'Stronger online presentation, better content packaging, and a more professional look for collaborations.'
        },
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
                '<span class="stack-card-cta">Case study ↗</span>' +
            '</div>';

        el.addEventListener('click', function() {
            if (Math.abs(dragDeltaX) > 8) return;
            if (i === active) { openProjectModal(PROJECTS, i); }
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
   11b. PROJECT MODAL — supports prev/next so visitors can
   browse all projects without closing and re-clicking a card.
   ====================================================== */
(function initProjectModal() {
    var backdrop = document.getElementById('projModalBackdrop');
    var closeBtn = document.getElementById('projModalClose');
    var prevBtn  = document.getElementById('projModalPrev');
    var nextBtn  = document.getElementById('projModalNext');
    var imgEl    = document.getElementById('projModalImg');
    var tagEl    = document.getElementById('projModalTag');
    var titleEl  = document.getElementById('projModalTitle');
    var catEl    = document.getElementById('projModalCat');
    var caseEl   = document.getElementById('projModalCase');
    if (!backdrop) return;

    var list = [];
    var idx = 0;

    function paint() {
        var p = list[idx];
        imgEl.style.background = 'url(\'' + p.img + '\') center/cover no-repeat,' + p.grad;
        tagEl.textContent      = p.tag;
        titleEl.textContent    = p.title;
        catEl.textContent      = p.cat;
        caseEl.innerHTML =
            '<div class="case-grid">' +
                '<section class="case-block"><span>Client problem</span><p>' + p.problem + '</p></section>' +
                '<section class="case-block"><span>What I delivered</span><p>' + p.delivered + '</p></section>' +
                '<section class="case-block case-result"><span>Result</span><p>' + p.result + '</p></section>' +
            '</div>' +
            '<div class="case-visuals" aria-label="Before and after visual summary">' +
                '<div class="case-visual case-before"><span>Before</span><p>' + p.before + '</p></div>' +
                '<div class="case-visual case-after" style="background-image:linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.48)), url(\'' + p.img + '\');"><span>After</span><p>' + p.after + '</p></div>' +
            '</div>';
    }

    function step(dir) {
        if (!list.length) return;
        idx = (idx + dir + list.length) % list.length;
        paint();
    }

    window.openProjectModal = function(projects, startIdx) {
        list = projects;
        idx  = startIdx || 0;
        paint();
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
    if (prevBtn) prevBtn.addEventListener('click', function(e) { e.stopPropagation(); step(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function(e) { e.stopPropagation(); step(1); });
    backdrop.addEventListener('click', function(e) {
        if (e.target === backdrop) closeModal();
    });
    document.addEventListener('keydown', function(e) {
        if (!backdrop.classList.contains('is-open')) return;
        if (e.key === 'Escape')     closeModal();
        if (e.key === 'ArrowLeft')  step(-1);
        if (e.key === 'ArrowRight') step(1);
    });
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
    ctn.className = 'falling-pattern-ctn';
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
   12b. MAGIC TEXT — About paragraph word-by-word reveal
   Splits .about-desc-desktop / .about-desc-mobile into
   word-spans, then ScrollTrigger scrubs their opacity from
   0.18 → 1 as the paragraph passes through the viewport.
   Falls back to fully-visible text if GSAP/ScrollTrigger
   fails to load, or if user prefers reduced motion.
   ====================================================== */
(function initMagicText() {
    var targets = document.querySelectorAll('.about-desc-desktop, .about-desc-mobile');
    if (!targets.length) return;

    // Split words for every target so layout stays consistent
    // even when JS animation is skipped.
    targets.forEach(function(el) {
        var text = el.textContent.replace(/\s+/g, ' ').trim();
        var words = text.split(' ');
        el.innerHTML = words.map(function(w) {
            return '<span class="magic-word">' + w + '</span>';
        }).join(' ');
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    targets.forEach(function(el) {
        var spans = el.querySelectorAll('.magic-word');
        if (!spans.length) return;
        gsap.fromTo(spans,
            { opacity: 0.18 },
            {
                opacity: 1,
                ease: 'none',
                stagger: 0.04,
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    end: 'bottom 65%',
                    scrub: 0.6
                }
            }
        );
    });
})();


/* ======================================================
   13. STICKY SCROLL GALLERY — no JS needed, pure CSS sticky
   ====================================================== */


/* ======================================================
   14. LIGHT / DARK MODE TOGGLE
   Persists preference in localStorage. Respects system
   preference on first visit, then user choice overrides.
   ====================================================== */
(function initThemeToggle() {
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    var LS_KEY = 'bc_theme';
    var html = document.documentElement;

    function applyTheme(theme) {
        if (theme === 'light') {
            html.classList.add('light');
        } else {
            html.classList.remove('light');
        }
    }

    // Determine initial theme
    var stored = localStorage.getItem(LS_KEY);
    if (stored) {
        applyTheme(stored);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        applyTheme('light');
    }

    toggle.addEventListener('click', function() {
        var isLight = html.classList.contains('light');
        var next = isLight ? 'dark' : 'light';
        applyTheme(next);
        localStorage.setItem(LS_KEY, next);
    });
})();
