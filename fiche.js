(function(){
'use strict';
const { listings, makeSchedule, euro } = window.LTP;

const params = new URLSearchParams(location.search);
const listing = listings.find(l => l.id === params.get('id')) || listings[0];
const DAYS = makeSchedule(listing);
const isOpen = listing.model === 'open';
const p = listing.pricing;

const state = { format:'slot', week:0, day:0, slot:null, persons:2, privatise:false, payment:'online', extras:{} };

const ICONS = {
  shower:'<path d="M7 19V6a3 3 0 0 1 6 0M17 19V6M3 19h18" stroke-linecap="round"/>',
  deck:'<rect x="4" y="10" width="16" height="8" rx="1.5"/><path d="M7 10V7h10v3" stroke-linecap="round"/>',
  heat:'<path d="M8 4c2 2.5-2 4 0 6.5M13 4c2 2.5-2 4 0 6.5M18 4c2 2.5-2 4 0 6.5" stroke-linecap="round"/><path d="M4 16c2.7-2.3 5.3-2.3 8 0s5.3 2.3 8 0" stroke-linecap="round"/>',
  wc:'<rect x="5" y="4" width="14" height="16" rx="1.5"/><path d="M9 8h6M9 12h6" stroke-linecap="round"/>',
  gate:'<path d="M4 20h16M6 20V9l6-4.5L18 9v11" stroke-linejoin="round"/>',
  fence:'<path d="M5 12h14M5 16h14M12 4v4" stroke-linecap="round"/><circle cx="12" cy="6" r="2"/>',
  parking:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 16v-8h3a2.5 2.5 0 0 1 0 5h-3" stroke-linecap="round"/>',
  light:'<circle cx="12" cy="10" r="4"/><path d="M12 2v2M4 10H2M22 10h-2M5.6 3.6l1.4 1.4M18.4 3.6 17 5M10 18h4M10.5 21h3" stroke-linecap="round"/>',
  robe:'<path d="M9 4 7 20h10L15 4M9 4h6M9 4 12 9l3-5M12 9v11" stroke-linecap="round" stroke-linejoin="round"/>'
};
const star = '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
const heartIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>';

const el = id => document.getElementById(id);

/* ===== Contenu de la fiche ===== */
document.title = listing.name + ' — Loue ta piscine';
el('ficheLoc').textContent = listing.location + ' · à ' + listing.distance;
el('ficheName').textContent = listing.name;
el('ficheDims').textContent = listing.dims;
el('ficheRating').innerHTML = listing.rating + ' <small>· ' + listing.reviews + ' avis</small>';
el('ficheDesc').textContent = listing.description;

const chips = [];
if(isOpen){ chips.push(['open','Séances ouvertes']); chips.push(['neutral','Privatisable']); }
else chips.push(['open','Toujours privatisé']);
if(listing.host.premium) chips.push(['premium','★ Hôte Premium']);
if(listing.facts[0].includes('°C')) chips.push(['neutral', (listing.type === 'sauna' ? '' : 'Chauffée · ') + listing.facts[0]]);
if(listing.host.onsite) chips.push(['onsite','Paiement sur place disponible']);
el('ficheChips').innerHTML = chips.map(c => '<span class="chip chip-' + c[0] + '">' + c[1] + '</span>').join('');

el('ficheBadges').innerHTML = listing.badges.map((b, i) => '<span class="' + (i === 0 && b === 'À la une' ? 'premium' : '') + '">' + b + '</span>').join('');

const mainImg = el('galleryMain');
mainImg.src = listing.gallery[0];
mainImg.alt = listing.name + ' — photo 1';
el('galleryThumbs').innerHTML = listing.gallery.map((src, i) =>
  '<button type="button" role="tab" aria-selected="' + (i === 0) + '" data-photo="' + i + '"><img src="' + src + '" alt="' + listing.name + ' — miniature ' + (i + 1) + '" loading="lazy"></button>'
).join('');
el('galleryThumbs').addEventListener('click', ev => {
  const b = ev.target.closest('[data-photo]');
  if(!b) return;
  const i = +b.dataset.photo;
  mainImg.src = listing.gallery[i];
  mainImg.alt = listing.name + ' — photo ' + (i + 1);
  document.querySelectorAll('#galleryThumbs [role="tab"]').forEach(t => t.setAttribute('aria-selected', t === b));
});

el('ficheEquip').innerHTML = listing.equipment.map(e =>
  '<div class="equip-item"><svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[e[0]] || ICONS.deck) + '</svg>' + e[1] + '</div>'
).join('');

el('visiteSummary').textContent = 'Vérifié par l’équipe le ' + listing.visit.date;
el('visiteBadge').textContent = 'conforme ' + listing.visit.points.length + '/' + listing.visit.points.length;
el('visitePoints').innerHTML = listing.visit.points.map(pt => '<li>' + pt + '</li>').join('');
el('ficheRules').innerHTML = listing.rules.map(r => '<li>' + r + '</li>').join('');

el('ficheAvis').innerHTML = listing.reviewsList.map(r =>
  '<figure><div class="stars" aria-label="5 étoiles">' + star.repeat(5) + '</div><p>« ' + r.text + ' »</p><figcaption>' + r.author + '</figcaption></figure>'
).join('');

const h = listing.host;
el('ficheHost').innerHTML =
  '<div class="host-avatar" aria-hidden="true">' + h.initial + '</div>' +
  '<div><b>' + h.name + '</b>' +
  '<p class="host-meta">' + (h.premium ? 'Hôte Premium · ' : '') + 'note ' + listing.rating + (h.onsite ? ' · paiement sur place débloqué' : '') + ' · répond en ' + h.response + '</p>' +
  '<p>Messagerie intégrée avant réservation — les coordonnées sont communiquées automatiquement après confirmation.</p>' +
  '<button class="host-write" type="button" data-message>Écrire à ' + h.name + ' →</button></div>';

/* ===== Réservation ===== */
const dayStrip = el('dayStrip'), slotList = el('slotList'), cfg = el('bookConfig');

el('bookPrice').innerHTML = '<b>' + listing.price + '</b> ' + listing.priceNote;
el('bookRating').textContent = listing.rating;

const HALF_HOURS = '14 h – 18 h';
function canDay(dy){
  return !dy.slots.some(s => !s.buffer && (s.regime === 'priv' || (s.booked || 0) > 0));
}
/* Demi-journée = l'après-midi entier : possible seulement si aucun créneau de 13 h à 18 h n'est pris. */
function canHalf(dy){
  return dy.slots.every(s => {
    if(s.buffer) return true;
    const start = parseInt(s.t, 10);
    if(start >= 13 && start < 18) return s.regime === 'open' && s.booked === 0;
    return true;
  });
}
function dayFloor(dy){
  if(state.format === 'day') return canDay(dy) ? p.dayPrice + ' €' : 'réservé';
  if(state.format === 'half') return canHalf(dy) ? p.halfDay + ' €' : 'réservé';
  const prices = dy.slots.filter(s => !s.buffer && s.regime !== 'priv' && (s.regime === 'unit' || s.booked < s.cap)).map(s => s.regime === 'unit' ? s.price : s.priceP);
  return prices.length ? 'dès ' + Math.min.apply(Math, prices) + '€' : 'complet';
}

function renderFormats(){
  const withHalf = isOpen && p.halfDay;
  const slotPick = isOpen
    ? '<button class="format-pick" type="button" data-format="slot"><span>À la séance</span><b>' + listing.price + (withHalf ? '' : ' / personne') + '</b><small>2 h · ouverte ou privatisée</small></button>'
    : '<button class="format-pick" type="button" data-format="slot"><span>Au créneau</span><b>' + listing.unitPrice + ' € / ' + listing.unit + '</b><small>' + listing.unitNote + '</small></button>';
  const halfPick = withHalf
    ? '<button class="format-pick" type="button" data-format="half"><span>Demi-journée</span><b>' + p.halfDay + ' €</b><small>' + HALF_HOURS + ' · privatisée</small></button>'
    : '';
  el('formatPicks').classList.toggle('three', !!withHalf);
  el('formatPicks').innerHTML = slotPick + halfPick +
    '<button class="format-pick" type="button" data-format="day"><span>À la journée</span><b>' + p.dayPrice + ' €' + (withHalf ? '' : ' au total') + '</b><small>' + listing.dayHours + ' · jusqu’à ' + listing.dayCap + ' pers.</small></button>';
  el('formatPicks').querySelectorAll('.format-pick').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.format === state.format);
    btn.addEventListener('click', () => { state.format = btn.dataset.format; state.slot = null; state.privatise = state.format !== 'slot'; render(); });
  });
}

