/*
  Truchet Tiles
  One square tile, turned at random: Sébastien Truchet's half-colored
  squares (1704), Cyril Stanley Smith's quarter arcs (1987), the diagonals
  of 10 PRINT, a woven variant and hexagonal arcs. Click a tile to turn it.
  https://github.com/evoluteur/truchet-tiles
  (c) 2026 Olivier Giulieri
*/

const SETS = {
  arcs: { name: "Quarter arcs (Smith)", turns: 2, text: "Two quarter circles join the middles of the sides. Every arc meets another: endless meanders and closed loops." },
  triangles: { name: "Triangles (Truchet)", turns: 4, text: "Sébastien Truchet's tile of 1704: a square cut on its diagonal, half dark. Four ways to lay it." },
  diagonals: { name: "Diagonals (10 PRINT)", turns: 2, text: "A slash or a backslash: the maze of the one-line Commodore 64 program 10 PRINT." },
  weave: { name: "Weave", turns: 4, text: "Quarter arcs, or two bands crossing, one over the other: a Celtic interlace." },
  hex: { name: "Hexagonal arcs", turns: 2, text: "Hexagons with three arcs around alternate corners: rounder, cell-like loops." },
};

const PALETTES = {
  ink: { name: "Ink on paper", bg: "#f3eee2", fg: "#1c1b19", a: "#f3eee2", b: "#d8cdb6" },
  night: { name: "Night", bg: "#101a2e", fg: "#e8edf5", a: "#101a2e", b: "#1d3157" },
  terracotta: { name: "Terracotta", bg: "#f1e2cf", fg: "#7a2e1d", a: "#e3a074", b: "#f1e2cf" },
  blueprint: { name: "Blueprint", bg: "#1f4e8c", fg: "#e6f0ff", a: "#1f4e8c", b: "#2a64ad" },
  mint: { name: "Mint and plum", bg: "#e7f4ec", fg: "#4b2142", a: "#9fd6b6", b: "#e7f4ec" },
  gold: { name: "Black and gold", bg: "#0d0d0d", fg: "#d9b45a", a: "#0d0d0d", b: "#3a2e14" },
};

const state = {
  set: "arcs",
  n: 14, // tiles across
  width: 0.18, // line width, in tiles
  bias: 0.5, // chance of the first orientation
  fill: true, // color the regions
  palette: "ink",
  seed: 1,
  shimmer: false,
};

let canvas, ctx, tiles = [], cols = 0, rows = 0, size = 0;
let anims = new Map(); // tile index -> {from, start}

const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// ------------------------------------------------------------ the grid

const layout = () => {
  const w = canvas.width, h = canvas.height;
  if (state.set === "hex") {
    size = w / state.n / Math.sqrt(3); // hexagon radius
    cols = state.n + 1;
    rows = Math.ceil(h / (size * 1.5)) + 1;
  } else {
    size = w / state.n;
    cols = state.n;
    rows = Math.ceil(h / size);
  }
};

const shuffle = () => {
  layout();
  const rand = rng(state.seed * 7919 + 13);
  const turns = SETS[state.set].turns;
  tiles = [];
  for (let i = 0; i < cols * rows; i++) {
    // bias tips the balance toward the first orientation (or, with four, the first pair)
    const first = rand() < state.bias;
    if (turns === 2) tiles.push(first ? 0 : 1);
    else tiles.push((first ? 0 : 2) + (rand() < 0.5 ? 0 : 1));
  }
  anims.clear();
  dirty = true;
  saveHash();
};

// ------------------------------------------------------------ drawing one tile, centered at 0, side 1

const P = () => PALETTES[state.palette];

// the parity of grid vertex (x, y), for two-coloring the arc regions
const parity = (x, y) => (((x + y) % 2) + 2) % 2;

