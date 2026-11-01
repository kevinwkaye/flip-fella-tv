/* Flip Fella TV. Plain ES5 so the 2016 Samsung browser engine (and old iPads) can run it.
   A port of flip-fella-desk: same cards, glyphs, characters and behaviour, laid out as
   "Bottom spots": the clock fills the top of the screen and the character sits under it
   on the left, centre or right, moving to another spot every minute or two. */
(function () {
  'use strict';

  // ---------- glyphs ----------
  var G = {};
  (function () {
    for (var ch in GLYPHS) {
      if (!GLYPHS.hasOwnProperty(ch)) continue;
      var t = GLYPHS[ch][1].split(' '), cmds = [], i = 0, minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      var pt = function () {
        var x = parseFloat(t[i]), y = -parseFloat(t[i + 1]); i += 2;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        return [x, y];
      };
      while (i < t.length) {
        var c = t[i++];
        if (c === '') continue;
        if (c === 'M' || c === 'L') { var p = pt(); cmds.push([c, p[0], p[1]]); }
        else if (c === 'Q') { var a = pt(), e = pt(); cmds.push(['Q', a[0], a[1], e[0], e[1]]); }
        else if (c === 'C') { var a1 = pt(), b1 = pt(), e1 = pt(); cmds.push(['C', a1[0], a1[1], b1[0], b1[1], e1[0], e1[1]]); }
        else if (c === 'Z') cmds.push(['Z']);
      }
      G[ch] = { adv: GLYPHS[ch][0], cmds: cmds, box: [minX, minY, maxX, maxY] };
    }
  })();
  var Z0 = G['0'].box, ZERO_MID = -(Z0[1] + Z0[3]) / 2, ZERO_H = (Z0[3] - Z0[1]) / GLYPH_UPM;

  function inkBox(text) {
    var x = 0, b = [1e9, 1e9, -1e9, -1e9];
    for (var i = 0; i < text.length; i++) {
      var g = G[text.charAt(i)];
      if (!g) { x += GLYPH_UPM * .5; continue; }
      if (g.cmds.length) {
        b[0] = Math.min(b[0], x + g.box[0]); b[2] = Math.max(b[2], x + g.box[2]);
        b[1] = Math.min(b[1], g.box[1]); b[3] = Math.max(b[3], g.box[3]);
      }
      x += g.adv;
    }
    return b;
  }
  function textWidth(text, em) { var b = inkBox(text); return b[2] < b[0] ? 0 : (b[2] - b[0]) * em / GLYPH_UPM; }
  function emForGlyphHeight(h) { return h / ZERO_H; }

  // Draws text centred horizontally on its ink at cx and vertically on the digit line at cy.
  function drawText(ctx, text, em, cx, cy, fill) {
    var b = inkBox(text), s = em / GLYPH_UPM, x = 0;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-(b[0] + b[2]) / 2, ZERO_MID);
    ctx.beginPath();
    for (var i = 0; i < text.length; i++) {
      var g = G[text.charAt(i)];
      if (g) {
        for (var j = 0; j < g.cmds.length; j++) {
          var c = g.cmds[j];
          if (c[0] === 'M') ctx.moveTo(x + c[1], c[2]);
          else if (c[0] === 'L') ctx.lineTo(x + c[1], c[2]);
          else if (c[0] === 'Q') ctx.quadraticCurveTo(x + c[1], c[2], x + c[3], c[4]);
          else if (c[0] === 'C') ctx.bezierCurveTo(x + c[1], c[2], x + c[3], c[4], x + c[5], c[6]);
          else ctx.closePath();
        }
        x += g.adv;
      } else x += GLYPH_UPM * .5;
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  // ---------- cards ----------
  var FLIP = 0.52, HI = '#252525', MID = '#1b1b1b', LOW = '#141414', INK = '#f3f0e8', PIN = '#3c3c3c', BG = '#050505';

  function Card(x, y, w, h, em) { this.x = x; this.y = y; this.w = w; this.h = h; this.em = em; this.cur = null; this.prev = null; this.start = -10; }
  Card.prototype.set = function (v, now, animate) {
    if (v === this.cur) return false;
    this.prev = this.cur; this.cur = v;
    this.start = (animate && this.prev !== null) ? now : -10;
    return true;
  };
  Card.prototype.animating = function (now) { return now - this.start < FLIP; };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function half(ctx, c, top, text, dark) {
    if (text === null) return;
    var mid = c.y + c.h / 2, hy = top ? c.y : mid, rad = Math.min(c.w, c.h) * .06;
    ctx.save();
    roundRect(ctx, c.x, c.y, c.w, c.h, rad); ctx.clip();
    ctx.beginPath(); ctx.rect(c.x, hy, c.w, c.h / 2); ctx.clip();
    var gr = ctx.createLinearGradient(0, hy - 1, 0, hy + c.h / 2 + 1);
    gr.addColorStop(0, top ? HI : MID); gr.addColorStop(1, top ? MID : LOW);
    ctx.fillStyle = gr; ctx.fillRect(c.x, hy, c.w, c.h / 2);
    drawText(ctx, text, c.em, c.x + c.w / 2, mid, INK);
    if (dark > .01) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, dark).toFixed(3) + ')'; ctx.fillRect(c.x, hy, c.w, c.h / 2); }
    ctx.restore();
  }

  function drawCard(ctx, c, now) {
    var mid = c.y + c.h / 2;
    if (!c.animating(now)) { half(ctx, c, true, c.cur, 0); half(ctx, c, false, c.cur, 0); }
    else {
      var p = (now - c.start) / FLIP, q, s;
      half(ctx, c, true, c.cur, 0); half(ctx, c, false, c.prev, 0);
      ctx.save();
      if (p < .5) {
        q = p / .5; q = q * q; s = Math.cos(q * Math.PI / 2);
        ctx.translate(0, mid); ctx.scale(1, Math.max(.005, s)); ctx.translate(0, -mid);
        half(ctx, c, true, c.prev, .55 * q);
      } else {
        q = (p - .5) / .5; q = 1 - (1 - q) * (1 - q); s = Math.sin(q * Math.PI / 2);
        ctx.translate(0, mid); ctx.scale(1, Math.max(.005, s)); ctx.translate(0, -mid);
        half(ctx, c, false, c.cur, .5 * (1 - q));
      }
      ctx.restore();
    }
    var hh = Math.max(2, c.h * .012), pw = Math.max(3, c.w * .03), ph = c.h * .09;
    ctx.fillStyle = '#000'; ctx.fillRect(c.x, mid - hh / 2, c.w, hh);
    ctx.fillStyle = PIN; ctx.fillRect(c.x - pw, mid - ph / 2, pw, ph); ctx.fillRect(c.x + c.w, mid - ph / 2, pw, ph);
  }

  // ---------- characters ----------
  var KINDS = ['pebble', 'drip', 'bean'], NAMES = { pebble: 'Pebble', drip: 'Drip', bean: 'Bean' };
  var C_INK = '#0b0b12', C_LINE = '#f3f0e8';
  var EYES = { pebble: [[78, 88, 17, 8.5], [122, 88, 17, 8.5]], drip: [[100, 76, 26, 13]], bean: [[82, 84, 16, 8], [120, 78, 16, 8]] };
  var MOUTH = { pebble: [100, 126], drip: [100, 121], bean: [101, 121] };
  var CLOSED = { pebble: [[66, 92, 78, 101, 90, 92], [110, 92, 122, 101, 134, 92]], drip: [[78, 82, 100, 98, 122, 82]], bean: [[70, 88, 82, 96, 94, 87], [108, 82, 120, 89, 132, 79]] };
  var PH = [], SP = [];
  (function () { var seed = 7; function r() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; } for (var i = 0; i < 8; i++) { PH[i] = r() * Math.PI * 2; SP[i] = .5 + r() * .6; } })();

  function ellipse(ctx, cx, cy, rx, ry) { ctx.save(); ctx.translate(cx, cy); ctx.scale(rx, ry); ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.restore(); }

  function pebblePath(ctx, t, slow) {
    var N = 8, pts = [], i;
    for (i = 0; i < N; i++) {
      var a = i / N * Math.PI * 2 - Math.PI / 2;
      var r = 1 + .055 * Math.sin(t * SP[i] * slow + PH[i]) + .025 * Math.sin(t * 1.7 * slow + PH[i] * 2);
      var flat = (a > 0 && a < Math.PI) ? .94 : 1;
      pts.push([100 + Math.cos(a) * 74 * r, 98 + Math.sin(a) * 64 * r * flat]);
    }
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (i = 0; i < N; i++) {
      var p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    ctx.closePath();
  }

  function dripPath(ctx, t, slow) {
    slow *= .9; var hb = 134;
    ctx.beginPath(); ctx.moveTo(34, 88);
    ctx.bezierCurveTo(34, 46, 62, 18, 100, 18); ctx.bezierCurveTo(138, 18, 166, 46, 166, 88);
    ctx.lineTo(166, hb);
    for (var k = 0; k < 4; k++) {
      var x0 = 166 - 33 * k, x1 = x0 - 33, dep = 22 + 9 * Math.sin(t * .8 * slow + k * 1.7);
      ctx.bezierCurveTo(x0, hb + dep, x1, hb + dep, x1, hb);
    }
    ctx.closePath();
  }

  function inkPen(ctx, w) { ctx.strokeStyle = C_INK; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }

  function drawFace(ctx, k, pose) {
    var eyes = EYES[k], i, e;
    inkPen(ctx, 6);
    for (i = 0; i < eyes.length; i++) {
      var lift = eyes.length === 1 ? Math.max(pose.browL, pose.browR) : (i === 0 ? pose.browL : pose.browR);
      if (lift <= 0) continue;
      e = eyes[i]; var r0 = e[2] * pose.eyeBig, by = e[1] - r0 - 8 - lift * 6;
      ctx.beginPath(); ctx.moveTo(e[0] - r0 * .85, by + 2); ctx.quadraticCurveTo(e[0], by - 5 - lift * 3, e[0] + r0 * .85, by + 2); ctx.stroke();
    }
    if (pose.eyes === 'open') {
      for (i = 0; i < eyes.length; i++) {
        e = eyes[i]; var r = e[2] * pose.eyeBig, pr = e[3] * pose.pupil, free = r - pr - 2;
        ctx.save(); ctx.translate(e[0], e[1]); ctx.scale(1, Math.max(.06, pose.eyeOpen));
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C_INK; ctx.beginPath(); ctx.arc(pose.gazeX * free, pose.gazeY * free, pr, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    } else {
      var cl = CLOSED[k];
      for (i = 0; i < cl.length; i++) {
        var c = cl[i]; ctx.beginPath();
        if (pose.eyes === 'closed') { ctx.moveTo(c[0], c[1]); ctx.quadraticCurveTo(c[2], c[3], c[4], c[5]); }
        else { var my = (c[1] + c[5]) / 2; ctx.moveTo(c[0], c[1] - 2); ctx.quadraticCurveTo(c[2], my - (c[3] - my) - 6, c[4], c[5] - 2); }
        ctx.stroke();
      }
    }
    var mc = MOUTH[k];
    ctx.fillStyle = C_INK;
    if (pose.mouth === 'o') { ellipse(ctx, mc[0], mc[1], pose.mouthW, pose.mouthH); ctx.fill(); }
    else if (pose.mouth === 'sleep') { ctx.beginPath(); ctx.moveTo(mc[0] - 6, mc[1] + 1); ctx.lineTo(mc[0] + 6, mc[1] + 1); ctx.stroke(); }
    else if (pose.mouth === 'open') {
      var top = mc[1] - 9;
      ctx.beginPath(); ctx.moveTo(mc[0] - 14, top); ctx.lineTo(mc[0] + 14, top);
      ctx.quadraticCurveTo(mc[0] + 14, top + 21, mc[0], top + 21); ctx.quadraticCurveTo(mc[0] - 14, top + 21, mc[0] - 14, top); ctx.closePath();
      ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = '#ff6b8a'; ellipse(ctx, mc[0], top + 16.5, 7, 4.5); ctx.fill(); ctx.restore();
    } else if (k === 'drip') { ellipse(ctx, 100, 120, 7, 8.5); ctx.fill(); }
    else {
      ctx.beginPath();
      if (k === 'bean') { ctx.moveTo(86, 120); ctx.quadraticCurveTo(102, 128, 116, 110); }
      else { ctx.moveTo(90, 120); ctx.quadraticCurveTo(100, 130, 110, 120); }
      ctx.stroke();
    }
  }

  function drawSparks(ctx, a) {
    if (a <= .01) return;
    ctx.strokeStyle = 'rgba(255,210,74,' + Math.min(1, a).toFixed(3) + ')'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    var degs = [-160, -125, -90, -55, -20], grow = 6 * a;
    for (var i = 0; i < degs.length; i++) {
      var rad = degs[i] * Math.PI / 180, r0 = 92, r1 = 104 + grow;
      ctx.beginPath();
      ctx.moveTo(100 + Math.cos(rad) * r0, 96 + Math.sin(rad) * r0 * .95);
      ctx.lineTo(100 + Math.cos(rad) * r1, 96 + Math.sin(rad) * r1 * .95);
      ctx.stroke();
    }
  }

  function drawZzz(ctx, t) {
    var zs = [[158, 40, 22, 0, 'z'], [166, 30, 17, 2, 'z'], [154, 44, 26, 4, 'Z']];
    for (var i = 0; i < zs.length; i++) {
      var z = zs[i], p = (((t - z[3]) % 6) + 6) % 6 / 6;
      var op = p < .25 ? p / .25 * .9 : .9 * (1 - (p - .25) / .75);
      drawText(ctx, z[4], z[2] * (.6 + .55 * p), z[0] + 14 * p, z[1] - 46 * p, 'rgba(243,240,232,' + op.toFixed(3) + ')');
    }
  }

  // Draws the character with its viewbox point (100,100) at (cx,cy), one viewbox unit = scale pixels.
  function drawCharacter(ctx, k, pose, cx, cy, scale) {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-100, -100);
    drawSparks(ctx, pose.sparks);
    ctx.save();
    ctx.translate(100, 170 + pose.bobY); ctx.scale(pose.scaleX, pose.scaleY); ctx.translate(-100, -170);
    if (k === 'pebble') {
      ctx.save(); ctx.translate(7, 9); pebblePath(ctx, pose.t, pose.slow); ctx.fillStyle = '#2329a8'; ctx.fill(); ctx.restore();
      pebblePath(ctx, pose.t, pose.slow); ctx.fillStyle = '#4d5bff'; ctx.fill();
    } else if (k === 'drip') {
      dripPath(ctx, pose.t, pose.slow); ctx.fillStyle = '#a98bff'; ctx.fill();
    } else {
      ctx.save(); ctx.translate(100, 92); ctx.rotate(-12 * Math.PI / 180); ctx.translate(-100, -92);
      ellipse(ctx, 108, 100, 58, 72); ctx.strokeStyle = C_LINE; ctx.lineWidth = 4; ctx.stroke();
      ellipse(ctx, 100, 92, 58, 72); ctx.fillStyle = '#ff4f9a'; ctx.fill();
      ctx.restore();
    }
    drawFace(ctx, k, pose);
    ctx.restore();
    if (pose.zzz) drawZzz(ctx, pose.t);
    ctx.restore();
  }

  // ---------- behaviour ----------
  function ease(p) { p = Math.max(0, Math.min(1, p)); return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  var STARTLE = .9, LOOK = 1.7, CHEER = 2, YAWN = 2.6;
  var SPOTS = [.18, .5, .82];

  function Animator() {
    this.started = false; this.last = -1;
    this.blinkStart = -10; this.blink2 = -10; this.glanceStart = -10; this.glanceDur = 0;
    this.startleStart = -10; this.cheerStart = -10; this.yawnStart = -10;
    this.spot = 1; this.fromX = 0; this.toX = 0; this.moveStart = -10; this.moveDur = 0; this.x = 0;
    this.gx = 0; this.gy = -.6;
  }
  Animator.prototype.minute = function (now, hour) { if (hour) this.cheerStart = now; else this.startleStart = now; };
  Animator.prototype.busy = function (now) {
    return now - this.startleStart < STARTLE + LOOK || now - this.cheerStart < CHEER || now - this.yawnStart < YAWN || now - this.moveStart < this.moveDur;
  };
  Animator.prototype.move = function (now, W) {
    var opts = [], i;
    for (i = 0; i < SPOTS.length; i++) if (i !== this.spot) opts.push(i);
    this.spot = opts[Math.floor(Math.random() * opts.length)];
    this.fromX = this.x; this.toX = SPOTS[this.spot] * W;
    this.moveStart = now; this.moveDur = 1 + Math.abs(this.toX - this.fromX) / W * 3.2;
    this.nextMove = now + 60 + Math.random() * 60;
  };
  Animator.prototype.update = function (now, asleep, hourOfDay, L) {
    var W = L.W;
    if (!this.started) {
      this.started = true; this.last = now;
      this.nextBlink = now + 1.5; this.nextGlance = now + 8 + Math.random() * 10;
      this.nextYawn = now + 150 + Math.random() * 150; this.nextMove = now + 60 + Math.random() * 60;
      this.x = this.toX = SPOTS[this.spot] * W;
    }
    var dt = Math.max(0, Math.min(.2, now - this.last)); this.last = now;
    var pose = { t: now, slow: asleep ? .45 : 1, bobY: 0, scaleX: 1, scaleY: 1, gazeX: 0, gazeY: 0, eyeOpen: 1, eyeBig: 1, pupil: 1,
      eyes: 'open', browL: 0, browR: 0, mouth: 'smile', mouthW: 7, mouthH: 9, sparks: 0, zzz: false };
    var b = (1 - Math.cos(2 * Math.PI * now / (asleep ? 7 : 4.6))) / 2;
    pose.bobY = 3 * b; pose.scaleX = 1 + .02 * b; pose.scaleY = 1 - .025 * b;

    // hop between spots
    var ms = now - this.moveStart, moving = ms >= 0 && ms < this.moveDur;
    if (moving) {
      var u = ms / this.moveDur;
      this.x = this.fromX + (this.toX - this.fromX) * ease(u);
      var hops = Math.max(2, Math.round(this.moveDur * 2.2)), j = Math.abs(Math.sin(u * hops * Math.PI));
      pose.bobY -= 16 * j; pose.scaleX *= 1 - .04 * j; pose.scaleY *= 1 + .05 * j;
    } else this.x = this.toX;

    if (asleep) { pose.eyes = 'closed'; pose.mouth = 'sleep'; pose.zzz = true; return pose; }

    if (now >= this.nextGlance) {
      if (!this.busy(now)) { this.glanceStart = now; this.glanceX = Math.random() * 2 - 1; this.glanceY = Math.random() * 1.6 - 1; this.glanceBrow = Math.floor(Math.random() * 3); this.glanceDur = 1.5 + Math.random() * 1.5; }
      this.nextGlance = now + 20 + Math.random() * 20;
    }
    if (now >= this.nextYawn) {
      if (!this.busy(now)) this.yawnStart = now;
      this.nextYawn = now + (hourOfDay >= 16 ? 120 + Math.random() * 120 : 240 + Math.random() * 240);
    }
    if (now >= this.nextMove) { if (!this.busy(now)) this.move(now, W); else this.nextMove = now + 10; }
    if (now >= this.nextBlink) {
      this.blinkStart = now; this.blink2 = Math.random() < .25 ? now + .26 : -10;
      this.nextBlink = now + 2.5 + Math.random() * 4.5;
    }

    // home gaze: up at the cards
    var tx = Math.max(-1, Math.min(1, (L.clockX - this.x) / (W * .35))) * .8, ty = -.65;
    if (now - this.glanceStart < this.glanceDur) { tx = this.glanceX; ty = this.glanceY; if (this.glanceBrow === 1) pose.browR = .9; else if (this.glanceBrow === 2) pose.browL = .9; }
    var ss = now - this.startleStart;
    if (ss >= 0 && ss < STARTLE + LOOK) { tx = Math.max(-1, Math.min(1, (L.minuteX - this.x) / (W * .2))) * .9; ty = -.8; }
    if (moving) { tx = this.toX > this.fromX ? .9 : -.9; ty = 0; }
    var kk = Math.min(1, dt * 9);
    this.gx += (tx - this.gx) * kk; this.gy += (ty - this.gy) * kk;
    pose.gazeX = this.gx; pose.gazeY = this.gy;

    var bl = [this.blinkStart, this.blink2];
    for (var i = 0; i < 2; i++) { var p = now - bl[i]; if (p >= 0 && p < .14) pose.eyeOpen = Math.min(pose.eyeOpen, Math.abs(p / .07 - 1)); }

    if (ss >= 0 && ss < STARTLE) {
      var sp = ss / STARTLE;
      pose.eyeBig = 1.12; pose.pupil = .72; pose.browL = pose.browR = 1; pose.mouth = 'o'; pose.mouthW = 8; pose.mouthH = 10; pose.eyeOpen = 1;
      if (sp < .5) { var jj = Math.sin(sp / .5 * Math.PI); pose.bobY -= 14 * jj; pose.scaleX *= 1 - .05 * jj; pose.scaleY *= 1 + .06 * jj; }
    }

    var cs = now - this.cheerStart;
    if (cs >= 0 && cs < CHEER) {
      pose.eyes = 'happy'; pose.mouth = 'open';
      pose.sparks = Math.min(1, cs * 4) * Math.min(1, (CHEER - cs) * 3);
      if (cs < 1.65) {
        var v = (cs % .55) / .55, y, sx, sy, f;
        if (v < .3) { f = ease(v / .3); y = 4 * f; sx = 1 + .1 * f; sy = 1 - .12 * f; }
        else if (v < .6) { f = ease((v - .3) / .3); y = 4 - 22 * f; sx = 1.1 - .18 * f; sy = .88 + .2 * f; }
        else { f = ease((v - .6) / .4); y = -18 * (1 - f); sx = .92 + .08 * f; sy = 1.08 - .08 * f; }
        pose.bobY += y; pose.scaleX *= sx; pose.scaleY *= sy;
      }
    }

    var ys = now - this.yawnStart;
    if (ys >= 0 && ys < YAWN && cs >= CHEER) {
      var yy = Math.sin(ys / YAWN * Math.PI);
      pose.scaleY *= 1 + .07 * yy; pose.scaleX *= 1 - .04 * yy;
      pose.eyeOpen = Math.min(pose.eyeOpen, 1 - .72 * yy);
      if (yy > .2) { pose.mouth = 'o'; pose.mouthW = 5 + 8 * yy; pose.mouthH = 6 + 14 * yy; }
    }
    return pose;
  };

  // ---------- layout ----------
  var DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function digitEm(h) { return emForGlyphHeight(h * .62); }
  function textEm(h, w, words) {
    var em = emForGlyphHeight(h * .5), widest = 0;
    for (var i = 0; i < words.length; i++) widest = Math.max(widest, textWidth(words[i], 100) / 100);
    return Math.min(em, w * .8 / widest);
  }
  function timeW(ch) { var cw = ch * .74; return 4 * cw + 2 * cw * .06 + cw * .24; }
  function dateW(rh) { return 3 * rh * 1.45 + rh * 1.9 + 3 * rh * .14; }

  function layout(W, H) {
    var L = { W: W, H: H, cards: {} };
    var clockH = H * .7, ch = H * .4;
    var fitW = Math.max(timeW(ch), dateW(ch * .36));
    if (fitW > W * .9) ch *= W * .9 / fitW;
    var rh = ch * .36, gap = ch * .12, tot = ch + gap + rh, y = (clockH - tot) / 2;
    var x = (W - timeW(ch)) / 2, cw = ch * .74, gi = cw * .06, gg = cw * .24, em = digitEm(ch);
    L.cards.h1 = new Card(x, y, cw, ch, em); L.cards.h2 = new Card(x + cw + gi, y, cw, ch, em);
    var x2 = x + 2 * cw + gi + gg;
    L.cards.m1 = new Card(x2, y, cw, ch, em); L.cards.m2 = new Card(x2 + cw + gi, y, cw, ch, em);
    L.minuteX = x2 + cw; L.clockX = W / 2;

    var dx = (W - dateW(rh)) / 2, dy = y + ch + gap, dgi = rh * .14, w3 = rh * 1.45, w4 = rh * 1.9;
    var emT = Math.min(textEm(rh, w3, DAYS), textEm(rh, w3, MONTHS));
    var emY = Math.min(textEm(rh, w4, ['2026']), emT), emD = Math.min(digitEm(rh) * .82, emT);
    L.cards.day = new Card(dx, dy, w3, rh, emT);
    L.cards.dd = new Card(dx + w3 + dgi, dy, w3, rh, emD);
    L.cards.mon = new Card(dx + 2 * (w3 + dgi), dy, w3, rh, emT);
    L.cards.yr = new Card(dx + 3 * (w3 + dgi), dy, w4, rh, emY);

    // character under the clock, feet near the bottom edge
    L.charScale = Math.min(H * .27, W * .2) / 160;
    L.charY = H * .965 - 70 * L.charScale;
    L.bandTop = Math.max(0, L.charY - 140 * L.charScale);
    return L;
  }

  // ---------- app ----------
  var cardCv = document.getElementById('cards'), fellaCv = document.getElementById('fella');
  var cctx = cardCv.getContext('2d'), fctx = fellaCv.getContext('2d');
  var dim = document.getElementById('dim'), toast = document.getElementById('toast');
  var L, anim = new Animator(), kind = 'pebble', dpr = 1, cardsDirty = true, lastMinute = -1, night = null, toastTimer = 0;
  var testOffset = 0; // seconds added to the clock, for trying things out

  try { var saved = window.localStorage.getItem('flipFellaKind'); if (saved && NAMES[saved]) kind = saved; } catch (e) { }
  if (/[?&]kind=(\w+)/.test(location.search) && NAMES[RegExp.$1]) kind = RegExp.$1;
  if (/[?&]at=(\d\d):(\d\d)/.test(location.search)) {
    var n0 = new Date(), want = new Date(n0.getFullYear(), n0.getMonth(), n0.getDate(), +RegExp.$1, +RegExp.$2, 0);
    testOffset = (want - n0) / 1000;
  }

  function resize() {
    var W = window.innerWidth || 1920, H = window.innerHeight || 1080;
    dpr = window.devicePixelRatio || 1;
    var cvs = [cardCv, fellaCv];
    for (var i = 0; i < 2; i++) {
      cvs[i].width = Math.round(W * dpr); cvs[i].height = Math.round(H * dpr);
      cvs[i].style.width = W + 'px'; cvs[i].style.height = H + 'px';
    }
    var oldX = anim.started && L ? anim.x / L.W : null, oldTo = anim.started && L ? anim.toX / L.W : null;
    L = layout(W, H);
    if (oldX !== null) { anim.x = oldX * W; anim.toX = oldTo * W; anim.fromX = anim.x; }
    lastMinute = -1; tick(0, false); cardsDirty = true;
  }

  function clockNow() { return new Date(Date.now() + testOffset * 1000); }

  function tick(now, animate) {
    var d = clockNow(), hh = ('0' + d.getHours()).slice(-2), mm = ('0' + d.getMinutes()).slice(-2), c = L.cards, ch = false;
    ch = c.h1.set(hh.charAt(0), now, animate) || ch; ch = c.h2.set(hh.charAt(1), now, animate) || ch;
    var mChanged = c.m1.set(mm.charAt(0), now, animate); mChanged = c.m2.set(mm.charAt(1), now, animate) || mChanged;
    ch = c.day.set(DAYS[d.getDay()], now, animate) || ch; ch = c.dd.set(('0' + d.getDate()).slice(-2), now, animate) || ch;
    ch = c.mon.set(MONTHS[d.getMonth()], now, animate) || ch; ch = c.yr.set(String(d.getFullYear()), now, animate) || ch;
    if (mChanged || ch) cardsDirty = true;
    if (mChanged && animate && lastMinute !== -1) anim.minute(now, d.getMinutes() === 0);
    lastMinute = d.getMinutes();
    var isNight = d.getHours() >= 22 || d.getHours() < 7;
    if (isNight !== night) { night = isNight; dim.style.opacity = night ? '.58' : '0'; }
    return d;
  }

  function anyFlipping(now) { for (var k in L.cards) if (L.cards.hasOwnProperty(k) && L.cards[k].animating(now)) return true; return false; }

  var lastFrame = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    var now = ts / 1000;
    if (now - lastFrame < 1 / 31) return; // about 30fps is plenty and kinder to the TV
    lastFrame = now;
    var d = tick(now, true);

    if (cardsDirty || anyFlipping(now)) {
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.fillStyle = BG; cctx.fillRect(0, 0, L.W, L.H);
      for (var k in L.cards) if (L.cards.hasOwnProperty(k)) drawCard(cctx, L.cards[k], now);
      cardsDirty = anyFlipping(now);
    }

    var pose = anim.update(now, night, d.getHours(), L);
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.clearRect(0, Math.floor(L.bandTop * dpr), fellaCv.width, fellaCv.height);
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCharacter(fctx, kind, pose, anim.x, L.charY, L.charScale);
  }

  function showToast(text) {
    toast.textContent = text; toast.style.opacity = '1';
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.style.opacity = '0'; }, 1800);
  }
  function setKind(step) {
    var i = KINDS.indexOf(kind); kind = KINDS[(i + step + KINDS.length) % KINDS.length];
    try { window.localStorage.setItem('flipFellaKind', kind); } catch (e) { }
    showToast(NAMES[kind]);
  }

  // ---------- music ----------
  // Plain http first because a 2016 TV may not trust newer https certificates.
  var STATIONS = [
    { name: 'Fluid', urls: ['http://ice1.somafm.com/fluid-128-mp3', 'http://ice2.somafm.com/fluid-128-mp3', 'https://ice.somafm.com/fluid'] },
    { name: '24/7 Lofi', urls: ['http://ec3.yesstreaming.net:3750/stream'] },
    { name: 'Chill Hop', urls: ['http://radio.hearme.fm:9230/stream'] },
    { name: 'Groove Salad', urls: ['http://ice1.somafm.com/groovesalad-128-mp3', 'http://ice2.somafm.com/groovesalad-128-mp3', 'https://ice.somafm.com/groovesalad'] }
  ];
  var audio = new Audio(), station = 0, urlIdx = 0, musicOn = true, failsInARow = 0, stallTimer = 0;
  audio.preload = 'none';
  try {
    var st = parseInt(window.localStorage.getItem('flipFellaStation'), 10); if (st >= 0 && st < STATIONS.length) station = st;
    if (window.localStorage.getItem('flipFellaMusic') === 'off') musicOn = false;
  } catch (e) { }
  if (/[?&]music=off/.test(location.search)) musicOn = false;

  function playStation() {
    if (!musicOn) return;
    audio.src = STATIONS[station].urls[urlIdx];
    var pr = audio.play(); if (pr && pr.catch) pr.catch(function () { });
    clearTimeout(stallTimer); stallTimer = setTimeout(streamFailed, 15000);
  }
  function streamFailed() {
    if (!musicOn) return;
    failsInARow++;
    if (failsInARow > 12) { failsInARow = 0; setTimeout(playStation, 60000); return; } // everything down, try again in a minute
    urlIdx++;
    if (urlIdx >= STATIONS[station].urls.length) { urlIdx = 0; station = (station + 1) % STATIONS.length; showToast(STATIONS[station].name); }
    playStation();
  }
  audio.addEventListener('playing', function () { failsInARow = 0; clearTimeout(stallTimer); });
  audio.addEventListener('error', function () { clearTimeout(stallTimer); setTimeout(streamFailed, 500); });
  audio.addEventListener('ended', function () { setTimeout(playStation, 1000); });
  audio.addEventListener('stalled', function () { clearTimeout(stallTimer); stallTimer = setTimeout(streamFailed, 15000); });

  function saveMusic() {
    try { window.localStorage.setItem('flipFellaStation', String(station)); window.localStorage.setItem('flipFellaMusic', musicOn ? 'on' : 'off'); } catch (e) { }
  }
  function toggleMusic() {
    musicOn = !musicOn; saveMusic();
    if (musicOn) { urlIdx = 0; playStation(); showToast(STATIONS[station].name); }
    else { clearTimeout(stallTimer); audio.pause(); audio.removeAttribute('src'); try { audio.load(); } catch (e) { } showToast('Music off'); }
  }
  function nextStation() {
    station = (station + 1) % STATIONS.length; urlIdx = 0; failsInARow = 0; musicOn = true; saveMusic();
    playStation(); showToast(STATIONS[station].name);
  }

  function keepAwake() {
    try { webapis.appcommon.setScreenSaver(webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF); } catch (e) { }
  }

  document.addEventListener('keydown', function (e) {
    var now = (window.performance && performance.now ? performance.now() : Date.now()) / 1000;
    switch (e.keyCode) {
      case 37: setKind(-1); break;                       // left
      case 39: setKind(1); break;                        // right
      case 13: if (!night) anim.move(now, L.W); break;   // OK: hop to another spot
      case 38: if (!night) anim.cheerStart = now; break; // up: a little cheer
      case 40: nextStation(); break;                     // down: next station
      case 10252: case 415: case 19: toggleMusic(); break; // play/pause, play, pause
      case 10009:                                        // Return/Back
        try { tizen.application.getCurrentApplication().exit(); } catch (err) { }
        break;
      default: return;
    }
    e.preventDefault();
  });
  // tap or click on touch screens (iPad later): left third, right third switch character, middle hops
  document.addEventListener('click', function (e) {
    if (musicOn && audio.paused) { urlIdx = 0; playStation(); return; }
    var x = e.clientX / L.W;
    if (x < .33) setKind(-1); else if (x > .67) setKind(1);
    else if (!night) anim.move((window.performance ? performance.now() : Date.now()) / 1000, L.W);
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { keepAwake(); cardsDirty = true; } });
  window.addEventListener('resize', resize);

  try { tizen.tvinputdevice.registerKey('MediaPlayPause'); tizen.tvinputdevice.registerKey('MediaPlay'); tizen.tvinputdevice.registerKey('MediaPause'); } catch (e) { }

  resize();
  keepAwake();
  showToast(musicOn ? NAMES[kind] + ' \u00b7 ' + STATIONS[station].name : NAMES[kind]);
  playStation();
  requestAnimationFrame(frame);
})();
