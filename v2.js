(function(){
'use strict';
const { listings } = window.LTP;

const TODAY = new Date();
const state = {
  type:'all', moment:'', place:'Aix-en-Provence', date:'', dateLabel:'Ce week-end', guests:4,
  searchStep:'place', view:'grid', month:new Date(TODAY.getFullYear(), TODAY.getMonth(), 1),
  favorites:new Set(JSON.parse(localStorage.getItem('ltp-v2-favorites') || '[]'))
};

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
const typeSummary = document.getElementById('typeSummary');

const heartIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>';
const TYPE_ICONS = {
  all:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" stroke-linecap="round"/>',
  piscine:'<path d="M3 10c3-2.6 6-2.6 9 0s6 2.6 9 0M3 16c3-2.6 6-2.6 9 0s6 2.6 9 0" stroke-linecap="round"/>',
  jacuzzi:'<path d="M4 13h16v3.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" stroke-linejoin="round"/><path d="M8 9.5c1.2-1.5-1.2-2.5 0-4M12 9.5c1.2-1.5-1.2-2.5 0-4M16 9.5c1.2-1.5-1.2-2.5 0-4" stroke-linecap="round"/>',
  sauna:'<path d="M7 4c1.6 2-1.6 3.2 0 5.2M12 4c1.6 2-1.6 3.2 0 5.2M17 4c1.6 2-1.6 3.2 0 5.2" stroke-linecap="round"/><path d="M4 15c2.7-2.3 5.3-2.3 8 0s5.3 2.3 8 0M4 19.5c2.7-2.3 5.3-2.3 8 0s5.3 2.3 8 0" stroke-linecap="round"/>'
};
const pinIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const TYPE_LABELS = { all:'Tout', piscine:'Piscines', jacuzzi:'Jacuzzis', sauna:'Saunas' };

function fillIcons(root){
  (root || document).querySelectorAll('.tab-icon[data-icon]').forEach(span => {
    span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (TYPE_ICONS[span.dataset.icon] || '') + '</svg>';
  });
}
fillIcons();

function filteredListings(){
  return listings.filter(item => (state.type === 'all' || item.type === state.type) && (!state.moment || item.moments.includes(state.moment)));
}

function cardTemplate(item, index, featured){
  const favorite = state.favorites.has(item.id);
  const badges = item.badges.map((badge, i) => `<span class="${i === 0 && badge === 'À la une' ? 'premium' : ''}">${badge}</span>`).join('');
  return `<article class="listing-card ${featured ? 'featured' : ''}" style="animation-delay:${index * 45}ms" data-goto="${item.id}">
    <div class="listing-photo">
      <img src="${item.image}" alt="${item.name}" loading="lazy">
      <div class="listing-badges">${badges}</div>
      <button class="favorite ${favorite ? 'active' : ''}" type="button" data-favorite="${item.id}" aria-pressed="${favorite}" aria-label="Favori">${heartIcon}</button>
      <span class="availability">${item.availability}</span>
    </div>
    <div class="listing-info">
      <div class="listing-top"><h3>${item.name}</h3><span class="rating">${item.rating}</span></div>
      <p class="listing-location">${item.location} · ${item.distance}</p>
      <div class="listing-price"><p><b>${item.price}</b> ${item.priceNote}<small>${item.day} · jusqu’à ${item.capacity} pers.</small></p><a href="fiche.html?id=${item.id}" data-stop>Voir</a></div>
    </div>
  </article>`;
}

function renderListings(){
  const items = filteredListings();
  resultCount.textContent = `${items.length} ${items.length > 1 ? 'adresses' : 'adresse'}`;
  if(!items.length){
    grid.innerHTML = '<div class="listing-empty"><div><b>Aucune adresse</b><br><small>Essayez un autre filtre</small></div></div>';
    mapResults.innerHTML = '';
    return;
  }
  grid.innerHTML = items.map((item, index) => cardTemplate(item, index, index < 2)).join('');
  mapResults.innerHTML = items.map(item => `<button class="map-result" type="button" data-goto="${item.id}"><img src="${item.image}" alt=""><span><b>${item.name}</b><small>${item.location} · ★ ${item.rating}</small><strong>${item.price} ${item.priceNote}</strong></span></button>`).join('');
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
  typeSummary.textContent = TYPE_LABELS[type] || 'Tout';
  renderListings();
}

function selectMoment(moment){
  state.moment = state.moment === moment ? '' : moment;
  document.querySelectorAll('[data-moment]').forEach(button => button.classList.toggle('active', button.dataset.moment === state.moment));
  renderListings();
  document.getElementById('explorer').scrollIntoView({behavior:'smooth', block:'start'});
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
  const titles = {place:'Où', date:'Quand', guests:'Baigneurs', type:'Type'};
  const order = ['place','date','guests','type'];
  const current = order.indexOf(state.searchStep);
  searchTitle.textContent = titles[state.searchStep];
  const progress = document.getElementById('searchProgress');
  progress.setAttribute('aria-label', `Étape ${current + 1} sur 4`);
  [...progress.children].forEach((item, index) => item.classList.toggle('active', index <= current));
  if(state.searchStep === 'place') renderPlace();
  if(state.searchStep === 'date') renderCalendar();
  if(state.searchStep === 'guests') renderGuests();
  if(state.searchStep === 'type') renderTypes();
}

function updateSearchSummary(){
  document.getElementById('headerSearchSummary').textContent = `${state.place || 'Destination'} · ${state.dateLabel}`;
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
    return `<button class="suggestion" type="button" data-city="${city.nom}"><span>${pinIcon}</span><div><b>${city.nom}</b><small>${postal || (department ? `Département ${department}` : 'France')}</small></div></button>`;
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
  searchStage.innerHTML = `<div class="date-shortcuts"><button type="button" data-shortcut="today">Aujourd’hui</button><button type="button" data-shortcut="weekend">Ce week-end</button><button type="button" data-shortcut="flex">Flexible</button></div><div class="calendar-head"><b>${monthName}</b><div><button type="button" data-month="prev" aria-label="Mois précédent">‹</button><button type="button" data-month="next" aria-label="Mois suivant">›</button></div></div><div class="calendar-week"><span>Lu</span><span>Ma</span><span>Me</span><span>Je</span><span>Ve</span><span>Sa</span><span>Di</span></div><div class="calendar-grid">${cells.join('')}</div>`;
}

function monthOffset(){
  return (state.month.getFullYear() - TODAY.getFullYear()) * 12 + state.month.getMonth() - TODAY.getMonth();
}

function renderGuests(){
  searchStage.innerHTML = `<div class="guest-row"><div><b>Baigneurs</b><small>3 ans et plus</small></div><div class="stepper"><button type="button" data-guest="minus">−</button><span id="guestCount">${state.guests}</span><button type="button" data-guest="plus">+</button></div></div><div class="guest-row"><div><b>Bébés</b><small>Moins de 3 ans</small></div><div class="stepper"><button type="button">−</button><span>0</span><button type="button">+</button></div></div>`;
}

function renderTypes(){
  const options = [
    ['all','Tout','Piscines, jacuzzis, saunas'],
    ['piscine','Piscines','Séance ou privatisation'],
    ['jacuzzi','Jacuzzis','À l’heure ou à la journée'],
    ['sauna','Saunas','À l’heure ou à la journée']
  ];
  searchStage.innerHTML = `<div class="type-options">${options.map(option => `<button class="type-option ${state.type === option[0] ? 'active' : ''}" type="button" data-modal-type="${option[0]}"><span class="tab-icon" data-icon="${option[0]}"></span><div><b>${option[1]}</b><small>${option[2]}</small></div></button>`).join('')}</div>`;
  fillIcons(searchStage);
}

function openDetail(id){
  const item = listings.find(entry => entry.id === id);
  if(!item) return;
  detailContent.innerHTML = `<div class="detail-hero"><img src="${item.image}" alt="${item.name}"><div class="detail-title"><p>${item.location} · ★ ${item.rating} (${item.reviews})</p><h2 id="detailTitle">${item.name}</h2></div></div><div class="detail-body"><div><div class="detail-facts">${item.facts.map(fact => `<span>${fact}</span>`).join('')}</div><h3>Le lieu</h3><p>${item.description}</p></div><aside class="detail-booking"><span>Disponible</span><b>${item.price}</b><small>${item.priceNote}</small><small>${item.day} · jusqu’à ${item.capacity} pers.</small><a href="fiche.html?id=${item.id}">Voir les créneaux</a></aside></div>`;
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
  const city = event.target.closest('[data-city]');
  if(city){ state.place = city.dataset.city; document.getElementById('placeInput').value = state.place; placeSummary.textContent = state.place; updateSearchSummary(); return }
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
  if(guest){ state.guests = Math.max(1, Math.min(30, state.guests + (guest.dataset.guest === 'plus' ? 1 : -1))); document.getElementById('guestCount').textContent = state.guests; guestSummary.textContent = `${state.guests} ${state.guests > 1 ? 'personnes' : 'personne'}`; return }
  const modalType = event.target.closest('[data-modal-type]');
  if(modalType){ selectType(modalType.dataset.modalType); renderTypes(); return }
  const world = event.target.closest('[data-world]');
  if(world){ selectType(world.dataset.world); document.getElementById('explorer').scrollIntoView({behavior:'smooth'}); return }
  const scroll = event.target.closest('[data-scroll]');
  if(scroll){ document.getElementById(scroll.dataset.scroll)?.scrollIntoView({behavior:'smooth'}); return }
  if(event.target.closest('[data-host]')){ showToast('Le parcours hôte arrive dans la V2 — disponible dans la démo V1'); return }
});

document.getElementById('searchDock').addEventListener('submit', event => {
  event.preventDefault();
  renderListings();
  document.getElementById('listingTitle').textContent = state.place === 'Aix-en-Provence' ? 'Autour d’Aix' : `Autour de ${state.place}`;
  document.querySelector('.listings-section').scrollIntoView({behavior:'smooth'});
});

document.getElementById('applySearch').addEventListener('click', () => {
  const order = ['place','date','guests','type'];
  const current = order.indexOf(state.searchStep);
  if(current < order.length - 1){ state.searchStep = order[current + 1]; renderSearchStep(); }
  else { closeSearch(); document.getElementById('searchDock').requestSubmit(); }
});

document.getElementById('clearSearch').addEventListener('click', () => {
  if(state.searchStep === 'place'){ state.place = ''; placeSummary.textContent = 'Destination'; }
  if(state.searchStep === 'date'){ state.date = ''; state.dateLabel = 'Ce week-end'; dateSummary.textContent = state.dateLabel; }
  if(state.searchStep === 'guests'){ state.guests = 1; guestSummary.textContent = '1 personne'; }
  if(state.searchStep === 'type') selectType('all');
  renderSearchStep();
});

document.getElementById('favoritesButton').addEventListener('click', () => {
  const favorites = listings.filter(item => state.favorites.has(item.id));
  if(!favorites.length){ showToast('Aucun favori pour l’instant'); return }
  state.type = 'all'; state.moment = '';
  setView('grid');
  grid.innerHTML = favorites.map((item, index) => cardTemplate(item, index, true)).join('');
  resultCount.textContent = `${favorites.length} favori${favorites.length > 1 ? 's' : ''}`;
  document.querySelector('.listings-section').scrollIntoView({behavior:'smooth'});
});

document.getElementById('mobileFavorites').addEventListener('click', () => document.getElementById('favoritesButton').click());
document.addEventListener('keydown', event => { if(event.key === 'Escape'){ closeSearch(); closeDetail(); } });

function syncHeader(){ document.body.classList.toggle('header-compact', window.scrollY > 520); }
window.addEventListener('scroll', syncHeader, {passive:true});
syncHeader();
updateSearchSummary();

renderListings();
})();