function syncJourney(){
  document.querySelectorAll('#journey .j-step').forEach((step, i) => {
    step.classList.toggle('active', state.slot === null ? i === 1 : i === 2);
    step.classList.toggle('done', i === 0 || (state.slot !== null && i === 1));
  });
}

function renderDays(){
  dayStrip.innerHTML = '';
  const start = state.week * 7;
  const visible = DAYS.slice(start, start + 7);
  const first = visible[0], last = visible[visible.length - 1];
  el('calRange').textContent = first.month === last.month
    ? first.lbl[1] + ' – ' + last.lbl[1] + ' ' + last.month
    : first.lbl[1] + ' ' + first.month + ' – ' + last.lbl[1] + ' ' + last.month;
  el('weekPrev').disabled = state.week === 0;
  el('weekNext').disabled = start + 7 >= DAYS.length;
  visible.forEach((dy, offset) => {
    const i = start + offset;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'day' + (state.day === i ? ' active' : '');
    b.setAttribute('role','tab');
    b.setAttribute('aria-selected', state.day === i);
    b.innerHTML = '<small>' + dy.lbl[0] + '</small><b>' + dy.lbl[1] + '</b><span>' + dayFloor(dy) + '</span>';
    b.addEventListener('click', () => { state.day = i; state.slot = null; state.privatise = state.format !== 'slot'; render(); });
    dayStrip.appendChild(b);
  });
}