const drawSquareTile = (c, kind, o, i, j) => {
  const pal = P();
  const lw = state.width;
  if (kind === "triangles") {
    c.fillStyle = pal.fg;
    c.beginPath();
    const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
    const k = o % 4;
    c.moveTo(...corners[k]);
    c.lineTo(...corners[(k + 1) % 4]);
    c.lineTo(...corners[(k + 2) % 4]);
    c.closePath();
    c.fill();
    return;
  }
  if (kind === "diagonals") {
    c.strokeStyle = pal.fg;
    c.lineWidth = lw;
    c.lineCap = "square";
    c.beginPath();
    if (o % 2) {
      c.moveTo(-0.5, -0.5);
      c.lineTo(0.5, 0.5);
    } else {
      c.moveTo(0.5, -0.5);
      c.lineTo(-0.5, 0.5);
    }
    c.stroke();
    return;
  }
  // arcs (and the weave's arc tiles): orientation 0 has arcs around the
  // top-left and bottom-right corners
  const arcTile = (rotated) => {
    // regions: two quarter disks at the arcs' corners, a band between
    if (state.fill) {
      const q = parity(i + (rotated ? 1 : 0), j); // the disks' corners
      c.fillStyle = q ? pal.b : pal.a;
      c.fillRect(-0.51, -0.51, 1.02, 1.02); // a hair over the edges: no seams
      c.fillStyle = q ? pal.a : pal.b;
      c.beginPath();
      if (!rotated) {
        c.moveTo(-0.5, -0.5);
        c.arc(-0.5, -0.5, 0.5, 0, Math.PI / 2);
        c.closePath();
        c.moveTo(0.5, 0.5);
        c.arc(0.5, 0.5, 0.5, Math.PI, Math.PI * 1.5);
        c.closePath();
      } else {
        c.moveTo(0.5, -0.5);
        c.arc(0.5, -0.5, 0.5, Math.PI / 2, Math.PI);
        c.closePath();
        c.moveTo(-0.5, 0.5);
        c.arc(-0.5, 0.5, 0.5, Math.PI * 1.5, Math.PI * 2);
        c.closePath();
      }
      c.fill();
    }
    c.strokeStyle = pal.fg;
    c.lineWidth = lw;
    c.lineCap = "butt";
    c.beginPath();
    if (!rotated) {
      c.arc(-0.5, -0.5, 0.5, 0, Math.PI / 2);
      c.moveTo(0, 0.5);
      c.arc(0.5, 0.5, 0.5, Math.PI, Math.PI * 1.5);
    } else {
      c.arc(0.5, -0.5, 0.5, Math.PI / 2, Math.PI);
      c.moveTo(0.5, 0);
      c.arc(-0.5, 0.5, 0.5, Math.PI * 1.5, Math.PI * 2);
    }
    c.stroke();
  };
  if (kind === "arcs") return arcTile(o % 2 === 1);
  // weave: 0, 1 arcs; 2, 3 a crossing, horizontal or vertical on top
  if (o < 2) {
    if (state.fill) {
      c.fillStyle = pal.bg;
      c.fillRect(-0.5, -0.5, 1, 1);
    }
    const keep = state.fill;
    state.fill = false;
    band(c, () => arcPath(c, o === 1));
    state.fill = keep;
  } else {
    if (state.fill) {
      c.fillStyle = pal.bg;
      c.fillRect(-0.5, -0.5, 1, 1);
    }
    const h = () => {
      c.beginPath();
      c.moveTo(-0.5, 0);
      c.lineTo(0.5, 0);
    };
    const v = () => {
      c.beginPath();
      c.moveTo(0, -0.5);
      c.lineTo(0, 0.5);
    };
    if (o === 2) {
      band(c, v);
      band(c, h);
    } else {
      band(c, h);
      band(c, v);
    }
  }
};

const arcPath = (c, rotated) => {
  c.beginPath();
  if (!rotated) {
    c.arc(-0.5, -0.5, 0.5, 0, Math.PI / 2);
    c.moveTo(0, 0.5);
    c.arc(0.5, 0.5, 0.5, Math.PI, Math.PI * 1.5);
  } else {
    c.arc(0.5, -0.5, 0.5, Math.PI / 2, Math.PI);
    c.moveTo(0.5, 0);
    c.arc(-0.5, 0.5, 0.5, Math.PI * 1.5, Math.PI * 2);
  }
};

