// ---------- Load data (this is your "backend" for now) ----------
// Later, if you add real user accounts/progress, you'd swap these two
// fetch URLs for your actual API endpoints — nothing else in this file changes.
let elements = [];
let reactions = [];

Promise.all([
  fetch('elements.json').then(r => r.json()),
  fetch('reactions.json').then(r => r.json())
]).then(([elementsData, reactionsData]) => {
  elements = elementsData;
  reactions = reactionsData;
  renderGrid();
}).catch(err => {
  console.error('Failed to load chemistry data:', err);
  document.getElementById('grid').textContent =
    'Could not load elements.json / reactions.json — check they are in the same folder as index.html.';
});

function findReaction(a, b, data) {
  const norm = s => s.trim().toLowerCase();
  return data.find(r => {
    const [r1, r2] = r.reactants.map(norm);
    return (r1 === norm(a) && r2 === norm(b)) || (r1 === norm(b) && r2 === norm(a));
  }) || null;
}

// ---------- State ----------
let selectedElement = null;
let selectedReagent = null;
let stoveOn = false;
let selectedTile = null;

const grid = document.getElementById('grid');
const reagentTray = document.getElementById('reagentTray');
const reactBtn = document.getElementById('reactBtn');
const beaker = document.getElementById('beaker');
const liquid = document.getElementById('liquid');
const flash = document.getElementById('flash');
const flame = document.getElementById('flame');
const bench = document.getElementById('bench');
const result = document.getElementById('result');
const resultEq = document.getElementById('resultEq');
const resultMeta = document.getElementById('resultMeta');
const resultWhy = document.getElementById('resultWhy');

const propertiesPanel = document.getElementById('propertiesPanel');
const propFormula = document.getElementById('propFormula');
const propState = document.getElementById('propState');
const propColor = document.getElementById('propColor');
const propUse = document.getElementById('propUse');

const swirlCanvas = document.getElementById('swirlCanvas');
const swirlCtx = swirlCanvas.getContext('2d');

const drawer = document.getElementById('drawer');
const drawerSymbol = document.getElementById('drawerSymbol');
const drawerName = document.getElementById('drawerName');
const drawerMeta = document.getElementById('drawerMeta');
const drawerNote = document.getElementById('drawerNote');
const drawerClose = document.getElementById('drawerClose');

function renderGrid() {
  grid.innerHTML = '';
  elements.forEach(el => {
    const tile = document.createElement('div');
    tile.className = `tile ${el.category}`;
    tile.innerHTML = `
      <div class="num">${el.atomic_number ?? ''}</div>
      <div class="symbol">${el.symbol}</div>
      <div class="name">${el.name}</div>
    `;
    tile.addEventListener('click', () => selectTile(el, tile));
    grid.appendChild(tile);
  });
}

// Tapping a tile does two things at once:
// 1. Selects it as the reactant for the beaker
// 2. Opens the info drawer with its reactivity note
function selectTile(el, tile) {
  if (selectedTile) selectedTile.classList.remove('selected');
  tile.classList.add('selected');
  selectedTile = tile;
  selectedElement = el.symbol;

  drawerSymbol.textContent = el.symbol;
  drawerSymbol.className = `drawer-symbol ${el.category}`;
  drawerName.textContent = el.name;
  drawerMeta.textContent = `${el.category} · ${el.color} · ${el.state} at room temp`;
  drawerNote.textContent = el.reactivity_note;
  drawer.classList.add('open');

  checkReady();
}

drawerClose.addEventListener('click', () => {
  drawer.classList.remove('open');
  // Note: closing the drawer does NOT deselect the element —
  // the tile stays highlighted and ready to react.
});

reagentTray.querySelectorAll('.reagent-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    reagentTray.querySelectorAll('.reagent-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedReagent = btn.dataset.val;
    stoveOn = selectedReagent === 'heat';
    flame.classList.toggle('lit', stoveOn);
    if (stoveOn) spawnSteam();
    checkReady();
  });
});

function checkReady() {
  reactBtn.classList.toggle('ready', !!selectedElement && !!selectedReagent);
}

function spawnSteam() {
  if (!stoveOn) return;
  const s = document.createElement('div');
  s.className = 'steam';
  s.style.left = (75 + Math.random() * 30) + 'px';
  bench.appendChild(s);
  setTimeout(() => s.remove(), 1900);
  setTimeout(spawnSteam, 350);
}

function spawnBubbles(count) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const b = document.createElement('div');
      b.className = 'bubble';
      b.style.left = (10 + Math.random() * 80) + '%';
      b.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
      beaker.appendChild(b);
      setTimeout(() => b.remove(), 1400);
    }, i * 90);
  }
}

reactBtn.addEventListener('click', () => {
  if (!selectedElement || !selectedReagent) return;
  drawer.classList.remove('open');

  const reaction = findReaction(selectedElement, selectedReagent, reactions);

  liquid.classList.remove('empty', 'glow-exo', 'glow-endo');
  liquid.style.height = '60%';

  if (!reaction) {
    liquid.style.background = '#3C4448';
    result.className = 'result show no-reaction';
    resultEq.textContent = `${selectedElement} + ${selectedReagent} → not simulated yet`;
    resultMeta.textContent = '';
    resultWhy.textContent = "This combination isn't in the database yet — try another pair.";
    propertiesPanel.classList.remove('show');
    return;
  }

  if (reaction.reaction_type === 'no_reaction') {
    liquid.style.background = '#4A5458';
    result.className = 'result show no-reaction';
    propertiesPanel.classList.remove('show');
  } else {
    const isExo = reaction.energy === 'exothermic';
    liquid.style.background = isExo ? '#B5502E' : '#2E5FA3';
    liquid.classList.add(isExo ? 'glow-exo' : 'glow-endo');
    result.className = 'result show';

    if (reaction.reaction_type === 'combustion') {
      flash.classList.remove('fire');
      void flash.offsetWidth;
      flash.classList.add('fire');
    }
    if (/H2|CO2|O2/.test(reaction.equation)) {
      spawnBubbles(10);
    }

    if (reaction.product_properties) {
      propFormula.textContent = reaction.product_properties.formula;
      propState.textContent = reaction.product_properties.state;
      propColor.textContent = reaction.product_properties.color;
      propUse.textContent = reaction.product_properties.use;
      propertiesPanel.classList.add('show');
    } else {
      propertiesPanel.classList.remove('show');
    }
  }

  resultEq.textContent = reaction.equation;
  resultMeta.textContent = `${reaction.reaction_type} · ${reaction.energy}`;
  resultWhy.textContent = reaction.why;
});
