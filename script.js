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
  // Elements shown as single atoms on the periodic table (H, N, O, Cl) only
  // ever react as diatomic molecules (H2, N2, O2, Cl2). reactions.json is
  // written using the diatomic form, so we convert before comparing —
  // otherwise tapping "H" + Oxygen would never match the "H2 + O2" entry.
  const diatomic = { h: 'h2', n: 'n2', o: 'o2', cl: 'cl2' };
  const norm = s => {
    const lower = s.trim().toLowerCase();
    return diatomic[lower] || lower;
  };
  return data.find(r => {
    const [r1, r2] = r.reactants.map(norm);
    return (r1 === norm(a) && r2 === norm(b)) || (r1 === norm(b) && r2 === norm(a));
  }) || null;
}

// ---------- State ----------
let selectedElement = null;
let selectedReagent = null;
let selectedTile = null;

const grid = document.getElementById('grid');
const reagentTray = document.getElementById('reagentTray');
const reactBtn = document.getElementById('reactBtn');
const result = document.getElementById('result');
const resultEq = document.getElementById('resultEq');
const resultMeta = document.getElementById('resultMeta');
const resultWhy = document.getElementById('resultWhy');

const propertiesPanel = document.getElementById('propertiesPanel');
const propFormula = document.getElementById('propFormula');
const propState = document.getElementById('propState');
const propColor = document.getElementById('propColor');
const propUse = document.getElementById('propUse');

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
// 1. Selects it as the reactant
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
    checkReady();
  });
});

function checkReady() {
  reactBtn.classList.toggle('ready', !!selectedElement && !!selectedReagent);
}

reactBtn.addEventListener('click', () => {
  if (!selectedElement || !selectedReagent) return;
  drawer.classList.remove('open');

  const reaction = findReaction(selectedElement, selectedReagent, reactions);

  if (!reaction) {
    result.className = 'result show no-reaction';
    resultEq.textContent = `${selectedElement} + ${selectedReagent} → not simulated yet`;
    resultMeta.textContent = '';
    resultWhy.textContent = "This combination isn't in the database yet — try another pair.";
    propertiesPanel.classList.remove('show');
    return;
  }

  if (reaction.reaction_type === 'no_reaction') {
    result.className = 'result show no-reaction';
    propertiesPanel.classList.remove('show');
  } else {
    result.className = 'result show';

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