// a ribbon: dark edges, light middle, so crossings read as over and under
const band = (c, path) => {
  const pal = P();
  const w = Math.max(0.12, state.width * 1.6);
  c.lineCap = "butt";
  path();
  c.strokeStyle = pal.bg;
  c.lineWidth = w + 0.08;
  c.stroke();
  path();
  c.strokeStyle = pal.fg;
  c.lineWidth = w;
  c.stroke();
  path();
  c.strokeStyle = pal.b;
  c.lineWidth = w * 0.45;
  c.stroke();
};

// a hexagon of radius 1 (pointy top), three arcs around alternate corners
const drawHexTile = (c, o, i, j) => {
  const pal = P();
  const corner = (k) => [Math.cos(((60 * k - 90) * Math.PI) / 180), Math.sin(((60 * k - 90) * Math.PI) / 180)];
  // regions are colored by the class of the corner they hold: alternate
  // corners of a honeycomb belong to two classes, the same in every hexagon
  if (state.fill) {
    c.fillStyle = o === 0 ? pal.b : pal.a;
    c.beginPath();
    for (let k = 0; k < 6; k++) c.lineTo(...corner(k));
    c.closePath();
    c.fill();
  }
  // arcs of radius 1/2 around corners o, o+2, o+4: each joins the middles of two sides
  c.strokeStyle = pal.fg;
  c.lineWidth = state.width * 1.7;
  c.lineCap = "butt";
  for (let k = o; k < 6; k += 2) {
    const [x, y] = corner(k);
    const a0 = ((60 * k - 90 + 120) * Math.PI) / 180;
    if (state.fill) {
      c.fillStyle = o === 0 ? pal.a : pal.b;
      c.beginPath();
      c.moveTo(x, y);
      c.arc(x, y, 0.5, a0, a0 + (Math.PI * 2) / 3);
      c.closePath();
      c.fill();
    }
    c.beginPath();
    c.arc(x, y, 0.5, a0, a0 + (Math.PI * 2) / 3);
    c.stroke();
  }
};

const tileCenter = (i, j) => {
  if (state.set === "hex") {
    const w = Math.sqrt(3) * size;
    return [i * w + (j % 2 ? w / 2 : 0), j * size * 1.5];
  }
  return [(i + 0.5) * size, (j + 0.5) * size];
};

let dirty = true;
const render = (now = performance.now()) => {
  const w = canvas.width, h = canvas.height;
  const pal = P();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const o = tiles[k];
      const [x, y] = tileCenter(i, j);
      // a turning tile is drawn at its old orientation, rotated
      let angle = 0, show = o;
      const an = anims.get(k);
      if (an) {
        const t = Math.min(1, (now - an.start) / 350);
        const e = t * t * (3 - 2 * t);
        if (t >= 1) anims.delete(k);
        else if (!(state.set === "weave" && (an.from >= 2 || o >= 2))) {
          // turning by a quarter (a sixth for hexagons) takes it to its next orientation
          show = an.from;
          angle = e * (state.set === "hex" ? Math.PI / 3 : Math.PI / 2);
        }
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      if (state.set === "hex") {
        ctx.scale(size, size);
        drawHexTile(ctx, show, i, j);
      } else {
        ctx.scale(size, size);
        // a hair larger, so no seams show between tiles
        ctx.beginPath();
        ctx.rect(-0.505, -0.505, 1.01, 1.01);
        ctx.clip();
        if (angle && state.fill) {
          ctx.fillStyle = pal.bg;
          ctx.fillRect(-0.5, -0.5, 1, 1);
        }
        drawSquareTile(ctx, state.set, show, i, j);
      }
      ctx.restore();
    }
  }
};

// ------------------------------------------------------------ interaction

const turn = (k) => {
  const turns = SETS[state.set].turns;
  anims.set(k, { from: tiles[k], start: performance.now() });
  tiles[k] = state.set === "weave" ? (tiles[k] + 1) % 4 : (tiles[k] + 1) % turns;
};

