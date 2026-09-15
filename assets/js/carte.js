// each entry: { nom, architecte, lieu, x, y, url } — x/y are a percentage
// position within the map's bounding box (0,0 = top-left, 100,100 = bottom-right)
const PROJECTS = [
  { nom: "Tupi", architecte: "mijong architecture", lieu: "Sion (VS)", x: 34.6, y: 74.9, url: "projets/viewer.html?p=tupi" },
  { nom: "Haus am See", architecte: "Jan Kinsbergen", lieu: "Wollerau (SZ)", x: 62.2, y: 28.3, url: "projets/viewer.html?p=haus" },
  { nom: "Oberaletschhütte", architecte: "mijong architecture design", lieu: "Belalp (VS)", x: 48.7, y: 68.2, url: "projets/viewer.html?p=oberaletsch" },
];

function renderPins(){
  const container = document.getElementById('ch-pins');
  const empty = document.getElementById('ch-empty');
  container.innerHTML = '';
  PROJECTS.forEach((p) => {
    const pin = document.createElement('div');
    pin.className = 'ch-pin';
    pin.style.left = p.x + '%';
    pin.style.top = p.y + '%';
    pin.tabIndex = 0;
    pin.innerHTML = `<span class="ch-pin-tip">
      <span class="ch-pin-tip-title">${p.nom}</span>
      <span class="ch-pin-tip-arch">${p.architecte}</span>
      <span class="ch-pin-tip-loc">${p.lieu}</span>
    </span>`;
    if (p.url) pin.addEventListener('click', () => { window.location.href = p.url; });
    container.appendChild(pin);
  });
  empty.hidden = PROJECTS.length > 0;
}
renderPins();
