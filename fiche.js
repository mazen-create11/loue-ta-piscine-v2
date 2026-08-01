(function(){
'use strict';
const { listings, makeSchedule, euro } = window.LTP;

const params = new URLSearchParams(location.search);
const listing = listings.find(l => l.id === params.get('id')) || listings[0];
if(params.get('id') && listing.id !== params.get('id')) history.replaceState(null, '', 'fiche.html?id=' + listing.id);

/* Ce que l'hôte enregistre dans son espace (clé ltp-listing-override) s'applique ici :
   sans ça, l'éditeur promettait une synchronisation qui n'arrivait jamais. */
try {
  const override = JSON.parse(localStorage.getItem('ltp-listing-override') || 'null');
  if(override && override.id === listing.id){
    ['name','location','description'].forEach(field => {
      if(override[field]) listing[field] = override[field];
    });
    if(override.pricing && listing.pricing){
      Object.assign(listing.pricing, override.pricing);
      // le prix d'appel affiché en tête doit suivre le tarif réellement enregistré
      const bas = Math.min(...Object.values(listing.pricing).filter(v => Number.isFinite(v) && v > 0));
      if(Number.isFinite(bas)) listing.price = 'dès ' + bas + ' €';
    }
  }
} catch { /* réglage illisible : on garde l'annonce d'origine */ }
const DAYS = makeSchedule(listing);
const isOpen = listing.model === 'open';
const p = listing.pricing;
const dynamicPremium = () => listing.host.premium || (listing.id === 'micocouliers' && window.LTPPremium?.isHostPremium());
const dynamicBoost = () => listing.badges.includes('À la une') || (listing.id === 'micocouliers' && window.LTPPremium?.isBoosted());

const state = { step:'format', format:'slot', week:0, day:0, slot:null, persons:2, privatise:false, payment:'online', extras:{} };

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
const boltIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z"/></svg>';
const clockIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2" stroke-linecap="round"/></svg>';
const shieldIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5.5c0 4.3-2.9 8-7 9.5-4.1-1.5-7-5.2-7-9.5V6z"/><path d="m9 12 2 2 4-4"/></svg>';
const heartIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>';

const el = id => document.getElementById(id);

/* ===== Contenu de la fiche ===== */
document.title = listing.name + ' — Loue ta piscine';
el('ficheLoc').textContent = listing.location + ' · à ' + listing.distance;
el('ficheName').textContent = listing.name;
el('ficheDims').textContent = listing.dims + (listing.type === 'piscine'
  ? ' · ' + listing.capacity + ' baigneurs' + (listing.dayCap > listing.capacity ? ' (' + listing.dayCap + ' en journée)' : '')
  : '');
el('ficheRating').innerHTML = listing.rating + ' <small>· ' + listing.reviews + ' avis</small>';
el('ficheDesc').textContent = listing.description;

const chips = [];
if(isOpen){ chips.push(['open','Séances ouvertes']); chips.push(['neutral','Privatisable']); }
else chips.push(['open','Toujours privatisé']);
if(dynamicPremium()) chips.push(['premium','★ Hôte Premium · abonné']);
if(listing.facts[0].includes('°C')) chips.push(['neutral', (listing.type === 'sauna' ? '' : listing.type === 'jacuzzi' ? 'Chauffé · ' : 'Chauffée · ') + listing.facts[0]]);
if(listing.host.onsite) chips.push(['onsite','Paiement sur place · débloqué']);
el('ficheChips').innerHTML = chips.map(c => '<span class="chip chip-' + c[0] + '">' + c[1] + '</span>').join('');

const publicBadges = [...listing.badges];
if(dynamicBoost() && !publicBadges.includes('À la une')) publicBadges.unshift('À la une');
el('ficheBadges').innerHTML = publicBadges.map(b => '<span class="' + (b === 'À la une' ? 'premium' : '') + '">' + b + (b === 'À la une' ? '<small>sponsorisé</small>' : '') + '</span>').join('');

const mainImg = el('galleryMain');
let galleryIndex = 0;
let lightboxZoom = 1;
mainImg.src = listing.gallery[0];
mainImg.alt = listing.name + ' — photo 1';
el('galleryThumbs').innerHTML = listing.gallery.map((src, i) =>
  '<button type="button" role="tab" aria-selected="' + (i === 0) + '" data-photo="' + i + '"><img src="' + src + '" alt="' + listing.name + ' — miniature ' + (i + 1) + '" loading="lazy"></button>'
).join('');
el('galleryThumbs').addEventListener('click', ev => {
  const b = ev.target.closest('[data-photo]');
  if(!b) return;
  selectPhoto(+b.dataset.photo);
});

function selectPhoto(index){
  galleryIndex = (index + listing.gallery.length) % listing.gallery.length;
  mainImg.src = listing.gallery[galleryIndex];
  mainImg.alt = listing.name + ' — photo ' + (galleryIndex + 1);
  document.querySelectorAll('#galleryThumbs [role="tab"]').forEach((tab, i) => tab.setAttribute('aria-selected', String(i === galleryIndex)));
  if(!el('galleryLightbox').hidden){
    setLightboxZoom(1);
    el('lightboxImage').src = listing.gallery[galleryIndex];
    el('lightboxImage').alt = mainImg.alt;
    el('lightboxCaption').textContent = (galleryIndex + 1) + ' / ' + listing.gallery.length + ' · ' + listing.name;
  }
}

function setLightboxZoom(value){
  lightboxZoom = Math.max(1, Math.min(3, value));
  el('lightboxImage').style.transform = 'scale(' + lightboxZoom + ')';
  el('lightboxImage').classList.toggle('zoomed', lightboxZoom > 1);
  el('lightboxZoom').textContent = Math.round(lightboxZoom * 100) + ' %';
}

function openLightbox(){
  el('galleryLightbox').hidden = false;
  document.body.classList.add('lightbox-open');
  selectPhoto(galleryIndex);
  document.querySelector('[data-lightbox-close]').focus();
}

function closeLightbox(){
  el('galleryLightbox').hidden = true;
  document.body.classList.remove('lightbox-open');
}

document.querySelector('.gallery-main').addEventListener('click', openLightbox);
document.querySelector('.gallery-main').addEventListener('keydown', event => { if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openLightbox(); } });
document.querySelector('[data-lightbox-close]').addEventListener('click', closeLightbox);
document.querySelector('[data-lightbox-prev]').addEventListener('click', () => selectPhoto(galleryIndex - 1));
document.querySelector('[data-lightbox-next]').addEventListener('click', () => selectPhoto(galleryIndex + 1));
document.querySelector('[data-lightbox-zoom-out]').addEventListener('click', () => setLightboxZoom(lightboxZoom - .5));
document.querySelector('[data-lightbox-zoom-in]').addEventListener('click', () => setLightboxZoom(lightboxZoom + .5));
document.querySelector('.lightbox-stage').addEventListener('click', () => setLightboxZoom(lightboxZoom > 1 ? 1 : 2));
let lightboxTouchX = 0;
el('galleryLightbox').addEventListener('touchstart', event => { lightboxTouchX = event.changedTouches[0].clientX; }, {passive:true});
el('galleryLightbox').addEventListener('touchend', event => {
  if(lightboxZoom > 1) return;
  const distance = event.changedTouches[0].clientX - lightboxTouchX;
  if(Math.abs(distance) > 52) selectPhoto(galleryIndex + (distance < 0 ? 1 : -1));
}, {passive:true});
document.querySelector('[data-fiche-back]').addEventListener('click', () => {
  if(history.length > 1) history.back();
  else location.href = 'index.html#explorer';
});

el('ficheEquip').innerHTML = listing.equipment.map(e =>
  '<div class="equip-item"><svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[e[0]] || ICONS.deck) + '</svg>' + e[1] + '</div>'
).join('');

el('visiteSummary').textContent = 'Renseigné par ' + listing.host.name + ' · mis à jour le ' + listing.visit.date;
el('visiteBadge').textContent = listing.visit.points.length + ' infos utiles';
el('visitePoints').innerHTML = listing.visit.points.map(pt => '<li>' + pt + '</li>').join('');
el('ficheRules').innerHTML = listing.rules.map(r => '<li>' + r + '</li>').join('');

const reviewPagesData = [];
for(let index = 0; index < listing.reviewsList.length; index += 2) reviewPagesData.push(listing.reviewsList.slice(index,index + 2));
el('ficheAvis').innerHTML = reviewPagesData.map((page,pageIndex) =>
  '<div class="review-page" data-review-page-panel="' + pageIndex + '">' + page.map(r =>
    '<figure><div class="stars" aria-label="5 étoiles">' + star.repeat(5) + '</div><p>« ' + r.text + ' »</p><figcaption>' + r.author + '</figcaption></figure>'
  ).join('') + '</div>'
).join('');
const reviewTrack = el('ficheAvis');
const reviewCards = [...reviewTrack.querySelectorAll('.review-page')];
let currentReview = 0;
el('reviewPages').innerHTML = reviewCards.map((_, index) => '<button type="button" data-review-page="' + index + '" aria-label="Afficher la page d’avis ' + (index + 1) + '">' + (index + 1) + '</button>').join('');
function goToReview(index, smooth){
  currentReview = Math.max(0, Math.min(reviewCards.length - 1, index));
  reviewTrack.scrollTo({left:reviewCards[currentReview].offsetLeft - reviewTrack.offsetLeft, behavior:smooth ? 'smooth' : 'auto'});
  const first = currentReview * 2 + 1;
  const last = Math.min(first + 1, listing.reviewsList.length);
  el('reviewCount').textContent = first === last ? 'Avis ' + first + ' sur ' + listing.reviewsList.length : 'Avis ' + first + '–' + last + ' sur ' + listing.reviewsList.length;
  el('reviewPrev').disabled = currentReview === 0;
  el('reviewNext').disabled = currentReview === reviewCards.length - 1;
  el('reviewPages').querySelectorAll('button').forEach((button, i) => {
    button.classList.toggle('active', i === currentReview);
    button.setAttribute('aria-current', i === currentReview ? 'true' : 'false');
  });
}
el('reviewPrev').addEventListener('click', () => goToReview(currentReview - 1, true));
el('reviewNext').addEventListener('click', () => goToReview(currentReview + 1, true));
el('reviewPages').addEventListener('click', event => {
  const page = event.target.closest('[data-review-page]');
  if(page) goToReview(+page.dataset.reviewPage, true);
});
let reviewScrollTimer;
reviewTrack.addEventListener('scroll', () => {
  clearTimeout(reviewScrollTimer);
  reviewScrollTimer = setTimeout(() => {
    const nearest = reviewCards.reduce((best, card, index) => Math.abs(card.offsetLeft - reviewTrack.offsetLeft - reviewTrack.scrollLeft) < best.distance ? {index, distance:Math.abs(card.offsetLeft - reviewTrack.offsetLeft - reviewTrack.scrollLeft)} : best, {index:0, distance:Infinity});
    if(nearest.index !== currentReview) goToReview(nearest.index, false);
  }, 80);
}, {passive:true});
goToReview(0, false);

const h = listing.host;
el('ficheHost').innerHTML =
  '<div class="host-avatar" aria-hidden="true">' + h.name.slice(0, 2).toUpperCase() + '</div>' +
  '<div><b>' + h.name + '</b>' +
  '<p class="host-meta num">' + (h.premium ? 'Hôte Premium abonné · visibilité renforcée · ' : '') + 'note ' + listing.rating + (h.onsite ? ' · paiement sur place débloqué grâce à sa note' : '') + ' · répond en ' + h.response + '</p>' +
  '<p>Messagerie intégrée avant réservation — les coordonnées sont communiquées automatiquement après confirmation.</p>' +
  '<button class="host-write" type="button" data-message>Écrire à ' + h.name + ' →</button></div>';

/* ===== Réservation ===== */
const dayStrip = el('dayStrip'), slotList = el('slotList'), cfg = el('bookConfig');

el('bookPrice').innerHTML = '<b>' + listing.price + '</b> ' + listing.priceNote;
el('bookInstant').className = 'instant-line' + (listing.instant ? '' : ' on-request');
el('bookInstant').innerHTML = listing.instant
  ? boltIcon + 'Réservation immédiate — pas d’attente'
  : clockIcon + 'Sur demande — ' + h.name + ' répond sous 24 h';
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
  if(state.format === 'day') return canDay(dy) ? p.dayPrice + '\u00A0€' : 'réservé';
  if(state.format === 'half') return canHalf(dy) ? p.halfDay + '\u00A0€' : 'réservé';
  const prices = dy.slots.filter(s => !s.buffer && s.regime !== 'priv' && (s.regime === 'unit' || s.booked < s.cap)).map(s => s.regime === 'unit' ? s.price : s.priceP);
  return prices.length ? 'dès ' + Math.min.apply(Math, prices) + '\u00A0€' : 'complet';
}