const tileAt = (px, py) => {
  if (state.set === "hex") {
    let best = -1, bd = Infinity;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const [x, y] = tileCenter(i, j);
        const d = (x - px) ** 2 + (y - py) ** 2;
        if (d < bd) {
          bd = d;
          best = j * cols + i;
        }
      }
    return best;
  }
  const i = Math.floor(px / size), j = Math.floor(py / size);
  if (i < 0 || j < 0 || i >= cols || j >= rows) return -1;
  return j * cols + i;
};

let lastShimmer = 0;
const loop = (now) => {
  if (state.shimmer && now - lastShimmer > 120) {
    lastShimmer = now;
    for (let k = 0; k < Math.max(1, Math.round(tiles.length / 60)); k++) turn(Math.floor(Math.random() * tiles.length));
  }
  if (dirty || anims.size) {
    render(now);
    dirty = false;
  }
  requestAnimationFrame(loop);
};

// ------------------------------------------------------------ export

const svgTile = (kind, o, i, j) => {
  // the same shapes, in SVG, at tile (i, j)
  const s = 100;
  const pal = P();
  const [cx, cy] = state.set === "hex" ? [0, 0] : [(i + 0.5) * s, (j + 0.5) * s];
  const lw = state.width * s;
  const L = (x1, y1, x2, y2) => `M${cx + x1 * s} ${cy + y1 * s}L${cx + x2 * s} ${cy + y2 * s}`;
  const A = (x1, y1, x2, y2, sweep) => `M${cx + x1 * s} ${cy + y1 * s}A${s / 2} ${s / 2} 0 0 ${sweep} ${cx + x2 * s} ${cy + y2 * s}`;
  if (kind === "triangles") {
    const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
    const k = o % 4;
    const pts = [corners[k], corners[(k + 1) % 4], corners[(k + 2) % 4]].map(([x, y]) => `${cx + x * s},${cy + y * s}`).join(" ");
    return `<polygon points="${pts}" fill="${pal.fg}"/>`;
  }
  if (kind === "diagonals") {
    const d = o % 2 ? L(-0.5, -0.5, 0.5, 0.5) : L(0.5, -0.5, -0.5, 0.5);
    return `<path d="${d}" stroke="${pal.fg}" stroke-width="${lw}" stroke-linecap="square"/>`;
  }
  // arcs
  const rotated = o % 2 === 1;
  let out = "";
  if (state.fill && kind === "arcs") {
    const q = parity(i + (rotated ? 1 : 0), j);
    const disk = q ? pal.a : pal.b;
    out += `<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" fill="${q ? pal.b : pal.a}"/>`;
    const d = !rotated
      ? `M${cx - s / 2} ${cy - s / 2}L${cx} ${cy - s / 2}A${s / 2} ${s / 2} 0 0 1 ${cx - s / 2} ${cy}Z M${cx + s / 2} ${cy + s / 2}L${cx} ${cy + s / 2}A${s / 2} ${s / 2} 0 0 1 ${cx + s / 2} ${cy}Z`
      : `M${cx + s / 2} ${cy - s / 2}L${cx + s / 2} ${cy}A${s / 2} ${s / 2} 0 0 1 ${cx} ${cy - s / 2}Z M${cx - s / 2} ${cy + s / 2}L${cx - s / 2} ${cy}A${s / 2} ${s / 2} 0 0 1 ${cx} ${cy + s / 2}Z`;
    out += `<path d="${d}" fill="${disk}"/>`;
  }
  const d = !rotated ? A(0, -0.5, -0.5, 0, 1) + A(0, 0.5, 0.5, 0, 1) : A(0.5, 0, 0, -0.5, 1) + A(-0.5, 0, 0, 0.5, 1);
  return out + `<path d="${d}" fill="none" stroke="${pal.fg}" stroke-width="${lw}"/>`;
};