function slotButton(html, selected, disabled){
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'slot' + (selected ? ' selected' : '');
  btn.disabled = !!disabled;
  btn.innerHTML = html;
  return btn;
}

function renderSlots(){
  slotList.innerHTML = '';
  const dy = DAYS[state.day];
  if(state.format === 'day'){
    const ok = canDay(dy);
    const btn = slotButton(ok
      ? '<span class="s-time">' + listing.dayHours + '</span><span class="s-info">Jusqu’à ' + listing.dayCap + ' personnes — le lieu est à vous</span><span class="s-price">' + p.dayPrice + ' €<small> /jour</small></span><span class="s-tag tag-priv">Privatisé</span>'
      : '<span class="s-time">' + listing.dayHours + '</span><span class="s-info">Des réservations existent déjà ce jour-là</span><span class="s-tag tag-full">Indisponible</span>',
      state.slot === 'day', !ok);
    if(ok) btn.addEventListener('click', () => { state.slot = 'day'; state.privatise = true; if(state.persons < 2) state.persons = 2; render(); });
    slotList.appendChild(btn);
    addCustomRequest();
    return;
  }
  if(state.format === 'half'){
    const ok = canHalf(dy);
    const btn = slotButton(ok
      ? '<span class="s-time">' + HALF_HOURS + '</span><span class="s-info">Jusqu’à ' + listing.dayCap + ' personnes — l’après-midi est à vous</span><span class="s-price">' + p.halfDay + ' €</span><span class="s-tag tag-priv">Privatisé</span>'
      : '<span class="s-time">' + HALF_HOURS + '</span><span class="s-info">L’après-midi est déjà réservé, en partie ou en entier</span><span class="s-tag tag-full">Indisponible</span>',
      state.slot === 'half', !ok);
    if(ok) btn.addEventListener('click', () => { state.slot = 'half'; state.privatise = true; if(state.persons < 2) state.persons = 2; render(); });
    slotList.appendChild(btn);
    addCustomRequest();
    return;
  }
  dy.slots.forEach((s, i) => {
    if(s.buffer){
      const r = document.createElement('div');
      r.className = 'buffer-row';
      r.textContent = 'rotation · 30 min';
      slotList.appendChild(r);
      return;
    }
    if(s.regime === 'priv'){
      slotList.appendChild(slotButton('<span class="s-time">' + s.t + '</span><span class="s-info">Réservé</span><span class="s-tag tag-priv">Privatisé</span>', false, true));
      return;
    }
    if(s.regime === 'unit'){
      const btn = slotButton('<span class="s-time">' + s.t + '</span><span class="s-info">Jusqu’à ' + s.cap + ' personnes</span><span class="s-price">' + euro(s.price) + '</span><span class="s-tag tag-priv">Privatisé</span>', state.slot === i);
      btn.addEventListener('click', () => { state.slot = i; state.privatise = true; if(state.persons > s.cap) state.persons = s.cap; render(); });
      slotList.appendChild(btn);
      return;
    }
    const left = s.cap - s.booked;
    const fill = Math.round(s.booked / s.cap * 100);
    const tag = s.bleue ? '<span class="s-tag tag-bleue">Heure bleue</span>' : '<span class="s-tag tag-open">Ouverte</span>';
    if(left <= 0){
      slotList.appendChild(slotButton('<span class="s-time">' + s.t + '</span><span class="s-info"><i class="gauge"><b style="width:100%"></b></i>' + s.cap + ' baigneurs</span><span class="s-tag tag-full">Complet</span>', false, true));
    } else {
      const btn = slotButton('<span class="s-time">' + s.t + '</span><span class="s-info"><i class="gauge"><b style="width:' + fill + '%"></b></i>' + left + ' place' + (left > 1 ? 's' : '') + '</span><span class="s-price">' + euro(s.priceP) + '<small>/pers</small></span>' + tag, state.slot === i);
      btn.addEventListener('click', () => {
        state.slot = i; state.privatise = false;
        if(state.persons > left) state.persons = left;
        render();
      });
      slotList.appendChild(btn);
    }
  });
  addCustomRequest();
}