function renderFormats(){
  const withHalf = isOpen && p.halfDay;
  const slotPick = isOpen
    ? '<button class="format-pick num" type="button" data-format="slot"><span>À la séance</span><b>' + listing.price + (withHalf ? '' : ' / personne') + '</b><small>2 h · ouverte ou privatisée</small></button>'
    : '<button class="format-pick num" type="button" data-format="slot"><span>Au créneau</span><b>' + listing.unitPrice + '\u00A0€ / ' + listing.unit + '</b><small>' + listing.unitNote + '</small></button>';
  const halfPick = withHalf
    ? '<button class="format-pick num" type="button" data-format="half"><span>Demi-journée</span><b>' + p.halfDay + '\u00A0€</b><small>' + HALF_HOURS + ' · privatisée</small></button>'
    : '';
  el('formatPicks').classList.toggle('three', !!withHalf);
  el('formatPicks').innerHTML = slotPick + halfPick +
    '<button class="format-pick num" type="button" data-format="day"><span>À la journée</span><b>' + p.dayPrice + '\u00A0€' + (withHalf ? '' : ' au total') + '</b><small>' + listing.dayHours + ' · jusqu’à ' + listing.dayCap + ' pers.</small></button>';
  el('formatPicks').querySelectorAll('.format-pick').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.format === state.format);
    btn.addEventListener('click', () => { state.format = btn.dataset.format; state.slot = null; state.privatise = state.format !== 'slot'; state.step = 'slot'; render(); });
  });
}

