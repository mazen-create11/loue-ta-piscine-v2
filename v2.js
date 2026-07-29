(function(){
'use strict';
const { listings } = window.LTP;

const TODAY = new Date();
const state = {
  type:'all', moment:'', place:'Aix-en-Provence', date:'', dateLabel:'Ce week-end',
  adults:2, kids:2, babies:0, timeslot:'', occasion:'',
  searchStep:'place', view:'grid', month:new Date(TODAY.getFullYear(), TODAY.getMonth(), 1),
  favorites:new Set(JSON.parse(localStorage.getItem('ltp-v2-favorites') || '[]'))
};
const SEARCH_ORDER = ['place','date','guests','occasion'];

const grid = document.getElementById('listingGrid');
const mapView = document.getElementById('mapView');
const mapResults = document.getElementById('mapResults');
const searchLayer = document.getElementById('searchLayer');
const searchStage = document.getElementById('searchStage');
const searchTitle = document.getElementById('searchPanelTitle');
const detailLayer = document.getElementById('detailLayer');
const detailContent = document.getElementById('detailContent');
const resultCount = document.getElementById('resultCount');
const placeSummary = document.getElementById('placeSummary');
const dateSummary = document.getElementById('dateSummary');
const guestSummary = document.getElementById('guestSummary');
const mobileSearchHint = document.getElementById('mobileSearchHint');

const heartIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>';
const TYPE_ICONS = {
  all:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" stroke-linecap="round"/>',
  piscine:'<path d="M3 10c3-2.6 6-2.6 9 0s6 2.6 9 0M3 16c3-2.6 6-2.6 9 0s6 2.6 9 0" stroke-linecap="round"/>',
  jacuzzi:'<path d="M4 13h16v3.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" stroke-linejoin="round"/><path d="M8 9.5c1.2-1.5-1.2-2.5 0-4M12 9.5c1.2-1.5-1.2-2.5 0-4M16 9.5c1.2-1.5-1.2-2.5 0-4" stroke-linecap="round"/>',
  sauna:'<path d="M7 4c1.6 2-1.6 3.2 0 5.2M12 4c1.6 2-1.6 3.2 0 5.2M17 4c1.6 2-1.6 3.2 0 5.2" stroke-linecap="round"/><path d="M4 15c2.7-2.3 5.3-2.3 8 0s5.3 2.3 8 0M4 19.5c2.7-2.3 5.3-2.3 8 0s5.3 2.3 8 0" stroke-linecap="round"/>'
};
const pinIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const boltIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z"/></svg>';
const clockIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2" stroke-linecap="round"/></svg>';
const TYPE_LABELS = { all:'Tout', piscine:'Piscines', jacuzzi:'Jacuzzis', sauna:'Saunas' };

function fillIcons(root){
  (root || document).querySelectorAll('.tab-icon[data-icon]').forEach(span => {
    span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (TYPE_ICONS[span.dataset.icon] || '') + '</svg>';
  });
}
fillIcons();

/* Départements réellement desservis. Sans ce garde-fou, une recherche « Lille » affichait
   six piscines provençales sous le titre « Autour de Lille ». */
const DEPARTEMENTS_DESSERVIS = ['13','83','84','04','05','06','30'];

function zoneCouverte(){
  if(!state.place) return true;
  if(listings.some(item => item.location.toLowerCase() === state.place.toLowerCase())) return true;
  if(!state.postal) return true; // commune saisie à la main : on ne bloque pas sur une supposition
  return DEPARTEMENTS_DESSERVIS.includes(String(state.postal).slice(0, 2));
}

function filteredListings(){
  if(!zoneCouverte()) return [];
  const capacite = guestTotal();
  return listings
    .filter(item => (state.type === 'all' || item.type === state.type))
    .filter(item => (!state.moment || item.moments.includes(state.moment)))
    .filter(item => !capacite || (item.dayCap || item.capacity || 0) >= capacite)
    .sort((a, b) => Number(isFeaturedPaid(b)) - Number(isFeaturedPaid(a)));
}

function isHostPaid(item){ return item.host.premium || (item.id === 'micocouliers' && window.LTPPremium?.isHostPremium()); }
function isFeaturedPaid(item){ return item.badges.includes('À la une') || (item.id === 'micocouliers' && window.LTPPremium?.isBoosted()); }
function visibleBadges(item){
  const badges = [...item.badges];
  if(isFeaturedPaid(item) && !badges.includes('À la une')) badges.unshift('À la une');
  if(isHostPaid(item) && !badges.includes('Hôte Premium')) badges.push('Hôte Premium');
  return badges;
}

function cardTemplate(item, index, featured){
  const favorite = state.favorites.has(item.id);
  const badges = visibleBadges(item).map(badge => `<span class="${badge === 'À la une' ? 'premium' : badge === 'Hôte Premium' ? 'host-paid' : ''}">${badge}${badge === 'À la une' ? '<small>sponsorisé</small>' : ''}</span>`).join('');
  return `<article class="listing-card ${featured ? 'featured' : ''}" style="animation-delay:${index * 45}ms" data-goto="${item.id}">
    <div class="listing-photo">
      <img src="${item.image}" alt="${item.name}" loading="lazy">
      <div class="listing-badges">${badges}</div>
      <button class="favorite ${favorite ? 'active' : ''}" type="button" data-favorite="${item.id}" aria-pressed="${favorite}" aria-label="Favori">${heartIcon}</button>
      <span class="availability">${item.availability}</span>
    </div>
    <div class="listing-info num">
      <div class="listing-top"><h3>${item.name}</h3><span class="rating">${item.rating}</span></div>
      <p class="listing-location">${item.location} · ${item.distance}</p>
      <p class="listing-instant${item.instant ? '' : ' on-request'}">${item.instant ? boltIcon + 'Réservation immédiate' : clockIcon + 'Sur demande — réponse sous 24 h'}</p>
      <div class="listing-price"><p><b>${item.price}</b> ${item.priceNote}<small>${item.day} · jusqu’à ${item.capacity} pers.</small></p><a href="fiche.html?id=${item.id}" data-stop>Voir</a></div>
    </div>
  </article>`;
}

window.addEventListener('ltp:premium-change', renderListings);

function renderListings(){
  const items = filteredListings();
  resultCount.textContent = `${items.length} ${items.length > 1 ? 'adresses' : 'adresse'}`;
  // le titre suit toujours la recherche en cours, quel que soit ce qui a déclenché le rendu
  const titre = document.getElementById('listingTitle');
  if(titre) titre.textContent = !state.place
    ? 'Toutes nos adresses'
    : (state.place === 'Aix-en-Provence' ? 'Autour d’Aix' : `Autour de ${state.place}`);
  if(!items.length){
    // dire honnêtement pourquoi c'est vide plutôt que « essayez un autre filtre »
    const horsZone = !zoneCouverte();
    const titre = horsZone ? `Nous ne couvrons pas encore ${state.place}` : 'Aucune adresse pour ces critères';
    const detail = horsZone
      ? 'Nos six adresses sont en Provence. Ouvrez la carte pour les voir toutes.'
      : `Aucune piscine n’accueille ${guestTotal()} baigneurs sur ce filtre. Réduisez le groupe ou changez de moment.`;
    grid.innerHTML = `<div class="listing-empty"><div><b>${titre}</b><br><small>${detail}</small><br><button class="listing-empty-reset" type="button" data-reset-search>Voir toutes les adresses</button></div></div>`;
    mapResults.innerHTML = '';
    return;
  }
  grid.innerHTML = items.map((item, index) => cardTemplate(item, index, index < 2)).join('');
  mapResults.innerHTML = items.map(item => `<button class="map-result num" type="button" data-goto="${item.id}"><img src="${item.image}" alt=""><span><b>${item.name}</b><small>${item.location} · ★ ${item.rating}</small><strong>${item.price} ${item.priceNote}</strong></span></button>`).join('');
  updateFavoriteCount();
}

function updateFavoriteCount(){
  document.getElementById('favoriteCount').textContent = state.favorites.size;
}

function toggleFavorite(id){
  if(state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
  localStorage.setItem('ltp-v2-favorites', JSON.stringify([...state.favorites]));
  renderListings();
}

function selectType(type){
  state.type = type;
  document.querySelectorAll('[data-type]').forEach(button => button.classList.toggle('active', button.dataset.type === type));
  renderListings();
}

function selectMoment(moment, silent){
  state.moment = silent ? moment : (state.moment === moment ? '' : moment);
  document.querySelectorAll('[data-moment]').forEach(button => button.classList.toggle('active', button.dataset.moment === state.moment));
  renderListings();
  if(!silent) document.getElementById('explorer').scrollIntoView({behavior:'smooth', block:'start'});
}

function setView(view){
  state.view = view;
  grid.hidden = view !== 'grid';
  mapView.hidden = view !== 'map';
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
}

function lockPage(locked){
  document.body.style.overflow = locked ? 'hidden' : '';
}

function openSearch(step){
  state.searchStep = step;
  searchLayer.hidden = false;
  lockPage(true);
  renderSearchStep();
}

function closeSearch(){
  searchLayer.hidden = true;
  lockPage(false);
}

function renderSearchStep(){
  const titles = {place:'Où', date:'Quand', guests:'Qui vient ?', occasion:'L’occasion'};
  const current = SEARCH_ORDER.indexOf(state.searchStep);
  searchTitle.textContent = titles[state.searchStep];
  const progress = document.getElementById('searchProgress');
  progress.setAttribute('aria-label', `Étape ${current + 1} sur 4`);
  [...progress.children].forEach((item, index) => item.classList.toggle('active', index <= current));
  if(state.searchStep === 'place') renderPlace();
  if(state.searchStep === 'date') renderCalendar();
  if(state.searchStep === 'guests') renderGuests();
  if(state.searchStep === 'occasion') renderOccasion();
}

function updateSearchSummary(){
  document.getElementById('headerSearchSummary').textContent = `${state.place || 'Destination'} · ${state.dateLabel}`;
  mobileSearchHint.textContent = `${state.dateLabel} · ${guestLabel()}`;
}

function renderPlace(){
  searchStage.innerHTML = `<label class="place-input">${pinIcon}<input id="placeInput" autocomplete="off" value="${state.place}" placeholder="Ville, village ou code postal"></label><div class="suggestions" id="placeSuggestions"></div>`;
  const input = document.getElementById('placeInput');
  input.focus();
  renderSuggestions([{nom:'Aix-en-Provence',codeDepartement:'13'},{nom:'Marseille',codeDepartement:'13'},{nom:'Avignon',codeDepartement:'84'}]);
  let controller;
  input.addEventListener('input', async event => {
    const query = event.target.value.trim();
    if(query.length < 2){ renderSuggestions([]); return }
    if(controller) controller.abort();
    controller = new AbortController();
    try{
      const searchParam = /^\d{2,5}$/.test(query) ? `codePostal=${encodeURIComponent(query)}` : `nom=${encodeURIComponent(query)}`;
      const response = await fetch(`https://geo.api.gouv.fr/communes?${searchParam}&fields=nom,code,codesPostaux,departement&boost=population&limit=6`, {signal:controller.signal});
      if(!response.ok) throw new Error('api');
      renderSuggestions(await response.json());
    }catch(error){
      if(error.name !== 'AbortError') renderSuggestions([{nom:query, codeDepartement:''}]);
    }
  });
}

function renderSuggestions(cities){
  const target = document.getElementById('placeSuggestions');
  if(!target) return;
  target.innerHTML = cities.map(city => {
    const department = city.departement?.code || city.codeDepartement || '';
    const postal = city.codesPostaux?.[0] || '';
    return `<button class="suggestion" type="button" data-city="${city.nom}" data-postal="${postal}"><span>${pinIcon}</span><div><b>${city.nom}</b><small>${postal || (department ? `Département ${department}` : 'France')}</small></div></button>`;
  }).join('');
}

function renderCalendar(){
  const year = state.month.getFullYear();
  const month = state.month.getMonth();
  const monthName = new Intl.DateTimeFormat('fr-FR', {month:'long', year:'numeric'}).format(state.month);
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const minDate = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const cells = Array(firstDay).fill('<button type="button" disabled></button>');
  for(let day = 1; day <= days; day++){
    const date = new Date(year, month, day);
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const disabled = date < minDate;
    cells.push(`<button type="button" data-date="${iso}" ${disabled ? 'disabled' : ''} class="${state.date === iso ? 'selected' : ''}">${day}</button>`);
  }
  const slots = [
    ['', 'Peu importe'], ['matin', 'Le matin'], ['apres-midi', 'L’après-midi'], ['soir', 'En soirée']
  ];
  searchStage.innerHTML = `<div class="date-shortcuts"><button type="button" data-shortcut="today">Aujourd’hui</button><button type="button" data-shortcut="weekend">Ce week-end</button><button type="button" data-shortcut="flex">Flexible</button></div><div class="calendar-head"><b>${monthName}</b><div><button type="button" data-month="prev" aria-label="Mois précédent">‹</button><button type="button" data-month="next" aria-label="Mois suivant">›</button></div></div><div class="calendar-week"><span>Lu</span><span>Ma</span><span>Me</span><span>Je</span><span>Ve</span><span>Sa</span><span>Di</span></div><div class="calendar-grid num">${cells.join('')}</div>
    <div class="time-pref"><span class="time-pref-label">Vers quelle heure ?</span><div class="time-chips">${slots.map(([key, label]) => `<button type="button" data-timeslot="${key}" class="${state.timeslot === key ? 'active' : ''}">${label}</button>`).join('')}</div><small>On vous montre aussi les créneaux à deux heures près.</small></div>`;
}

function monthOffset(){
  return (state.month.getFullYear() - TODAY.getFullYear()) * 12 + state.month.getMonth() - TODAY.getMonth();
}

/* Baigneurs segmentés — seuls adultes et enfants comptent dans la jauge, les bébés sont gratuits. */
const GUEST_GROUPS = [
  { key:'adults', label:'Adultes', hint:'13 ans et plus', min:1 },
  { key:'kids', label:'Enfants', hint:'3 à 12 ans', min:0 },
  { key:'babies', label:'Bébés', hint:'moins de 3 ans — gratuits, hors jauge', min:0 }
];

function guestTotal(){ return state.adults + state.kids; }

function guestLabel(){
  const total = guestTotal();
  let text = `${total} baigneur${total > 1 ? 's' : ''}`;
  if(state.babies) text += ` + ${state.babies} bébé${state.babies > 1 ? 's' : ''}`;
  return text;
}

function renderGuests(){
  searchStage.innerHTML = GUEST_GROUPS.map(group => `<div class="guest-row">
      <div><b>${group.label}</b><small>${group.hint}</small></div>
      <div class="stepper num">
        <button type="button" data-guest="minus" data-group="${group.key}" aria-label="Moins de ${group.label.toLowerCase()}"${state[group.key] <= group.min ? ' disabled' : ''}>−</button>
        <span id="count-${group.key}">${state[group.key]}</span>
        <button type="button" data-guest="plus" data-group="${group.key}" aria-label="Plus de ${group.label.toLowerCase()}"${guestTotal() >= 30 && group.key !== 'babies' ? ' disabled' : ''}>+</button>
      </div>
    </div>`).join('') +
    `<p class="guest-note">Les bébés de moins de 3 ans ne comptent pas dans la jauge de la piscine.</p>`;
}

const OCCASIONS = [
  { key:'', label:'Juste se baigner', hint:'en famille ou à deux', moment:'' },
  { key:'anniversaire', label:'Un anniversaire', hint:'plutôt une privatisation', moment:'anniversaire' },
  { key:'entre-amis', label:'Entre amis', hint:'apéro au bord de l’eau', moment:'soir' },
  { key:'nage', label:'Nager pour de vrai', hint:'longueurs, au calme', moment:'nage' }
];

function renderOccasion(){
  searchStage.innerHTML = `<div class="occasion-options">${OCCASIONS.map(option => `
    <button class="occasion-option ${state.occasion === option.key ? 'active' : ''}" type="button" data-occasion="${option.key}">
      <b>${option.label}</b><small>${option.hint}</small>
    </button>`).join('')}</div>
    <p class="guest-note">On met en avant les créneaux qui correspondent — vous gardez la main sur le reste.</p>`;
}

function openDetail(id){
  const item = listings.find(entry => entry.id === id);
  if(!item) return;
  detailContent.innerHTML = `<div class="detail-hero"><img src="${item.image}" alt="${item.name}"><div class="detail-title"><p class="num">${item.location} · ★ ${item.rating} (${item.reviews})</p><h2 id="detailTitle">${item.name}</h2></div></div><div class="detail-body"><div><div class="detail-facts num">${item.facts.map(fact => `<span>${fact}</span>`).join('')}</div><h3>Le lieu</h3><p>${item.description}</p></div><aside class="detail-booking num"><span>Disponible</span><b>${item.price}</b><small>${item.priceNote}</small><small>${item.day} · jusqu’à ${item.capacity} pers.</small><a href="fiche.html?id=${item.id}">Voir les créneaux</a></aside></div>`;
  detailLayer.hidden = false;
  lockPage(true);
}

function closeDetail(){
  detailLayer.hidden = true;
  lockPage(false);
}

function showToast(message){
  const toast = document.getElementById('hostToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

document.addEventListener('click', event => {
  const favorite = event.target.closest('[data-favorite]');
  if(favorite){ event.stopPropagation(); toggleFavorite(favorite.dataset.favorite); return }
  if(event.target.closest('[data-stop]')) return;
  const goto = event.target.closest('[data-goto]');
  if(goto){ location.href = 'fiche.html?id=' + goto.dataset.goto; return }
  const pin = event.target.closest('[data-listing]');
  if(pin){ openDetail(pin.dataset.listing); return }
  const detail = event.target.closest('[data-detail]');
  if(detail){ location.href = 'fiche.html?id=' + detail.dataset.detail; return }
  const type = event.target.closest('[data-type]');
  if(type){ selectType(type.dataset.type); return }
  const moment = event.target.closest('[data-moment],[data-apply-moment]');
  if(moment){ selectMoment(moment.dataset.moment || moment.dataset.applyMoment); return }
  const view = event.target.closest('[data-view]');
  if(view){ setView(view.dataset.view); return }
  const step = event.target.closest('[data-search-step]');
  if(step){ openSearch(step.dataset.searchStep); return }
  if(event.target.closest('[data-close-search]')){ closeSearch(); return }
  if(event.target.closest('[data-close-detail]')){ closeDetail(); return }
  if(event.target.closest('[data-reset-search]')){
    state.place = ''; state.postal = ''; state.moment = ''; state.type = 'all';
    document.querySelectorAll('[data-moment]').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('[data-type]').forEach(button => button.classList.toggle('active', button.dataset.type === 'all'));
    if(placeSummary) placeSummary.textContent = 'Destination';
    updateSearchSummary();
    renderListings();
    return;
  }
  const city = event.target.closest('[data-city]');
  if(city){ state.place = city.dataset.city; state.postal = city.dataset.postal || ''; document.getElementById('placeInput').value = state.place; placeSummary.textContent = state.place; updateSearchSummary(); renderListings(); return }
  const month = event.target.closest('[data-month]');
  if(month){
    const next = month.dataset.month === 'next' ? 1 : -1;
    const offset = monthOffset() + next;
    if(offset >= 0 && offset <= 11){ state.month.setMonth(state.month.getMonth() + next); renderCalendar(); }
    return;
  }
  const date = event.target.closest('[data-date]');
  if(date){ state.date = date.dataset.date; state.dateLabel = new Intl.DateTimeFormat('fr-FR', {weekday:'short', day:'numeric', month:'short'}).format(new Date(`${state.date}T12:00:00`)); dateSummary.textContent = state.dateLabel; updateSearchSummary(); renderCalendar(); return }
  const shortcut = event.target.closest('[data-shortcut]');
  if(shortcut){ state.dateLabel = shortcut.dataset.shortcut === 'today' ? 'Aujourd’hui' : shortcut.dataset.shortcut === 'weekend' ? 'Ce week-end' : 'Dates flexibles'; dateSummary.textContent = state.dateLabel; updateSearchSummary(); return }
  const guest = event.target.closest('[data-guest]');
  if(guest){
    const group = GUEST_GROUPS.find(g => g.key === guest.dataset.group);
    const step = guest.dataset.guest === 'plus' ? 1 : -1;
    if(step > 0 && group.key !== 'babies' && guestTotal() >= 30) return;
    state[group.key] = Math.max(group.min, Math.min(30, state[group.key] + step));
    renderGuests();
    guestSummary.textContent = guestLabel();
    updateSearchSummary();
    return;
  }
  const occasion = event.target.closest('[data-occasion]');
  if(occasion){
    state.occasion = occasion.dataset.occasion;
    const picked = OCCASIONS.find(o => o.key === state.occasion);
    selectMoment(picked.moment || state.moment, true);
    document.getElementById('occasionSummary').textContent = picked.label;
    renderOccasion();
    return;
  }
  const timeslot = event.target.closest('[data-timeslot]');
  if(timeslot){
    state.timeslot = timeslot.dataset.timeslot;
    renderCalendar();
    return;
  }
  const world = event.target.closest('[data-world]');
  if(world){ selectType(world.dataset.world); document.getElementById('explorer').scrollIntoView({behavior:'smooth'}); return }
  const scroll = event.target.closest('[data-scroll]');
  if(scroll){ document.getElementById(scroll.dataset.scroll)?.scrollIntoView({behavior:'smooth'}); return }
  if(event.target.closest('[data-host]')){ location.href = 'hote.html'; return }
});

document.getElementById('searchDock').addEventListener('submit', event => {
  event.preventDefault();
  renderListings();
  document.querySelector('.listings-section').scrollIntoView({behavior:'smooth'});
});

document.getElementById('applySearch').addEventListener('click', () => {
  const current = SEARCH_ORDER.indexOf(state.searchStep);
  if(current < SEARCH_ORDER.length - 1){ state.searchStep = SEARCH_ORDER[current + 1]; renderSearchStep(); }
  else { closeSearch(); document.getElementById('searchDock').requestSubmit(); }
});

document.getElementById('clearSearch').addEventListener('click', () => {
  if(state.searchStep === 'place'){ state.place = ''; placeSummary.textContent = 'Destination'; }
  if(state.searchStep === 'date'){ state.date = ''; state.dateLabel = 'Ce week-end'; state.timeslot = ''; dateSummary.textContent = state.dateLabel; }
  if(state.searchStep === 'guests'){ state.adults = 1; state.kids = 0; state.babies = 0; guestSummary.textContent = guestLabel(); updateSearchSummary(); }
  if(state.searchStep === 'occasion'){ state.occasion = ''; selectMoment('', true); document.getElementById('occasionSummary').textContent = 'Peu importe'; }
  renderSearchStep();
});

document.addEventListener('keydown', event => { if(event.key === 'Escape'){ closeSearch(); closeDetail(); } });

/* ===== Simulateur hôte — tarifs réels de la plateforme, commission 15 % à la source ===== */
(function simulator(){
  const openRange = document.getElementById('simOpen');
  if(!openRange) return;
  const privRange = document.getElementById('simPriv');
  const priceRange = document.getElementById('simPrice');
  const seatsRange = document.getElementById('simSeats');
  const bleue = document.getElementById('simBleue');
  const WEEKS = 4.33, PRIV_PRICE = 68, COMMISSION = .15;

  const money = n => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' €';

  function paint(input){
    const ratio = (input.value - input.min) / (input.max - input.min) * 100;
    input.style.setProperty('--fill', ratio + '%');
  }

  function compute(){
    const open = +openRange.value, priv = +privRange.value;
    const price = +priceRange.value, seats = +seatsRange.value;
    const openGross = open * WEEKS * seats * price;
    const privGross = priv * PRIV_PRICE;
    const eveningPrice = Math.max(15, price + 7.5);
    const bleueGross = bleue.checked ? WEEKS * seats * eveningPrice : 0;
    const gross = openGross + privGross + bleueGross;
    const net = gross * (1 - COMMISSION);

    document.getElementById('simOpenVal').textContent = open;
    document.getElementById('simPrivVal').textContent = priv;
    document.getElementById('simPriceVal').textContent = price.toLocaleString('fr-FR', {minimumFractionDigits:price % 1 ? 2 : 0}) + ' €';
    document.getElementById('simSeatsVal').textContent = seats;
    document.getElementById('simTotal').textContent = money(net);

    const rows = [
      [open ? open + ' séances ouvertes/semaine' : 'Séances ouvertes', openGross],
      [priv ? priv + ' privatisations/mois' : 'Privatisations', privGross]
    ];
    if(bleue.checked) rows.push(['Créneau de nuit 22 h – 1 h, 1 fois/semaine', bleueGross]);
    rows.push(['Commission plateforme — 15 %', -(gross * COMMISSION)]);
    rows.push(['Net sur votre compte', net]);
    document.getElementById('simBreakdown').innerHTML = rows
      .map(([label, value]) => `<div><span>${label}</span><span>${value < 0 ? '−' + money(Math.abs(value)) : money(value)}</span></div>`)
      .join('');
    const tip = open < 3
      ? 'Deux créneaux supplémentaires par semaine peuvent améliorer la visibilité sans bloquer votre calendrier.'
      : seats < 5
        ? 'Votre capacité reste volontairement intime : c’est un bon argument pour les familles avec de jeunes enfants.'
        : 'Votre équilibre prix, capacité et disponibilités est cohérent pour une annonce familiale.';
    document.getElementById('simMiaTip').textContent = tip;
    // la pastille de l'option soirée était figée en dur et contredisait le détail juste en dessous
    const gainBadge = document.getElementById('simBleueGain');
    if(gainBadge){
      // même base que la ligne du détail (brut) : la commission a déjà sa propre ligne en dessous
      gainBadge.textContent = bleue.checked ? '+' + money(bleueGross) : '';
      gainBadge.hidden = !bleue.checked;
    }
    [openRange, privRange, priceRange, seatsRange].forEach(paint);
  }

  [openRange, privRange, priceRange, seatsRange].forEach(input => input.addEventListener('input', compute));
  bleue.addEventListener('change', compute);
  compute();
})();

/* ===== Maz — concierge contextuel du prototype ===== */
(function miaAssistant(){
  const panel = document.getElementById('miaPanel');
  if(!panel) return;
  const thread = document.getElementById('miaThread');
  const input = document.getElementById('miaInput');
  const launchers = document.querySelectorAll('[data-open-mia]');
  const reply = (text, action) => {
    const bubble = document.createElement('p');
    bubble.className = 'maz-reply';
    bubble.textContent = text;
    if(action){
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'maz-reply-action';
      button.textContent = action.label;
      button.addEventListener('click', action.run);
      bubble.appendChild(button);
    }
    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
  };
  const answerFor = value => {
    const query = value.toLocaleLowerCase('fr');
    if(/bonjour|salut|hello|aide|aider/.test(query)) return ['Bien sûr. Dites-moi simplement qui vient, quand, et l’ambiance souhaitée. Je vous guide sans choisir à votre place.'];
    if(/aujourd|maintenant|ce soir|disponib|créneau|creneau/.test(query)) return ['Quatre créneaux sont encore visibles aujourd’hui autour d’Aix, dès 6 €. Je peux ouvrir la recherche directement sur les disponibilités.', {label:'Voir les créneaux', run:() => { close(); document.querySelector('.availability-rail')?.scrollIntoView({behavior:'smooth', block:'center'}); }}];
    if(/famille|enfant|bébé|bebe|petit/.test(query)) return ['Pour une famille, je regarde d’abord la profondeur, l’ombre, les règles enfants et les avis. Vous pourrez ensuite ajuster la date et le nombre de baigneurs.', {label:'Lancer la recherche famille', run:() => { close(); openSearch('place'); }}];
    if(/prix|cher|budget|euro|€/.test(query)) return ['Les séances ouvertes commencent à 6 € par personne. Le prix affiché inclut déjà les frais de service : aucun supplément n’est ajouté à la dernière étape.', {label:'Voir les petits prix', run:() => { close(); document.querySelector('[data-detail="verger"]')?.scrollIntoView({behavior:'smooth', block:'center'}); }}];
    if(/favori|compare|compar/.test(query)) return ['Je peux comparer deux favoris sur le prix total, la durée, la distance, l’accueil des enfants et les équipements. Le choix final reste le vôtre.', {label:'Comparer mes favoris', run:() => { location.href='espace.html?view=favoris'; }}];
    if(/louer|hôte|hote|annonce|piscine à moi|ma piscine/.test(query)) return ['Je peux préparer votre description, améliorer vos photos et proposer des réglages. Rien n’est publié ni envoyé à un voyageur sans votre validation.', {label:'Ouvrir l’espace hôte', run:() => { location.href='hote.html?view=listing'; }}];
    if(/annul|rembours|problème|litige/.test(query)) return ['Si l’hôte annule, la réservation est remboursée. En cas de problème, le versement est suspendu pendant l’examen de la situation.'];
    return ['Je veux vous répondre précisément. Cherchez-vous une baignade, souhaitez-vous comparer deux lieux, ou voulez-vous publier votre espace ?'];
  };
  const open = () => {
    panel.hidden = false;
    launchers.forEach(button => button.setAttribute('aria-expanded', 'true'));
    setTimeout(() => input.focus(), 80);
  };
  const close = () => {
    panel.hidden = true;
    launchers.forEach(button => button.setAttribute('aria-expanded', 'false'));
  };
  launchers.forEach(button => button.addEventListener('click', open));
  document.querySelector('[data-close-mia]').addEventListener('click', close);
  document.querySelector('[data-mia-action="family"]').addEventListener('click', () => {
    reply('Pour une famille, je privilégie l’ombre, la profondeur renseignée, les règles enfants et les avis.', {label:'Lancer la recherche famille', run:() => { close(); openSearch('place'); }});
  });
  document.getElementById('miaForm').addEventListener('submit', event => {
    event.preventDefault();
    const value = input.value.trim();
    if(!value){ input.focus(); return; }
    const bubble = document.createElement('p');
    bubble.className = 'user';
    bubble.textContent = value;
    thread.appendChild(bubble);
    input.value = '';
    const [text, action] = answerFor(value);
    window.setTimeout(() => reply(text, action), 180);
  });
  document.addEventListener('keydown', event => { if(event.key === 'Escape' && !panel.hidden) close(); });
})();

function syncHeader(){ document.body.classList.toggle('header-compact', window.scrollY > 520); }
window.addEventListener('scroll', syncHeader, {passive:true});
syncHeader();
updateSearchSummary();

renderListings();

const startupSearch = new URLSearchParams(location.search).get('search');
if(SEARCH_ORDER.includes(startupSearch)){
  history.replaceState(null, '', location.pathname);
  requestAnimationFrame(() => openSearch(startupSearch));
}

(function experienceDetails(){
  const details = [...document.querySelectorAll('.faq details')];
  details.forEach(item => item.addEventListener('toggle', () => {
    if(!item.open) return;
    details.forEach(other => { if(other !== item) other.open = false; });
  }));
})();

(function experienceMotion(){
  if(!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const items = document.querySelectorAll('.moments-head,.moment-card,.world-intro,.world-card,.proof-intro,.proof-card,.faq-head,.faq details,.host-copy,.simulator');
  if(!items.length) return;
  document.body.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {rootMargin:'0px 0px -7% 0px', threshold:.08});
  items.forEach(item => { item.classList.add('experience-reveal'); observer.observe(item); });
})();
})();
