cat << 'JSEOF' > /home/claude/about.js
// ---------- AirDrop card swipe ----------
const card = document.getElementById('card');
const stampAccept = document.getElementById('stampAccept');
const stampDecline = document.getElementById('stampDecline');
const status = document.getElementById('status');
const hint = document.getElementById('hint');
const btnAccept = document.getElementById('btnAccept');
const btnDecline = document.getElementById('btnDecline');
const modal = document.getElementById('modal-placeholder');
const modalClose = document.getElementById('modalClose');

let hintDismissed = false;
function dismissHint() {
  if (hintDismissed) return;
  hintDismissed = true;
  if (hint) hint.classList.add('hidden');
}

function showStatus(text) {
  if (!status) return;
  status.textContent = text;
  status.classList.add('show');
  setTimeout(() => status.classList.remove('show'), 1600);
}

let startX = 0, currentX = 0, dragging = false;

function setCardTransform(x, rotate, opAccept, opDecline) {
  card.style.transform = `translateX(${x}px) rotate(${rotate}deg)`;
  stampAccept.style.opacity = opAccept;
  stampDecline.style.opacity = opDecline;
}
function resetCard(animated) {
  card.style.transition = animated ? 'transform 0.45s cubic-bezier(.2,.9,.3,1.3)' : 'none';
  setCardTransform(0, 0, 0, 0);
}

// ПРИНЯТЬ -> открываем заглушку модалки (пока пустая, наполним позже)
function openModal() {
  modal.classList.remove('hidden');
}
function closeModal() {
  modal.classList.add('hidden');
}
if (modalClose) modalClose.addEventListener('click', closeModal);
if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function flyOut(direction, label, isAccept) {
  dismissHint();
  const distance = direction * window.innerWidth;
  card.style.transition = 'transform 0.5s cubic-bezier(.4,0,.2,1)';
  setCardTransform(distance, direction * 30, direction > 0 ? 1 : 0, direction < 0 ? 1 : 0);
  showStatus(label);
  if (isAccept) setTimeout(openModal, 350);
  setTimeout(() => {
    resetCard(false);
    requestAnimationFrame(() => {
      card.style.transition = 'transform 0.5s cubic-bezier(.2,.8,.3,1.2)';
      setCardTransform(0, 0, 0, 0);
    });
  }, 700);
}

if (card) {
  card.addEventListener('pointerdown', (e) => {
    dragging = true; startX = e.clientX;
    card.style.transition = 'none';
    card.setPointerCapture(e.pointerId);
  });
  card.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dismissHint();
    currentX = e.clientX - startX;
    const rotate = currentX * 0.04;
    const progress = Math.min(Math.abs(currentX) / 140, 1);
    setCardTransform(currentX, rotate, currentX > 0 ? progress : 0, currentX < 0 ? progress : 0);
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(currentX) > 120) {
      const isAccept = currentX > 0;
      flyOut(isAccept ? 1 : -1, isAccept ? 'Принято ✓' : 'Отклонено', isAccept);
    } else {
      resetCard(true);
    }
    currentX = 0;
  }
  card.addEventListener('pointerup', endDrag);
  card.addEventListener('pointercancel', endDrag);
}

if (btnAccept) btnAccept.addEventListener('click', () => flyOut(1, 'Принято ✓', true));
if (btnDecline) btnDecline.addEventListener('click', () => flyOut(-1, 'Отклонено', false));

// ---------- connectors (змейки к списку услуг) ----------
const items = Array.from(document.querySelectorAll('.service-item'));
const svg = document.getElementById('connectors');

function drawConnectors() {
  if (!svg) return;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 40 ${svg.parentElement.clientHeight}`);
  items.forEach((item, i) => {
    const y = item.offsetTop + item.offsetHeight / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M 0 ${y - 18} C 25 ${y - 18}, 15 ${y}, 40 ${y}`;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'rgba(255,255,255,0.35)');
    path.setAttribute('stroke-width', '2');
    const len = 90;
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.style.transition = `stroke-dashoffset 0.6s ease ${0.15 + i * 0.12}s`;
    svg.appendChild(path);
    requestAnimationFrame(() => requestAnimationFrame(() => { path.style.strokeDashoffset = 0; }));
  });
}
setTimeout(drawConnectors, 100);
window.addEventListener('resize', drawConnectors);

// ---------- tag filter ----------
const tagBtns = Array.from(document.querySelectorAll('.tag-btn'));
const emptyNote = document.getElementById('emptyNote');

tagBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tagBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tag = btn.dataset.tag;
    let anyVisible = false;
    items.forEach(item => {
      const tags = item.dataset.tags.split(' ');
      const match = tag === 'all' || tags.includes(tag);
      item.classList.toggle('highlight', match && tag !== 'all');
      item.classList.toggle('dim', !match);
      if (match) anyVisible = true;
    });
    if (emptyNote) emptyNote.classList.toggle('show', tag !== 'all' && !anyVisible);
  });
});
JSEOF
wc -l /home/claude/about.js
Output