function addCustomRequest(){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'custom-request';
  b.textContent = 'Un autre horaire ? Demander à ' + h.name;
  b.addEventListener('click', () => showToast('La messagerie arrive dans la V2 — disponible dans la démo V1'));
  slotList.appendChild(b);
}

function paymentBlock(){
  if(!h.onsite) return '<p class="pay-note">Paiement en ligne sécurisé — le paiement sur place est réservé aux hôtes notés au-dessus de 4,5.</p>';
  return '<div class="payment-methods" role="radiogroup" aria-label="Mode de paiement">' +
    '<label class="pay-choice"><input type="radio" name="payment" value="online"' + (state.payment === 'online' ? ' checked' : '') + '><span>Payer en ligne<small>Paiement sécurisé et confirmation immédiate</small></span></label>' +
    '<label class="pay-choice"><input type="radio" name="payment" value="onsite"' + (state.payment === 'onsite' ? ' checked' : '') + '><span>Payer sur place<small>Débloqué : ' + h.name + ' est noté·e ' + listing.rating + ', au-dessus du seuil de 4,5</small></span></label>' +
  '</div>';
}

function renderConfig(){
  if(state.slot === null){
    cfg.innerHTML = '<p class="book-empty">Choisissez un créneau — le prix est tout compris, avant de payer.</p>' +
      '<button class="book-msg" type="button" data-message>Poser une question à ' + h.name + ' — messagerie intégrée</button>';
    el('mobilePrice').textContent = state.format === 'day' ? p.dayPrice + ' € la journée' : listing.price + ' ' + listing.priceNote;
    el('mobileRecap').textContent = 'Disponibilités et prix en temps réel';
    bindMessage();
    return;
  }
  const dy = DAYS[state.day];
  const isDay = state.slot === 'day';
  const isHalf = state.slot === 'half';
  const s = isDay ? { t:listing.dayHours, cap:listing.dayCap, booked:0 }
    : isHalf ? { t:HALF_HOURS, cap:listing.dayCap, booked:0 }
    : dy.slots[state.slot];
  const unit = !isDay && !isHalf && s.regime === 'unit';
  const left = s.cap - (s.booked || 0);
  const canPriv = isOpen && !isDay && !isHalf && !unit && s.booked === 0;
  const base = isDay ? p.dayPrice : isHalf ? p.halfDay : unit ? s.price : state.privatise ? s.pricePriv : s.priceP * state.persons;
  let extrasTotal = 0, extrasRows = '';
  listing.extras.forEach(x => {
    const on = !!state.extras[x.id];
    if(on) extrasTotal += x.price;
    extrasRows += '<div class="opt"><input type="checkbox" id="x-' + x.id + '"' + (on ? ' checked' : '') + '><label for="x-' + x.id + '">' + x.lbl + '<small>' + x.sub + '</small></label><span class="o-price">+' + euro(x.price) + '</span></div>';
  });
  const total = base + extrasTotal;
  const mode = isDay ? 'journée privée' : isHalf ? 'demi-journée privée' : unit || state.privatise ? 'privatisé' : 'séance ouverte';
  const priv = isDay || isHalf || unit || state.privatise;
  const occupied = priv ? state.persons : s.booked + state.persons;
  const fill = Math.min(100, Math.round(occupied / s.cap * 100));
  const maxPersons = priv ? s.cap : left;

  cfg.innerHTML =
    '<div class="book-config">' +
    '<p class="book-recap">' + dy.lbl[0] + ' ' + dy.lbl[1] + ' ' + dy.month + ' · ' + s.t + ' · ' + mode + '</p>' +
    '<div class="cap-status"><b>' + (priv ? 'Votre groupe : ' + state.persons + ' / ' + s.cap : occupied + ' / ' + s.cap + ' places après réservation') + '</b><span>' + (s.cap - occupied) + ' restante' + (s.cap - occupied > 1 ? 's' : '') + '</span><span class="cap-track"><i style="width:' + fill + '%"></i></span></div>' +
    '<div class="persons"><span>' + (isDay || isHalf ? 'Participants' : 'Baigneurs') + '</span><div class="stepper">' +
      '<button type="button" id="pMinus" aria-label="Moins"' + (state.persons <= 1 ? ' disabled' : '') + '>−</button>' +
      '<span class="p-num">' + state.persons + '</span>' +
      '<button type="button" id="pPlus" aria-label="Plus"' + (state.persons >= maxPersons ? ' disabled' : '') + '>+</button>' +
    '</div></div>' +
    (canPriv || (isOpen && !isDay && !isHalf && !unit)
      ? '<div class="privat' + (canPriv ? '' : ' off') + '">' +
        '<input type="checkbox" id="privCheck"' + (state.privatise ? ' checked' : '') + (canPriv ? '' : ' disabled') + '>' +
        '<label for="privCheck"><b>Privatiser — ' + euro(s.pricePriv) + '</b>' +
        '<small>' + (canPriv ? 'Possible tant que personne n’a réservé.' : s.booked + ' baigneur' + (s.booked > 1 ? 's ont' : ' a') + ' déjà réservé cette séance.') + '</small></label></div>'
      : '') +
    extrasRows +
    paymentBlock() +
    '<div class="book-total">' +
      '<div class="t-row"><span>' + (isDay ? 'Journée privée · jusqu’à ' + s.cap + ' pers.' : isHalf ? 'Demi-journée privée · jusqu’à ' + s.cap + ' pers.' : unit ? 'Créneau privatisé · ' + listing.unit : state.privatise ? 'Privatisation' : state.persons + ' × ' + euro(s.priceP)) + '</span><span>' + euro(base) + '</span></div>' +
      (extrasTotal ? '<div class="t-row"><span>Extras</span><span>' + euro(extrasTotal) + '</span></div>' : '') +
      '<div class="t-row"><span>Frais de service</span><span>inclus</span></div>' +
      '<div class="t-row grand"><span>Total — tout compris</span><span>' + euro(total) + '</span></div>' +
      '<a class="book-cta" href="' + confirmURL(dy, s, mode, total) + '">' + (state.payment === 'onsite' ? 'Confirmer — paiement sur place' : 'Réserver et payer') + ' →</a>' +
      '<p class="t-small">Annulation gratuite jusqu’à 48 h avant. Les coordonnées de ' + h.name + ' vous sont envoyées à la confirmation.</p>' +
    '</div></div>';

  el('pMinus') && el('pMinus').addEventListener('click', () => { if(state.persons > 1){ state.persons--; renderConfig(); } });
  el('pPlus') && el('pPlus').addEventListener('click', () => { if(state.persons < maxPersons){ state.persons++; renderConfig(); } });
  const pc = el('privCheck');
  if(pc && canPriv) pc.addEventListener('change', () => { state.privatise = pc.checked; renderConfig(); });
  listing.extras.forEach(x => {
    const box = el('x-' + x.id);
    if(box) box.addEventListener('change', () => { state.extras[x.id] = box.checked; renderConfig(); });
  });
  document.querySelectorAll('input[name="payment"]').forEach(r => r.addEventListener('change', () => { state.payment = r.value; renderConfig(); }));
  el('mobilePrice').textContent = euro(total) + ' au total';
  el('mobileRecap').textContent = dy.lbl[0] + ' ' + dy.lbl[1] + ' ' + dy.month + ' · ' + s.t;
}