function syncJourney(){
  const order = ['format','slot','payment'];
  const current = order.indexOf(state.step);
  document.querySelectorAll('#journey .j-step').forEach((step, i) => {
    step.classList.toggle('active', i === current);
    step.classList.toggle('done', i < current);
    step.disabled = i > current || (step.dataset.bookStep === 'payment' && state.slot === null);
  });
  document.querySelectorAll('[data-book-stage]').forEach(stage => { stage.hidden = stage.dataset.bookStage !== state.step; });
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
    const floor = dayFloor(dy);
    const off = floor === 'réservé' || floor === 'complet';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'day num' + (state.day === i ? ' active' : '') + (off ? ' unavailable' : '');
    b.setAttribute('role','tab');
    b.setAttribute('aria-selected', state.day === i);
    // un jour indisponible pour le format choisi ne doit pas être cliquable : avant, il
    // s'ouvrait sur un panneau vide et le client croyait à un bug
    if(off){ b.disabled = true; b.setAttribute('aria-disabled','true'); }
    b.innerHTML = '<small>' + dy.lbl[0] + '</small><b>' + dy.lbl[1] + '</b><span>' + floor + '</span>';
    b.addEventListener('click', () => { state.day = i; state.slot = null; state.privatise = state.format !== 'slot'; render(); });
    dayStrip.appendChild(b);
  });
}