const download = (blob, name) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const exportSVG = () => {
  const s = 100;
  const pal = P();
  let body = "";
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) body += svgTile(state.set, tiles[j * cols + i], i, j);
  const W = cols * s, H = rows * s;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${pal.bg}"/>
${body}
</svg>`;
  download(new Blob([svg], { type: "image/svg+xml" }), `truchet-${state.set}.svg`);
};

// ------------------------------------------------------------ controls

const $ = (id) => document.getElementById(id);

let hashTimer;
const saveHash = () => {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const q = new URLSearchParams({ t: state.set, n: state.n, s: state.seed, c: state.palette });
    if (state.bias !== 0.5) q.set("b", state.bias);
    if (!state.fill) q.set("f", 0);
    q.set("w", state.width);
    history.replaceState(null, "", "#" + q.toString());
  }, 300);
};

const readHash = () => {
  const q = new URLSearchParams(location.hash.slice(1));
  if (SETS[q.get("t")]) state.set = q.get("t");
  if (PALETTES[q.get("c")]) state.palette = q.get("c");
  const n = +q.get("n"), s = +q.get("s"), b = parseFloat(q.get("b")), w = parseFloat(q.get("w"));
  if (n >= 3 && n <= 60) state.n = n;
  if (s > 0) state.seed = Math.floor(s);
  if (b >= 0 && b <= 1) state.bias = b;
  if (w > 0 && w <= 0.5) state.width = w;
  if (q.get("f") === "0") state.fill = false;
};

const showText = () => {
  $("set-text").textContent = SETS[state.set].text;
  $("fill-box").hidden = state.set === "triangles" || state.set === "diagonals";
  $("btn-svg").disabled = state.set === "weave" || state.set === "hex";
  $("btn-svg").title = state.set === "weave" || state.set === "hex" ? "SVG export works for the square tiles without bands" : "";
};

const resize = () => {
  const r = canvas.getBoundingClientRect();
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(r.width * ratio);
  if (w && canvas.width !== w) {
    canvas.width = w;
    canvas.height = w;
    const old = tiles;
    shuffle();
    if (old.length === tiles.length) tiles = old;
  }
};

const initTruchet = () => {
  canvas = $("tiles");
  ctx = canvas.getContext("2d");
  readHash();
  $("set").innerHTML = Object.entries(SETS)
    .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
    .join("");
  $("palette").innerHTML = Object.entries(PALETTES)
    .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
    .join("");
  $("set").value = state.set;
  $("palette").value = state.palette;
  $("n").value = state.n;
  $("bias").value = state.bias;
  $("width").value = state.width;
  $("fill").checked = state.fill;
  $("set").addEventListener("change", (e) => {
    state.set = e.target.value;
    showText();
    shuffle();
  });
  $("palette").addEventListener("change", (e) => {
    state.palette = e.target.value;
    dirty = true;
    saveHash();
  });
  $("n").addEventListener("input", (e) => {
    state.n = +e.target.value;
    shuffle();
  });
  $("bias").addEventListener("input", (e) => {
    state.bias = +e.target.value;
    shuffle();
  });
  $("width").addEventListener("input", (e) => {
    state.width = +e.target.value;
    dirty = true;
    saveHash();
  });
  $("fill").addEventListener("change", (e) => {
    state.fill = e.target.checked;
    dirty = true;
    saveHash();
  });
  $("shimmer").addEventListener("change", (e) => (state.shimmer = e.target.checked));
  $("btn-shuffle").addEventListener("click", () => {
    state.seed = 1 + Math.floor(Math.random() * 1e6);
    shuffle();
  });
  $("btn-png").addEventListener("click", () => {
    render();
    canvas.toBlob((b) => download(b, `truchet-${state.set}.png`));
  });
  $("btn-svg").addEventListener("click", exportSVG);
  canvas.addEventListener("click", (e) => {
    const r = canvas.getBoundingClientRect();
    const k = tileAt(((e.clientX - r.left) / r.width) * canvas.width, ((e.clientY - r.top) / r.height) * canvas.height);
    if (k >= 0) turn(k);
  });
  showText();
  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(loop);
};