function confirmURL(dy, s, mode, total){
  const q = new URLSearchParams({
    id:listing.id, mode,
    date:dy.lbl[0] + ' ' + dy.lbl[1] + ' ' + dy.month,
    time:s.t, persons:state.persons, total,
    paiement:state.payment === 'onsite' ? 'place' : 'ligne'
  });
  return 'confirmation.html?' + q.toString();
}

function render(){ renderFormats(); renderDays(); renderSlots(); renderConfig(); syncJourney(); }
el('weekPrev').addEventListener('click', () => { if(state.week > 0){ state.week--; state.day = state.week * 7; state.slot = null; render(); } });
el('weekNext').addEventListener('click', () => { if((state.week + 1) * 7 < DAYS.length){ state.week++; state.day = state.week * 7; state.slot = null; render(); } });
render();

/* ===== Drawer mobile ===== */
const panel = el('bookingPanel'), overlay = el('bookOverlay');
function toggleBooking(open){
  panel.classList.toggle('open', open);
  overlay.hidden = !open;
  document.body.classList.toggle('booking-open', open);
}
el('bookOpen').addEventListener('click', () => toggleBooking(true));
el('bookClose').addEventListener('click', () => toggleBooking(false));
overlay.addEventListener('click', () => toggleBooking(false));
document.addEventListener('keydown', ev => { if(ev.key === 'Escape') toggleBooking(false); });

/* ===== Favori + divers ===== */
const favKey = 'ltp-v2-favorites';
const favBtn = el('ficheFavorite');
const favs = new Set(JSON.parse(localStorage.getItem(favKey) || '[]'));
function syncFav(){
  favBtn.classList.toggle('fav-active', favs.has(listing.id));
  favBtn.setAttribute('aria-pressed', favs.has(listing.id));
}
favBtn.addEventListener('click', () => {
  favs.has(listing.id) ? favs.delete(listing.id) : favs.add(listing.id);
  localStorage.setItem(favKey, JSON.stringify([...favs]));
  syncFav();
});
syncFav();

function showToast(message){
  const toast = el('hostToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}
function bindMessage(){
  document.querySelectorAll('[data-message]').forEach(b => {
    if(b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', () => showToast('La messagerie arrive dans la V2 — disponible dans la démo V1'));
  });
}
bindMessage();
document.addEventListener('click', ev => {
  if(ev.target.closest('[data-host]')) showToast('Le parcours hôte arrive dans la V2 — disponible dans la démo V1');
  const dead = ev.target.closest('a[href="#"]');
  if(dead) ev.preventDefault();
});
})();