function slotButton(html, selected, disabled){
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'slot num' + (selected ? ' selected' : '');
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
      ? '<span class="s-time">' + listing.dayHours + '</span><span class="s-info">Jusqu’à ' + listing.dayCap + ' personnes — le lieu est à vous</span><span class="s-price">' + p.dayPrice + '\u00A0€<small> /jour</small></span><span class="s-tag tag-priv">Privatisé</span>'
      : '<span class="s-time">' + listing.dayHours + '</span><span class="s-info">Des réservations existent déjà ce jour-là</span><span class="s-tag tag-full">Indisponible</span>',
      state.slot === 'day', !ok);
    if(ok) btn.addEventListener('click', () => { state.slot = 'day'; state.privatise = true; state.step = 'payment'; if(state.persons < 2) state.persons = 2; render(); });
    slotList.appendChild(btn);
    addCustomRequest();
    return;
  }
  if(state.format === 'half'){
    const ok = canHalf(dy);
    const btn = slotButton(ok
      ? '<span class="s-time">' + HALF_HOURS + '</span><span class="s-info">Jusqu’à ' + listing.dayCap + ' personnes — l’après-midi est à vous</span><span class="s-price">' + p.halfDay + '\u00A0€</span><span class="s-tag tag-priv">Privatisé</span>'
      : '<span class="s-time">' + HALF_HOURS + '</span><span class="s-info">L’après-midi est déjà réservé, en partie ou en entier</span><span class="s-tag tag-full">Indisponible</span>',
      state.slot === 'half', !ok);
    if(ok) btn.addEventListener('click', () => { state.slot = 'half'; state.privatise = true; state.step = 'payment'; if(state.persons < 2) state.persons = 2; render(); });
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
      btn.addEventListener('click', () => { state.slot = i; state.privatise = true; state.step = 'payment'; if(state.persons > s.cap) state.persons = s.cap; render(); });
      slotList.appendChild(btn);
      return;
    }
    const left = s.cap - s.booked;
    const fill = Math.round(s.booked / s.cap * 100);
    const tag = s.night ? '<span class="s-tag tag-night">Jusqu’à 1 h</span>' : s.bleue ? '<span class="s-tag tag-bleue">Heure bleue</span>' : '<span class="s-tag tag-open">Ouverte</span>';
    if(left <= 0){
      slotList.appendChild(slotButton('<span class="s-time">' + s.t + '</span><span class="s-info"><i class="gauge"><b style="width:100%"></b></i>' + s.cap + ' baigneurs</span><span class="s-tag tag-full">Complet</span>', false, true));
    } else {
      const btn = slotButton('<span class="s-time">' + s.t + '</span><span class="s-info"><i class="gauge"><b style="width:' + fill + '%"></b></i>' + left + ' place' + (left > 1 ? 's' : '') + '</span><span class="s-price">' + euro(s.priceP) + '<small>/pers</small></span>' + tag, state.slot === i);
      btn.addEventListener('click', () => {
        state.slot = i; state.privatise = false; state.step = 'payment';
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
  b.addEventListener('click', () => { window.location.href = 'espace.html?view=messages'; });
  slotList.appendChild(b);
}

function paymentBlock(){
  if(!h.onsite) return '<p class="pay-note">Paiement en ligne sécurisé — ' + h.name + ' n’a pas activé le paiement sur place.</p>';
  return '<div class="payment-methods" role="radiogroup" aria-label="Mode de paiement">' +
    '<label class="pay-choice"><input type="radio" name="payment" value="online"' + (state.payment === 'online' ? ' checked' : '') + '><span>Payer en ligne<small>Paiement sécurisé et confirmation immédiate</small></span></label>' +
    '<label class="pay-choice"><input type="radio" name="payment" value="onsite"' + (state.payment === 'onsite' ? ' checked' : '') + '><span>Payer sur place<small>Débloqué : ' + h.name + ' est noté·e ' + listing.rating + ', au-dessus du seuil de 4,5</small></span></label>' +
  '</div>';
}

function renderConfig(){
  if(state.slot === null){
    cfg.innerHTML = '<p class="book-empty">Choisissez un créneau — le prix est tout compris, avant de payer.</p>' +
      '<button class="book-msg" type="button" data-message>Poser une question à ' + h.name + ' — messagerie intégrée</button>';
    el('mobilePrice').textContent = state.format === 'day' ? p.dayPrice + '\u00A0€ la journée' : listing.price + ' ' + listing.priceNote;
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
    '<div class="book-config num">' +
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
      '<p class="price-promise">' + shieldIcon + '<span><b>Ce prix est le prix payé.</b> Rien ne s’ajoute à l’étape suivante — ni frais de dossier, ni commission cachée.</span></p>' +
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
document.querySelectorAll('#journey [data-book-step]').forEach(button => button.addEventListener('click', () => {
  const target = button.dataset.bookStep;
  if(target === 'payment' && state.slot === null) return;
  state.step = target;
  syncJourney();
}));
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
document.addEventListener('keydown', ev => {
  if(ev.key === 'Escape'){ toggleBooking(false); closeLightbox(); }
  if(!el('galleryLightbox').hidden && ev.key === 'ArrowLeft') selectPhoto(galleryIndex - 1);
  if(!el('galleryLightbox').hidden && ev.key === 'ArrowRight') selectPhoto(galleryIndex + 1);
});

const liftHeader = () => document.body.classList.toggle('header-lift', window.scrollY > 12);
window.addEventListener('scroll', liftHeader, { passive:true });
liftHeader();

/* ===== Favori + divers ===== */
const favKey = 'ltp-v2-favorites';
const favBtn = el('ficheFavorite');
const favs = new Set(JSON.parse(localStorage.getItem(favKey) || '[]'));
function syncFav(){
  favBtn.classList.toggle('fav-active', favs.has(listing.id));
  favBtn.setAttribute('aria-pressed', favs.has(listing.id));
}
favBtn.addEventListener('click', () => {
  const ajout = !favs.has(listing.id);
  ajout ? favs.add(listing.id) : favs.delete(listing.id);
  localStorage.setItem(favKey, JSON.stringify([...favs]));
  syncFav();
  if(ajout) favBtn.classList.add('pop');
});
favBtn.addEventListener('animationend', () => favBtn.classList.remove('pop'));
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
    b.addEventListener('click', () => { window.location.href = 'espace.html?view=messages'; });
  });
}
bindMessage();
document.addEventListener('click', ev => {
  if(ev.target.closest('[data-host]')) window.location.href = 'hote.html';
});

(function ficheMotion(){
  if(!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  /* jamais .book-panel : son translateY de repli mobile serait écrasé par .is-visible{transform:none} */
  const items = document.querySelectorAll('.fiche-gallery,.fiche-content>*');
  if(!items.length) return;
  document.body.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {rootMargin:'100000px 0px 0px 0px', threshold:0});
  items.forEach(item => { item.classList.add('experience-reveal'); observer.observe(item); });
})();
})();
