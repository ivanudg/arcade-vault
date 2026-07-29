/* ARCADE VAULT — datos, previews y motores de juego compartidos por todas las pantallas */
(function () {
  var KEY = 'arcadevault:v1';

  var GAMES = [
    { id: 'muro', title: 'MURO NEON', cat: 'ARCADE', glow: '#00f5ff', playable: true,
      desc: 'Rompe cada ladrillo sin perder la bola.',
      long: 'Una pala, una bola y un muro de luz que no perdona. Cada nivel acelera la bola y reduce tu margen de error. Limpia la pantalla completa para pasar al siguiente muro.',
      controls: 'Flechas ← → para mover la pala · ESPACIO para lanzar' },
    { id: 'serpiente', title: 'SERPIENTE 64', cat: 'CLASICOS', glow: '#f5ff00', playable: true,
      desc: 'Crece sin morder tu propia cola.',
      long: 'El clásico de rejilla llevado al vault. Cada fruta suma diez puntos y un segmento más de cuerpo. La velocidad crece con tu longitud, así que la codicia se paga caro.',
      controls: 'Flechas ← ↑ → ↓ para girar' },
    { id: 'invasores', title: 'INVASORES DEL VACIO', cat: 'DISPAROS', glow: '#ff006e', playable: true,
      desc: 'Defiende la última base orbital.',
      long: 'Formaciones enemigas descienden en oleadas cada vez más rápidas. Dispara, esquiva y aguanta: cada oleada limpiada te da un nivel y una salva más agresiva en contra.',
      controls: 'Flechas ← → para moverte · ESPACIO para disparar' },
    { id: 'rocas', title: 'CINTURON DE ROCAS', cat: 'DISPAROS', glow: '#00f5ff', playable: true,
      desc: 'Vuela entre asteroides y pulverízalos.',
      long: 'Inercia real: la nave no frena sola. Los asteroides grandes se parten en fragmentos más rápidos, y el campo se repuebla en cuanto lo despejas. Tres vidas, ningún escudo.',
      controls: 'Flechas ← → giran · ↑ empuja · ESPACIO dispara' },
    { id: 'duelo', title: 'DUELO DE PALAS', cat: 'ARCADE', glow: '#f5ff00', playable: true,
      desc: 'Uno contra la máquina, sin piedad.',
      long: 'El duelo más antiguo del vault: dos palas, una bola y ningún sitio donde esconderse. La máquina aprende el ángulo de tu golpe y cada punto acelera el intercambio. Tres fallos y se apaga la mesa.',
      controls: 'Flechas ↑ ↓ para mover tu pala' },
    { id: 'corredor', title: 'CORREDOR DE NEON', cat: 'REFLEJOS', glow: '#ff006e', playable: true,
      desc: 'Salta los bloques y no mires atrás.',
      long: 'Una carrera infinita por una autopista de rejilla. Los bloques llegan cada vez más rápido y la distancia es tu única puntuación. Salta en el instante justo: el suelo no perdona dos veces.',
      controls: 'ESPACIO o ↑ para saltar · ↓ para caer rápido' },
    { id: 'caida', title: 'CAIDA VERTICAL', cat: 'PUZZLE', glow: '#ff006e', playable: false,
      desc: 'Encaja las piezas antes de que se apilen.',
      long: 'Piezas que caen, líneas que desaparecen y una velocidad que nunca baja. Máquina en mantenimiento: la ROM se está reescribiendo para el vault.',
      controls: 'Pendiente de calibración' },
    { id: 'laberinto', title: 'LABERINTO GLOTON', cat: 'LABERINTO', glow: '#f5ff00', playable: false,
      desc: 'Recoge cada punto y esquiva a los guardianes.',
      long: 'Pasillos cerrados, cuatro perseguidores y un cronómetro implacable. Máquina en mantenimiento: los guardianes aún no tienen rutas asignadas.',
      controls: 'Pendiente de calibración' }
  ];

  var SEED = {
    muro: [['NEOKID', 18420], ['R3TR0', 15980], ['LUCIA_X', 14210], ['DONPIXEL', 12760], ['MARIO_88', 11340], ['ZURDA', 9820], ['KIKO', 8410], ['VIOLETA', 7260], ['ELENA', 6180], ['TITO', 5040]],
    serpiente: [['VIBORA', 9640], ['SARA_9', 8720], ['CTRL_ALT', 7910], ['NANDO', 6880], ['PIXELINA', 6120], ['JOSU', 5340], ['ANDREA', 4610], ['RUBEN', 3980], ['MAR', 3220], ['IVAN', 2640]],
    invasores: [['ORBITA', 24680], ['CAPI_Z', 21440], ['LAIA', 19870], ['GUS', 17250], ['DIEGO_R', 15600], ['NURIA', 13980], ['BEA', 12100], ['OSCAR', 10420], ['PACO', 8760], ['LOLA', 7140]],
    rocas: [['ASTRA', 31200], ['DUNA', 27640], ['KAI', 24980], ['ROCIO', 22310], ['TOMAS', 19740], ['SILVIA', 17020], ['BRUNO', 14680], ['NOA', 12240], ['HUGO', 9910], ['EMMA', 7830]],
    duelo: [['PALA_X', 4200], ['CARLA', 3800], ['MENDI', 3400], ['RAUL_7', 3100], ['NEREA', 2700], ['TONI', 2300], ['JULIA', 1900], ['ABEL', 1600], ['SAM', 1200], ['NIL', 900]],
    corredor: [['VELOZ', 12840], ['MARTA_R', 11260], ['KEVIN', 9980], ['AITOR', 8740], ['CLARA', 7620], ['IZAN', 6480], ['PILAR', 5310], ['BORJA', 4260], ['ROC', 3180], ['ELSA', 2140]],
    caida: [['TETRO', 14200], ['ANA_L', 12680], ['JAVI', 10940], ['CARMEN', 9320], ['LEO', 8100], ['MIRA', 6840], ['SAUL', 5620], ['ITZI', 4380], ['POL', 3260], ['UNAI', 2180]],
    laberinto: [['GLOTON', 16880], ['ROSA', 14320], ['ALEX_P', 12760], ['CHEMA', 11040], ['SOFIA', 9580], ['DANI', 8210], ['LUZ', 6940], ['MARCOS', 5620], ['IRIS', 4380], ['JON', 3140]]
  };

  var DATES = ['12/04/26', '28/03/26', '09/03/26', '21/02/26', '14/02/26', '02/02/26', '19/01/26', '07/01/26', '23/12/25', '11/12/25'];

  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function persist(patch) {
    var d = Object.assign(read(), patch);
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
  }
  function game(id) { return GAMES.filter(function (g) { return g.id === id; })[0] || GAMES[0]; }
  function param(name, fallback) {
    try { return new URLSearchParams(location.search).get(name) || fallback; } catch (e) { return fallback; }
  }
  function tint(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function fmt(n) { return n.toLocaleString('es-ES'); }
  function board(id) {
    var stored = (read().scores || {})[id] || [];
    var seed = (SEED[id] || []).map(function (r, i) { return { name: r[0], score: r[1], date: DATES[i] || '01/01/26', mine: false }; });
    var mine = stored.map(function (r) { return { name: r.name, score: r.score, date: r.date, mine: true }; });
    return seed.concat(mine).sort(function (a, b) { return b.score - a.score; }).slice(0, 10);
  }
  function best(id) { var b = board(id)[0]; return b ? fmt(b.score) : '—'; }
  function today() {
    var d = new Date(), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2);
  }
  function addScore(id, name, score) {
    var d = read(), scores = d.scores || {};
    scores[id] = (scores[id] || []).concat([{ name: name, score: score, date: today() }]);
    persist({ scores: scores });
  }

  function neon(ctx, c, x, y, w, h) {
    ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = c; ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h); ctx.restore();
  }

  function drawPreview(ctx, id, W, H) {
    var px = function (c, x, y, w, h) { ctx.save(); ctx.shadowBlur = W / 24; ctx.shadowColor = c; ctx.fillStyle = c; ctx.fillRect(x, y, w, h); ctx.restore(); };
    var ring = function (c, x, y, r) { ctx.save(); ctx.shadowBlur = W / 24; ctx.shadowColor = c; ctx.strokeStyle = c; ctx.lineWidth = Math.max(1.5, W / 130); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0c14'); bg.addColorStop(1, '#05060a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    var u = W / 100;

    if (id === 'muro') {
      var cols = 8, rows = 3, bw = W / cols, bh = H * 0.11, cs = ['#00f5ff', '#ff006e', '#f5ff00'];
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        if (r === 2 && (c === 2 || c === 5)) continue;
        px(cs[r], c * bw + u, H * 0.12 + r * bh + u * 0.6, bw - u * 2, bh - u * 1.4);
      }
      px('#00f5ff', W * 0.36, H * 0.86, W * 0.28, H * 0.05);
      px('#f5ff00', W * 0.56, H * 0.7, u * 3, u * 3);
    } else if (id === 'serpiente') {
      var N = 10, C = Math.min(W, H) / N, ox = (W - C * N) / 2, oy = (H - C * N) / 2;
      ctx.strokeStyle = 'rgba(0,245,255,0.1)';
      for (var i = 0; i <= N; i++) { ctx.beginPath(); ctx.moveTo(ox + i * C, oy); ctx.lineTo(ox + i * C, oy + C * N); ctx.moveTo(ox, oy + i * C); ctx.lineTo(ox + C * N, oy + i * C); ctx.stroke(); }
      [[3, 6], [3, 5], [3, 4], [4, 4], [5, 4], [5, 5]].forEach(function (p, k) { px(k === 0 ? '#f5ff00' : '#00f5ff', ox + p[0] * C + 1.5, oy + p[1] * C + 1.5, C - 3, C - 3); });
      px('#ff006e', ox + 7 * C + C * 0.25, oy + 2 * C + C * 0.25, C * 0.5, C * 0.5);
    } else if (id === 'invasores') {
      for (var ir = 0; ir < 3; ir++) for (var ic = 0; ic < 6; ic++) {
        var c0 = ir < 2 ? '#ff006e' : '#00f5ff', ix = W * 0.12 + ic * W * 0.14, iy = H * 0.16 + ir * H * 0.16;
        px(c0, ix - u * 3.4, iy - u * 2, u * 6.8, u * 3.6);
        px(c0, ix - u * 2.2, iy + u * 2, u * 1.6, u * 1.4);
        px(c0, ix + u * 0.6, iy + u * 2, u * 1.6, u * 1.4);
      }
      px('#f5ff00', W * 0.44, H * 0.86, u * 12, u * 2.6);
      px('#f5ff00', W * 0.48, H * 0.8, u * 3, u * 3);
      px('#f5ff00', W * 0.495, H * 0.6, u * 1.4, u * 5);
    } else if (id === 'rocas') {
      ring('#00f5ff', W * 0.22, H * 0.3, W * 0.11);
      ring('#00f5ff', W * 0.78, H * 0.24, W * 0.07);
      ring('#00f5ff', W * 0.7, H * 0.72, W * 0.13);
      px('#f5ff00', W * 0.45, H * 0.44, u * 1.6, u * 1.6);
      ctx.save(); ctx.translate(W * 0.36, H * 0.62); ctx.rotate(-0.5);
      ctx.shadowBlur = W / 20; ctx.shadowColor = '#ff006e'; ctx.strokeStyle = '#ff006e'; ctx.lineWidth = Math.max(1.6, W / 110);
      ctx.beginPath(); ctx.moveTo(u * 7, 0); ctx.lineTo(-u * 5, u * 4.5); ctx.lineTo(-u * 2.4, 0); ctx.lineTo(-u * 5, -u * 4.5); ctx.closePath(); ctx.stroke(); ctx.restore();
    } else if (id === 'duelo') {
      ctx.strokeStyle = 'rgba(245,255,0,0.22)'; ctx.setLineDash([u * 2, u * 2.4]); ctx.lineWidth = Math.max(1, W / 150);
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
      px('#f5ff00', W * 0.06, H * 0.32, u * 2.6, H * 0.26);
      px('#00f5ff', W * 0.91, H * 0.5, u * 2.6, H * 0.26);
      px('#ffffff', W * 0.46, H * 0.55, u * 2.8, u * 2.8);
      px('rgba(255,255,255,0.28)', W * 0.53, H * 0.5, u * 2, u * 2);
      px('rgba(255,255,255,0.14)', W * 0.6, H * 0.45, u * 1.4, u * 1.4);
    } else if (id === 'corredor') {
      for (var li = 1; li < 7; li++) px('rgba(255,0,110,0.16)', 0, H * (0.55 + li * 0.06), W, 1);
      px('#ff006e', 0, H * 0.84, W, u * 1.2);
      px('#00f5ff', W * 0.5, H * 0.62, u * 6, u * 12);
      px('#00f5ff', W * 0.74, H * 0.68, u * 5, u * 10);
      px('#f5ff00', W * 0.16, H * 0.5, u * 8, u * 8);
      px('rgba(245,255,0,0.35)', W * 0.06, H * 0.56, u * 6, u * 2);
    } else if (id === 'caida') {
      var CC = W / 10;
      ctx.strokeStyle = 'rgba(255,0,110,0.1)';
      for (var ci = 1; ci < 10; ci++) { ctx.beginPath(); ctx.moveTo(ci * CC, 0); ctx.lineTo(ci * CC, H); ctx.stroke(); }
      [[0, 0], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [6, 0], [7, 0], [7, 1], [8, 0], [9, 0]].forEach(function (p, k) {
        px(k % 3 === 0 ? '#00f5ff' : k % 3 === 1 ? '#ff006e' : '#f5ff00', p[0] * CC + 1.5, H - (p[1] + 1) * CC + 1.5, CC - 3, CC - 3);
      });
      px('#f5ff00', 4 * CC + 1.5, H * 0.18, CC - 3, CC - 3);
      px('#f5ff00', 5 * CC + 1.5, H * 0.18, CC - 3, CC - 3);
      px('#f5ff00', 5 * CC + 1.5, H * 0.18 + CC, CC - 3, CC - 3);
    } else {
      var LC = Math.min(W, H) / 8, lx = (W - LC * 8) / 2, ly = (H - LC * 6) / 2;
      ctx.save(); ctx.shadowBlur = W / 26; ctx.shadowColor = '#00f5ff'; ctx.strokeStyle = 'rgba(0,245,255,0.75)'; ctx.lineWidth = Math.max(1.5, W / 140);
      ctx.strokeRect(lx + LC * 0.4, ly + LC * 0.4, LC * 7.2, LC * 5.2);
      ctx.strokeRect(lx + LC * 2, ly + LC * 2, LC * 1.6, LC * 1.2);
      ctx.strokeRect(lx + LC * 4.4, ly + LC * 2, LC * 1.6, LC * 1.2);
      ctx.restore();
      for (var dc = 0; dc < 7; dc++) px('#f5ff00', lx + LC * (0.9 + dc) - u * 0.7, ly + LC * 4.4, u * 1.5, u * 1.5);
      px('#f5ff00', lx + LC * 1.1, ly + LC * 1.1, LC * 0.8, LC * 0.8);
      px('#ff006e', lx + LC * 5.6, ly + LC * 4.1, LC * 0.85, LC * 0.9);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (var sy = 0; sy < H; sy += 3) ctx.fillRect(0, sy, W, 1);
  }

  function previewRef(id) {
    return function (el) {
      if (!el) return;
      drawPreview(el.getContext('2d'), id, el.width, el.height);
    };
  }

  /* motores: engine(id, keys) -> {score, lives, level, dead, update(dt), draw(ctx)} */
  function engine(id, keys) {
    var S = 480;

    if (id === 'serpiente') {
      var N = 20, C = S / N, s = [{ x: 9, y: 10 }, { x: 8, y: 10 }], dir = { x: 1, y: 0 }, nd = { x: 1, y: 0 }, acc = 0, food = { x: 15, y: 10 };
      var g = { score: 0, lives: 1, level: 1, dead: false };
      g.update = function (dt) {
        if (keys.ArrowLeft && dir.x === 0) nd = { x: -1, y: 0 };
        if (keys.ArrowRight && dir.x === 0) nd = { x: 1, y: 0 };
        if (keys.ArrowUp && dir.y === 0) nd = { x: 0, y: -1 };
        if (keys.ArrowDown && dir.y === 0) nd = { x: 0, y: 1 };
        var step = Math.max(60, 140 - s.length * 2);
        acc += dt;
        if (acc < step) return;
        acc = 0; dir = nd;
        var h = { x: s[0].x + dir.x, y: s[0].y + dir.y };
        if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || s.some(function (p) { return p.x === h.x && p.y === h.y; })) { g.dead = true; return; }
        s.unshift(h);
        if (h.x === food.x && h.y === food.y) {
          g.score += 10; g.level = 1 + Math.floor(s.length / 6);
          do { food = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 }; } while (s.some(function (p) { return p.x === food.x && p.y === food.y; }));
        } else s.pop();
      };
      g.draw = function (ctx) {
        ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, S, S);
        ctx.strokeStyle = 'rgba(0,245,255,0.06)';
        for (var i = 1; i < N; i++) { ctx.beginPath(); ctx.moveTo(i * C, 0); ctx.lineTo(i * C, S); ctx.moveTo(0, i * C); ctx.lineTo(S, i * C); ctx.stroke(); }
        neon(ctx, '#ff006e', food.x * C + 4, food.y * C + 4, C - 8, C - 8);
        s.forEach(function (p, i) { neon(ctx, i === 0 ? '#f5ff00' : '#00f5ff', p.x * C + 2, p.y * C + 2, C - 4, C - 4); });
      };
      return g;
    }

    if (id === 'muro') {
      var pw = 84, ph = 12, rws = 5, cls = 8, bw = S / cls, bh = 22, px2 = (S - pw) / 2, ball = null, bricks = [];
      var colors = ['#00f5ff', '#ff006e', '#f5ff00', '#00f5ff', '#ff006e'];
      var gm = { score: 0, lives: 3, level: 1, dead: false };
      var build = function () {
        bricks = [];
        for (var r = 0; r < rws; r++) for (var c = 0; c < cls; c++) bricks.push({ x: c * bw, y: 60 + r * bh, c: colors[r], on: true });
      };
      var reset = function () { ball = { x: S / 2, y: S - 70, vx: 0.19 * (Math.random() > 0.5 ? 1 : -1), vy: -0.22, live: false }; };
      build(); reset();
      gm.update = function (dt) {
        if (keys.ArrowLeft) px2 -= 0.42 * dt;
        if (keys.ArrowRight) px2 += 0.42 * dt;
        px2 = Math.max(0, Math.min(S - pw, px2));
        if (!ball.live) { ball.x = px2 + pw / 2; ball.y = S - 46; if (keys[' ']) ball.live = true; return; }
        var sp = 1 + (gm.level - 1) * 0.12;
        ball.x += ball.vx * dt * sp; ball.y += ball.vy * dt * sp;
        if (ball.x < 6 || ball.x > S - 6) ball.vx *= -1;
        if (ball.y < 6) ball.vy *= -1;
        if (ball.y > S - 40 && ball.y < S - 28 && ball.x > px2 && ball.x < px2 + pw) {
          ball.vy = -Math.abs(ball.vy);
          ball.vx = 0.26 * ((ball.x - (px2 + pw / 2)) / (pw / 2));
        }
        if (ball.y > S) { gm.lives--; if (gm.lives <= 0) { gm.dead = true; return; } reset(); return; }
        for (var i = 0; i < bricks.length; i++) {
          var b = bricks[i];
          if (b.on && ball.x > b.x && ball.x < b.x + bw && ball.y > b.y && ball.y < b.y + bh) { b.on = false; gm.score += 50; ball.vy *= -1; break; }
        }
        if (!bricks.some(function (b) { return b.on; })) { gm.level++; gm.score += 200; build(); reset(); }
      };
      gm.draw = function (ctx) {
        ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, S, S);
        bricks.forEach(function (b) { if (b.on) neon(ctx, b.c, b.x + 3, b.y + 3, bw - 6, bh - 6); });
        neon(ctx, '#00f5ff', px2, S - 40, pw, ph);
        neon(ctx, '#f5ff00', ball.x - 6, ball.y - 6, 12, 12);
        if (!ball.live) { ctx.fillStyle = '#6f7686'; ctx.font = "12px 'Courier Prime', monospace"; ctx.textAlign = 'center'; ctx.fillText('ESPACIO PARA LANZAR', S / 2, S - 90); }
      };
      return gm;
    }

    if (id === 'invasores') {
      var ipx = S / 2, bullets = [], ebs = [], inv = [], dx = 0.045, cool = 0, wave = 1;
      var gi = { score: 0, lives: 3, level: 1, dead: false };
      var buildI = function () {
        inv = [];
        for (var r = 0; r < 4; r++) for (var c = 0; c < 8; c++) inv.push({ x: 44 + c * 50, y: 50 + r * 42, on: true, c: r < 2 ? '#ff006e' : '#00f5ff' });
      };
      buildI();
      gi.update = function (dt) {
        if (keys.ArrowLeft) ipx -= 0.34 * dt;
        if (keys.ArrowRight) ipx += 0.34 * dt;
        ipx = Math.max(20, Math.min(S - 20, ipx));
        cool -= dt;
        if (keys[' '] && cool <= 0) { bullets.push({ x: ipx, y: S - 60 }); cool = 320; }
        bullets.forEach(function (b) { b.y -= 0.5 * dt; });
        bullets = bullets.filter(function (b) { return b.y > -10; });
        var live = inv.filter(function (i) { return i.on; }), edge = false;
        live.forEach(function (i) { i.x += dx * dt * wave; if (i.x < 16 || i.x > S - 16) edge = true; });
        if (edge) { dx *= -1; live.forEach(function (i) { i.y += 20; }); }
        live.forEach(function (i) {
          if (Math.random() < 0.0006 * dt * wave) ebs.push({ x: i.x, y: i.y + 12 });
          if (i.y > S - 70) gi.dead = true;
        });
        ebs.forEach(function (b) { b.y += 0.26 * dt; });
        ebs = ebs.filter(function (b) {
          if (b.y > S) return false;
          if (b.y > S - 56 && Math.abs(b.x - ipx) < 18) { gi.lives--; if (gi.lives <= 0) gi.dead = true; return false; }
          return true;
        });
        bullets = bullets.filter(function (b) {
          for (var k = 0; k < live.length; k++) {
            if (Math.abs(live[k].x - b.x) < 18 && Math.abs(live[k].y - b.y) < 16) { live[k].on = false; gi.score += 120; return false; }
          }
          return true;
        });
        if (!inv.some(function (i) { return i.on; })) { gi.level++; wave += 0.35; gi.score += 500; buildI(); ebs = []; }
      };
      gi.draw = function (ctx) {
        ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, S, S);
        inv.forEach(function (i) {
          if (!i.on) return;
          neon(ctx, i.c, i.x - 14, i.y - 8, 28, 16);
          neon(ctx, i.c, i.x - 8, i.y + 8, 6, 5);
          neon(ctx, i.c, i.x + 2, i.y + 8, 6, 5);
        });
        neon(ctx, '#f5ff00', ipx - 18, S - 46, 36, 8);
        neon(ctx, '#f5ff00', ipx - 5, S - 56, 10, 10);
        bullets.forEach(function (b) { neon(ctx, '#f5ff00', b.x - 2, b.y, 4, 14); });
        ebs.forEach(function (b) { neon(ctx, '#ff006e', b.x - 2, b.y, 4, 12); });
      };
      return gi;
    }

    if (id === 'duelo') {
      var dph = 78, dpw = 12, py = (S - dph) / 2, cy = (S - dph) / 2, dball = null;
      var gd = { score: 0, lives: 3, level: 1, dead: false };
      var resetD = function (dirx) { dball = { x: S / 2, y: S / 2, vx: 0.24 * dirx, vy: (Math.random() - 0.5) * 0.24 }; };
      resetD(1);
      gd.update = function (dt) {
        if (keys.ArrowUp) py -= 0.4 * dt;
        if (keys.ArrowDown) py += 0.4 * dt;
        py = Math.max(0, Math.min(S - dph, py));
        var track = dball.x > S * 0.4 ? dball.y - dph / 2 : S / 2 - dph / 2;
        cy += Math.max(-0.22 - gd.level * 0.02, Math.min(0.22 + gd.level * 0.02, (track - cy) * 0.02)) * dt;
        cy = Math.max(0, Math.min(S - dph, cy));
        var sp = 1 + (gd.level - 1) * 0.1;
        dball.x += dball.vx * dt * sp; dball.y += dball.vy * dt * sp;
        if (dball.y < 6 || dball.y > S - 6) dball.vy *= -1;
        if (dball.x < 34 && dball.x > 20 && dball.y > py && dball.y < py + dph) {
          dball.vx = Math.abs(dball.vx); dball.vy = 0.26 * ((dball.y - (py + dph / 2)) / (dph / 2)); gd.score += 25;
        }
        if (dball.x > S - 34 && dball.x < S - 20 && dball.y > cy && dball.y < cy + dph) {
          dball.vx = -Math.abs(dball.vx); dball.vy = 0.26 * ((dball.y - (cy + dph / 2)) / (dph / 2));
        }
        if (dball.x > S) { gd.score += 300; gd.level++; resetD(-1); }
        if (dball.x < 0) { gd.lives--; if (gd.lives <= 0) { gd.dead = true; return; } resetD(1); }
      };
      gd.draw = function (ctx) {
        ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, S, S);
        ctx.strokeStyle = 'rgba(245,255,0,0.18)'; ctx.setLineDash([8, 12]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S); ctx.stroke(); ctx.setLineDash([]);
        neon(ctx, '#f5ff00', 22, py, dpw, dph);
        neon(ctx, '#00f5ff', S - 34, cy, dpw, dph);
        neon(ctx, '#ffffff', dball.x - 6, dball.y - 6, 12, 12);
      };
      return gd;
    }

    if (id === 'corredor') {
      var gy = S - 90, size = 30, y = gy - size, vy = 0, obs = [], dist = 0, spawn = 700, t = 0, cinv = 0;
      var gc = { score: 0, lives: 3, level: 1, dead: false };
      gc.update = function (dt) {
        var onGround = y >= gy - size - 0.5;
        if ((keys[' '] || keys.ArrowUp) && onGround) vy = -0.72;
        if (keys.ArrowDown && !onGround) vy += 0.005 * dt;
        vy += 0.0021 * dt;
        y = Math.min(gy - size, y + vy * dt);
        if (y >= gy - size) vy = 0;
        var sp = 0.28 + gc.level * 0.035;
        t += dt; cinv -= dt;
        if (t > spawn) { t = 0; spawn = 560 + Math.random() * 420; obs.push({ x: S + 20, h: 26 + Math.random() * 30 }); }
        obs.forEach(function (o) { o.x -= sp * dt; });
        obs = obs.filter(function (o) { return o.x > -40; });
        dist += sp * dt * 0.12;
        gc.score = Math.floor(dist);
        gc.level = 1 + Math.floor(dist / 400);
        if (cinv <= 0) {
          for (var i = 0; i < obs.length; i++) {
            var o = obs[i];
            if (o.x < 62 + size && o.x + 24 > 62 && y + size > gy - o.h) {
              gc.lives--; cinv = 900;
              obs = obs.filter(function (q) { return q.x > 200; });
              if (gc.lives <= 0) { gc.dead = true; return; }
              break;
            }
          }
        }
      };
      gc.draw = function (ctx) {
        ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, S, S);
        ctx.strokeStyle = 'rgba(255,0,110,0.12)'; ctx.lineWidth = 1;
        for (var i = 1; i < 8; i++) { var yy = gy - 200 + i * 26; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(S, yy); ctx.stroke(); }
        neon(ctx, '#ff006e', 0, gy, S, 5);
        obs.forEach(function (o) { neon(ctx, '#00f5ff', o.x, gy - o.h, 24, o.h); });
        neon(ctx, cinv > 0 ? '#6f7686' : '#f5ff00', 62, y, size, size);
        ctx.fillStyle = '#3d4350'; ctx.font = "12px 'Courier Prime', monospace"; ctx.textAlign = 'left';
        ctx.fillText('DISTANCIA ' + Math.floor(dist) + ' M', 16, 28);
      };
      return gc;
    }

    /* rocas */
    var ship = { x: S / 2, y: S / 2, a: -Math.PI / 2, vx: 0, vy: 0 }, shots = [], rocks = [], rcool = 0, rinv = 0;
    var gr = { score: 0, lives: 3, level: 1, dead: false };
    var spawnR = function (n) {
      rocks = [];
      for (var i = 0; i < n; i++) {
        var e = Math.random() * Math.PI * 2;
        rocks.push({ x: S / 2 + Math.cos(e) * 190, y: S / 2 + Math.sin(e) * 190, vx: (Math.random() - 0.5) * 0.13, vy: (Math.random() - 0.5) * 0.13, r: 30 });
      }
    };
    spawnR(4);
    var wrap = function (o) { if (o.x < 0) o.x += S; if (o.x > S) o.x -= S; if (o.y < 0) o.y += S; if (o.y > S) o.y -= S; };
    gr.update = function (dt) {
      if (keys.ArrowLeft) ship.a -= 0.005 * dt;
      if (keys.ArrowRight) ship.a += 0.005 * dt;
      if (keys.ArrowUp) { ship.vx += Math.cos(ship.a) * 0.0004 * dt; ship.vy += Math.sin(ship.a) * 0.0004 * dt; }
      ship.vx *= 0.995; ship.vy *= 0.995;
      ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship);
      rcool -= dt; rinv -= dt;
      if (keys[' '] && rcool <= 0) { shots.push({ x: ship.x, y: ship.y, vx: Math.cos(ship.a) * 0.42, vy: Math.sin(ship.a) * 0.42, life: 900 }); rcool = 260; }
      shots.forEach(function (s) { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; wrap(s); });
      shots = shots.filter(function (s) { return s.life > 0; });
      rocks.forEach(function (r) { r.x += r.vx * dt; r.y += r.vy * dt; wrap(r); });
      var next = [];
      rocks.forEach(function (r) {
        var hit = false;
        shots = shots.filter(function (s) {
          if (!hit && Math.hypot(s.x - r.x, s.y - r.y) < r.r) { hit = true; return false; }
          return true;
        });
        if (hit) {
          gr.score += r.r > 20 ? 100 : 250;
          if (r.r > 16) for (var i = 0; i < 2; i++) next.push({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 0.24, vy: (Math.random() - 0.5) * 0.24, r: r.r / 2 });
        } else next.push(r);
        if (rinv <= 0 && Math.hypot(ship.x - r.x, ship.y - r.y) < r.r + 9) {
          gr.lives--; rinv = 1600; ship = { x: S / 2, y: S / 2, a: -Math.PI / 2, vx: 0, vy: 0 };
          if (gr.lives <= 0) gr.dead = true;
        }
      });
      rocks = next;
      if (!rocks.length) { gr.level++; gr.score += 400; spawnR(3 + gr.level); }
    };
    gr.draw = function (ctx) {
      ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, S, S);
      ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = '#00f5ff'; ctx.strokeStyle = '#00f5ff'; ctx.lineWidth = 2;
      rocks.forEach(function (r) { ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke(); });
      ctx.restore();
      shots.forEach(function (s) { neon(ctx, '#f5ff00', s.x - 2, s.y - 2, 4, 4); });
      ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a);
      ctx.shadowBlur = 16; ctx.shadowColor = '#ff006e'; ctx.strokeStyle = rinv > 0 ? '#6f7686' : '#ff006e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, 9); ctx.lineTo(-5, 0); ctx.lineTo(-10, -9); ctx.closePath(); ctx.stroke();
      ctx.restore();
    };
    return gr;
  }

  window.ARCADE = {
    KEY: KEY, GAMES: GAMES, SEED: SEED, DATES: DATES,
    read: read, persist: persist, game: game, param: param, tint: tint, fmt: fmt,
    board: board, best: best, addScore: addScore, today: today,
    drawPreview: drawPreview, previewRef: previewRef, engine: engine
  };
})();
