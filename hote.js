(function(){
'use strict';

const toast = document.getElementById('hostAppToast');
const notificationButton = document.getElementById('hostNotifications');
const notificationPanel = document.getElementById('hostNotificationPanel');
const allowedViews = ['dashboard','listing','calendar','reservations','bookings','messages','account'];
const hostConversations = {
  martin:{name:'Famille Martin', initials:'FM', meta:'Réservation aujourd’hui · 16:00', booking:'Privatisation · 16:00 – 18:00', detail:'4 voyageurs · confirmée', placeholder:'Écrire à la famille Martin…', messages:[['incoming','Bonjour Claire, le portillon sera-t-il déjà ouvert à notre arrivée ?','11:38'],['outgoing','Bonjour, oui, il sera ouvert à partir de 15 h 50. Vous pourrez entrer par le côté jardin.','11:42 · Lu']]},
  sarah:{name:'Sarah L.', initials:'SL', meta:'Venue hier · séance ouverte', booking:'Séance terminée · 17:00 – 19:00', detail:'4 voyageurs · terminée', placeholder:'Écrire à Sarah…', messages:[['incoming','Merci encore, les enfants ont adoré les jeux d’eau !','Hier · 19:08'],['outgoing','Avec plaisir, merci d’être venus. À bientôt !','Hier · 19:16 · Lu']]},
  karim:{name:'Karim B.', initials:'KB', meta:'Réservation mercredi · 14:00', booking:'Séance ouverte · 14:00 – 16:00', detail:'3 voyageurs · à valider', placeholder:'Écrire à Karim…', messages:[['incoming','Bonjour, peut-on arriver dix minutes avant pour se changer ?','Lun. · 17:26']]}
};
let reservationRecords = [];
let selectedReservationId = null;
let activeHostConversation = 'martin';

const pad = value => String(value).padStart(2,'0');
const formatTime = date => pad(date.getHours()) + ':' + pad(date.getMinutes());
const formatMoney = value => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(value);
const capitalize = value => value.charAt(0).toUpperCase() + value.slice(1);

/* Les horaires démo étaient regénérés à chaque chargement (la même réservation changeait
   d'heure entre deux visites) : on les fige pour la journée. */
function demoReservations(){
  const now = new Date();
  let fige = null;
  try {
    const stored = JSON.parse(localStorage.getItem('ltp-demo-schedule') || 'null');
    if(stored && stored.day === now.toDateString()) fige = stored.starts;
  } catch { fige = null; }
  const at = minutes => {
    const date = new Date(now.getTime() + minutes * 60000);
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
    return date;
  };
  const records = [
    {id:'martin',name:'Famille Martin',start:at(138),duration:120,format:'Privatisation',guests:4,amount:68,status:'confirmed',guestDetail:'2 adultes · 2 enfants',history:'Déjà venus une fois · note voyageur 5/5',arrival:'Portillon côté jardin',prepare:'Parasol + 4 serviettes',ref:'LTP-2741'},
    {id:'sarah',name:'Sarah L.',start:at(390),duration:120,format:'Heure bleue',guests:5,amount:60,status:'confirmed',guestDetail:'3 adultes · 2 enfants',history:'Première réservation',arrival:'Entrée principale',prepare:'Éclairage + jeux d’eau',ref:'LTP-2748'},
    {id:'karim',name:'Karim B.',start:at(2 * 1440 + 180),duration:120,format:'Séance ouverte',guests:3,amount:21,status:'pending',guestDetail:'2 adultes · 1 enfant',history:'Nouveau voyageur',arrival:'Sonner au portail',prepare:'3 transats',ref:'LTP-2760'},
    {id:'lea',name:'Léa & Nino',start:at(5 * 1440 + 300),duration:180,format:'Créneau de nuit',guests:2,amount:30,status:'confirmed',guestDetail:'2 adultes',history:'Déjà venus deux fois',arrival:'Entrée côté jardin',prepare:'Éclairage + serviettes',ref:'LTP-2782'},
    {id:'emma',name:'Emma D.',start:at(-2 * 1440),duration:120,format:'Séance ouverte',guests:4,amount:28,status:'completed',guestDetail:'2 adultes · 2 enfants',history:'Voyageuse régulière',arrival:'Entrée principale',prepare:'Terminé',ref:'LTP-2719'}
  ];
  if(fige){
    records.forEach(record => { if(fige[record.id]) record.start = new Date(fige[record.id]); });
  } else {
    try {
      localStorage.setItem('ltp-demo-schedule', JSON.stringify({
        day: now.toDateString(),
        starts: Object.fromEntries(records.map(record => [record.id, record.start.toISOString()]))
      }));
    } catch { /* stockage indisponible : horaires recalculés à chaque visite */ }
  }
  return records.map(record => ({...record,end:new Date(record.start.getTime() + record.duration * 60000)}));
}

function statusLabel(status){
  return {confirmed:'Confirmée',pending:'À valider',ready:'Prête',completed:'Terminée',cancelled:'Annulée'}[status] || capitalize(status);
}

function initials(name){
  return name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0,2).toUpperCase();
}

/* KPIs et compteurs d'onglets calculés depuis les données : les chiffres en dur mentaient
   (8 « à venir » pour 5 réservations affichées). */
function refreshReservationCounters(records){
  const now = new Date();
  const today = records.filter(r => r.start.toDateString() === now.toDateString() && !['completed','cancelled'].includes(r.status));
  const upcoming = records.filter(r => r.end > now && !['completed','cancelled'].includes(r.status));
  const pending = records.filter(r => r.status === 'pending');
  const confirmed = upcoming.filter(r => r.status !== 'pending');
  const net = Math.round(confirmed.reduce((sum, r) => sum + r.amount, 0) * .85);
  const kpis = document.querySelectorAll('.reservation-command-kpis article');
  if(kpis.length >= 4){
    kpis[0].querySelector('b').textContent = String(today.length);
    kpis[0].querySelector('small').textContent = today.length ? 'prochaine à ' + formatTime(today[0].start) : 'rien aujourd’hui';
    kpis[1].querySelector('b').textContent = String(upcoming.length);
    kpis[2].querySelector('b').textContent = String(pending.length);
    kpis[2].querySelector('small').textContent = pending.length ? 'action nécessaire' : 'tout est traité';
    kpis[3].querySelector('b').textContent = formatMoney(net);
  }
  const tabUpcoming = document.querySelector('[data-reservation-filter="upcoming"] i');
  if(tabUpcoming) tabUpcoming.textContent = String(upcoming.length);
  const tabToday = document.querySelector('[data-reservation-filter="today"] i');
  if(tabToday) tabToday.textContent = String(today.length);
}

function renderReservations(records){
  refreshReservationCounters(records);
  const currentTime = Date.now();
  reservationRecords = records.slice().sort((a,b) => {
    const aPast = a.end.getTime() < currentTime || ['completed','cancelled'].includes(a.status);
    const bPast = b.end.getTime() < currentTime || ['completed','cancelled'].includes(b.status);
    if(aPast !== bPast) return aPast ? 1 : -1;
    return aPast ? b.start - a.start : a.start - b.start;
  });
  const list = document.getElementById('hostReservationList');
  list.replaceChildren();
  const today = new Date();
  reservationRecords.forEach((record,index) => {
    const isPast = record.end < today || ['completed','cancelled'].includes(record.status);
    const isToday = record.start.toDateString() === today.toDateString();
    const row = document.createElement('button');
    row.type = 'button';
    row.dataset.reservation = record.id;
    row.dataset.status = (isPast ? 'past' : 'upcoming') + (isToday ? ' today' : '');
    row.classList.toggle('active', index === 0);
    const time = document.createElement('time');
    const day = document.createElement('b'); day.textContent = pad(record.start.getDate());
    const month = document.createElement('small'); month.textContent = record.start.toLocaleDateString('fr-FR',{month:'short'}).replace('.','').toUpperCase();
    time.append(day,month);
    const copy = document.createElement('span');
    const name = document.createElement('strong'); name.textContent = record.name;
    const slot = document.createElement('small'); slot.textContent = formatTime(record.start) + ' – ' + formatTime(record.end) + ' · ' + record.format;
    const meta = document.createElement('em'); meta.textContent = record.guests + ' voyageurs · ' + formatMoney(record.amount);
    copy.append(name,slot,meta);
    const state = document.createElement('i'); state.textContent = statusLabel(record.status);
    if(record.status === 'pending') state.className = 'attention';
    if(isPast) state.className = 'done';
    row.append(time,copy,state);
    list.appendChild(row);
  });
  const next = reservationRecords.find(record => record.end > today && !['cancelled','completed'].includes(record.status));
  refreshDashboard(next);
  const activeFilter = document.querySelector('[data-reservation-filter].active');
  if(activeFilter) filterReservations(activeFilter.dataset.reservationFilter, activeFilter);
  const first = list.querySelector('[data-reservation]:not([hidden])');
  if(first) selectReservation(first, false);
}

function refreshDashboard(next){
  const now = new Date();
  if(!next){
    document.getElementById('hostNextArrivalLabel').textContent = 'Aucune arrivée à préparer pour le moment.';
    return;
  }
  const difference = Math.max(0,next.start - now);
  const hours = Math.floor(difference / 3600000);
  const minutes = Math.floor(difference % 3600000 / 60000);
  document.getElementById('hostNextArrivalLabel').innerHTML = 'Votre prochaine famille arrive dans <b>' + (hours ? hours + ' h ' : '') + minutes + ' min</b>.';
  document.getElementById('hostNextDay').textContent = next.start.toDateString() === now.toDateString() ? 'Aujourd’hui' : capitalize(next.start.toLocaleDateString('fr-FR',{weekday:'long'}));
  document.getElementById('hostNextStart').textContent = formatTime(next.start);
  document.getElementById('hostNextEnd').textContent = 'jusqu’à ' + formatTime(next.end);
  document.getElementById('hostNextInitials').textContent = initials(next.name);
  document.getElementById('hostNextName').textContent = next.name;
  document.getElementById('hostNextGuests').textContent = next.guestDetail;
  document.getElementById('hostNextHistory').textContent = next.history.split(' · ')[0];
  document.getElementById('hostNextFormat').textContent = next.format;
  document.getElementById('hostNextPrepare').textContent = next.prepare;
}

function normalizeBackendReservations(records){
  return records.map(record => {
    const start = new Date(record.slot.start_at);
    const end = new Date(record.slot.end_at);
    const travelerName = record.traveler?.full_name || 'Voyageur';
    return {
      id:record.id,name:travelerName,start,end,
      duration:Math.round((end-start)/60000),format:record.slot.format,
      guests:record.guest_count,amount:Number(record.total_amount),status:record.status,
      guestDetail:record.guest_count + ' voyageurs',history:'Profil vérifié',
      arrival:'Voir les instructions confirmées',prepare:record.notes || 'Accueil habituel',ref:record.id.slice(0,8).toUpperCase()
    };
  });
}

async function loadOperationalReservations(){
  if(!window.LTPBackend) return;
  try {
    const records = await window.LTPBackend.listHostReservations();
    if(records?.length) renderReservations(normalizeBackendReservations(records));
  } catch(error){ showToast(error.message || 'Synchronisation des réservations indisponible'); }
}

function showToast(message){
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function saveControls(storageKey, selector){
  const values = [...document.querySelectorAll(selector)].map(control => ({
    type:control.type,
    value:control.value,
    checked:control.type === 'checkbox' ? control.checked : undefined
  }));
  localStorage.setItem(storageKey, JSON.stringify(values));
}

/* Les champs marqués data-listing-field sont republiés vers la fiche publique (fiche.js les relit).
   Sans ça, l'éditeur annonçait « synchronisé » alors que rien ne changeait côté client. */
const OVERRIDE_KEY = 'ltp-listing-override';
const OVERRIDE_TARGET = 'micocouliers';

function publishListingOverride(){
  const fields = [...document.querySelectorAll('[data-listing-field]')];
  if(!fields.length) return false;
  const override = {};
  fields.forEach(field => {
    const value = field.value.trim();
    if(value) override[field.dataset.listingField] = value;
  });
  // les tarifs aussi : le message promettait une annonce publiée, seuls les textes l'étaient
  const pricing = {};
  document.querySelectorAll('[data-listing-price]').forEach(input => {
    const value = Number(input.value);
    if(Number.isFinite(value) && value > 0) pricing[input.dataset.listingPrice] = value;
  });
  if(Object.keys(pricing).length) override.pricing = pricing;
  try {
    const previous = localStorage.getItem(OVERRIDE_KEY);
    const next = JSON.stringify({id:OVERRIDE_TARGET, ...override});
    localStorage.setItem(OVERRIDE_KEY, next);
    return previous !== next;
  } catch { return false; }
}

function restoreControls(storageKey, selector){
  let values = [];
  try { values = JSON.parse(localStorage.getItem(storageKey) || '[]'); }
  catch(error){ values = []; }
  document.querySelectorAll(selector).forEach((control,index) => {
    const saved = values[index];
    if(!saved) return;
    if(control.type === 'checkbox') control.checked = Boolean(saved.checked);
    else control.value = saved.value;
    control.dispatchEvent(new Event('change',{bubbles:true}));
  });
}

function downloadCsv(filename, rows){
  const csv = rows.map(row => row.map(value => '"' + String(value ?? '').replaceAll('"','""') + '"').join(';')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob(['\uFEFF' + csv],{type:'text/csv;charset=utf-8'}));
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function setHostView(view){
  if(!allowedViews.includes(view)) view = 'dashboard';
  document.querySelectorAll('[data-host-panel]').forEach(panel => {
    const active = panel.dataset.hostPanel === view;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  document.querySelectorAll('[data-host-view]').forEach(item => {
    const active = item.dataset.hostView === view;
    item.classList.toggle('active', active);
    if(active) item.setAttribute('aria-current','page');
    else item.removeAttribute('aria-current');
  });
  const titles = {dashboard:'Tableau de bord',listing:'Mon annonce',calendar:'Calendrier',reservations:'Réservations',bookings:'Revenus',messages:'Messages',account:'Compte hôte'};
  document.title = titles[view] + ' — Espace hôte';
  const nextUrl = new URL(location.href);
  nextUrl.searchParams.set('view', view);
  history.replaceState({view}, '', nextUrl);
  window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  closeNotifications();
}

function fillHostAccount(data){
  const form = document.getElementById('hostAccountForm');
  if(!form || !data) return;
  // le compte hôte affiche les coordonnées de l'HÔTE : le profil voyageur (Julie) ne fournit
  // que ce que hostProfile ne définit pas — avant, son e-mail écrasait celui de Claire
  const merged = {...data.hostProfile, ...data.notifications,
    full_name: data.hostProfile?.public_name || data.profile?.full_name};
  Object.entries(merged).forEach(([name,value]) => {
    const field = form.elements.namedItem(name);
    if(!field) return;
    if(field.type === 'checkbox') field.checked = Boolean(value);
    else if(value !== null && value !== undefined) field.value = value;
  });
}

async function loadHostAccount(){
  if(!window.LTPBackend) return;
  try { fillHostAccount(await window.LTPBackend.loadAccount('host')); }
  catch(error){ showToast(error.message || 'Compte momentanément indisponible'); }
}

function openNotifications(){
  notificationPanel.hidden = false;
  notificationButton.setAttribute('aria-expanded','true');
}

function closeNotifications(){
  notificationPanel.hidden = true;
  notificationButton.setAttribute('aria-expanded','false');
}

document.addEventListener('click', event => {
  if(event.target.closest('#hostNotifications')){
    notificationPanel.hidden ? openNotifications() : closeNotifications();
    return;
  }
  if(event.target.closest('[data-close-notifications]')){ closeNotifications(); return; }
  if(!notificationPanel.hidden && !event.target.closest('#hostNotificationPanel')) closeNotifications();

  const jump = event.target.closest('[data-host-view-jump]');
  if(jump){ setHostView(jump.dataset.hostViewJump); return; }

  const listingStep = event.target.closest('[data-listing-step]');
  if(listingStep){
    document.querySelectorAll('.listing-journey nav [data-listing-step]').forEach(item => item.classList.toggle('active', item.dataset.listingStep === listingStep.dataset.listingStep));
    document.getElementById(listingStep.dataset.listingStep)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
    return;
  }

  const weekday = event.target.closest('[data-weekday]');
  if(weekday){
    const open = weekday.getAttribute('aria-pressed') !== 'true';
    weekday.setAttribute('aria-pressed', String(open));
    weekday.classList.toggle('active', open);
    weekday.querySelector('b').textContent = open ? 'Ouvert' : 'Fermé';
    const openDays = document.querySelectorAll('[data-weekday][aria-pressed="true"]').length;
    const summary = document.querySelector('.listing-availability>aside b');
    if(summary) summary.textContent = openDays + ' jour' + (openDays > 1 ? 's' : '') + ' ouvert' + (openDays > 1 ? 's' : '');
    showToast(open ? 'Jour ajouté à votre semaine type' : 'Jour fermé dans votre semaine type');
    return;
  }

  const view = event.target.closest('[data-host-view]');
  if(view){ setHostView(view.dataset.hostView); return; }

  const photo = event.target.closest('[data-host-photo]');
  if(photo){ document.getElementById('hostPhotoInput').click(); return; }

  const cover = event.target.closest('[data-host-cover]');
  if(cover){
    document.querySelectorAll('[data-host-cover]').forEach(item => {
      const active = item === cover;
      item.classList.toggle('active', active);
      item.classList.toggle('cover', active);
      item.querySelector('span').textContent = active ? 'Couverture' : 'Définir en couverture';
    });
    showToast('Nouvelle photo de couverture enregistrée');
    return;
  }

  const ai = event.target.closest('[data-host-ai]');
  if(ai){
    if(!window.LTPPremium?.isHostPremium()){
      window.LTPPremium?.open('host');
      return;
    }
    const messages = {
      order:'Ordre proposé : vue d’ensemble, jeux, sécurité, bassin puis coin ombragé.',
      copy:'Maz a préparé une version plus courte. Relisez-la avant de l’enregistrer.',
      regenerate:'Photos préparées : lumière, cadrage et netteté améliorés. Vérifiez-les avant publication.',
      premium:'Premium : badge, meilleure diffusion et outils avancés — les avis restent 100 % organiques.'
    };
    if(ai.dataset.hostAi === 'order'){
      const grid = document.getElementById('hostPhotoGrid');
      if(grid){ [...grid.children].sort((a,b) => +(a.querySelector('i')?.textContent || 0) - +(b.querySelector('i')?.textContent || 0)).forEach(item => grid.appendChild(item)); }
    }
    if(ai.dataset.hostAi === 'regenerate'){
      document.querySelectorAll('#hostPhotoGrid button').forEach((item, index) => {
        window.setTimeout(() => item.classList.add('maz-enhanced'), index * 80);
      });
    }
    if(ai.dataset.hostAi === 'copy'){
      const description = document.querySelector('[data-host-panel="listing"] textarea');
      if(description){
        description.value = 'Piscine en pierre chauffée, jardin de lavandes, coin ombragé et accès indépendant.';
        description.dispatchEvent(new Event('input',{bubbles:true}));
      }
    }
    showToast(messages[ai.dataset.hostAi]);
    const nextLabel = ai.dataset.hostAi === 'order' ? 'Ordre proposé · modifier' : ai.dataset.hostAi === 'copy' ? 'Proposition prête · relire' : ai.dataset.hostAi === 'regenerate' ? 'Photos améliorées · vérifier' : 'Voir les avantages';
    const inlineLabel = ai.querySelector('b');
    if(inlineLabel) inlineLabel.textContent = nextLabel;
    else ai.textContent = nextLabel;
    return;
  }

  const conversation = event.target.closest('[data-host-conversation]');
  if(conversation){ openHostConversation(conversation.dataset.hostConversation); return; }
  if(event.target.closest('[data-close-host-thread]')){ document.querySelector('.host-message-center')?.classList.remove('thread-open'); return; }
  if(event.target.closest('[data-host-attach]')){ document.getElementById('hostMessageFile')?.click(); return; }

  const reservation = event.target.closest('[data-reservation]');
  if(reservation){ selectReservation(reservation); return; }
  if(event.target.closest('[data-close-reservation]')){
    document.querySelector('.reservation-command')?.classList.remove('detail-open');
    document.body.classList.remove('reservation-detail-open');
    return;
  }
  const amenityCat = event.target.closest('[data-amenity-cat]');
  if(amenityCat){
    // les catégories filtraient du vide : elles montrent désormais les équipements concernés
    document.querySelectorAll('[data-amenity-cat]').forEach(item => item.classList.toggle('active', item === amenityCat));
    const keys = amenityCat.dataset.amenityCat.split(',');
    document.querySelectorAll('.amenity-grid label').forEach(label => {
      const key = label.querySelector('[data-amenity]')?.dataset.amenity;
      label.hidden = amenityCat.dataset.amenityCat !== 'all' && !keys.includes(key);
    });
    return;
  }
  if(event.target.closest('[data-reservation-accept]')){ decideReservation(true); return; }
  if(event.target.closest('[data-reservation-decline]')){ decideReservation(false); return; }
  if(event.target.closest('[data-reservation-ready]')){
    const record = reservationRecords.find(entry => entry.id === selectedReservationId);
    if(!record) return;
    Promise.resolve(window.LTPBackend?.markReservationReady(record.id)).then(() => {
      record.status = 'ready';
      renderReservations(reservationRecords);
      const row = document.querySelector(`[data-reservation="${record.id}"]`);
      if(row) selectReservation(row, false);
      showToast('Arrivée marquée comme prête');
    }).catch(error => showToast(error.message || 'Action impossible'));
    return;
  }
  const reservationFilter = event.target.closest('[data-reservation-filter]');
  if(reservationFilter){ filterReservations(reservationFilter.dataset.reservationFilter, reservationFilter); return; }

  if(event.target.closest('[data-next-message]')){
    const next = reservationRecords.find(record => record.end > new Date() && !['cancelled','completed'].includes(record.status));
    setHostView('messages');
    openHostConversation(hostConversations[next?.id] ? next.id : 'martin');
    return;
  }
  if(event.target.closest('[data-next-ready]')){
    const next = reservationRecords.find(record => record.end > new Date() && !['cancelled','completed'].includes(record.status));
    if(!next) return;
    Promise.resolve(window.LTPBackend?.markReservationReady(next.id)).then(() => {
      next.status = 'ready';
      renderReservations(reservationRecords);
      showToast('Arrivée marquée comme prête');
    }).catch(error => showToast(error.message || 'Action impossible'));
    return;
  }

  if(event.target.closest('[data-save-calendar]')){
    saveControls('ltp-host-calendar-settings','[data-host-panel="calendar"] [data-sync]');
    showToast('Disponibilités enregistrées sur ce calendrier');
    return;
  }
  if(event.target.closest('[data-export-reservations]')){
    const rows = [['Référence','Voyageur','Début','Fin','Format','Voyageurs','Montant','Statut']];
    reservationRecords.forEach(record => rows.push([record.ref,record.name,record.start.toLocaleString('fr-FR'),record.end.toLocaleString('fr-FR'),record.format,record.guests,record.amount,statusLabel(record.status)]));
    downloadCsv('reservations-semaine.csv',rows);
    showToast('Liste des arrivées téléchargée');
    return;
  }
  if(event.target.closest('[data-export-revenue]')){
    downloadCsv('revenus-hote.csv',[['Mois','Revenu net'],['Février',424],['Mars',530],['Avril',702],['Mai',875],['Juin',1060],['Juillet',1324]]);
    showToast('Export des revenus téléchargé');
    return;
  }

  const scroll = event.target.closest('[data-scroll-host]');
  if(scroll){ document.getElementById(scroll.dataset.scrollHost)?.scrollIntoView({behavior:'smooth', block:'start'}); return; }

  if(event.target.closest('[data-host-save]')){
    saveControls('ltp-host-listing-settings','[data-host-panel="listing"] input,[data-host-panel="listing"] select,[data-host-panel="listing"] textarea');
    const changed = publishListingOverride();
    showToast(changed ? 'Enregistré · visible sur votre annonce publique' : 'Modifications enregistrées');
    return;
  }

  const day = event.target.closest('.host-week button:not(.past):not(.booked)');
  if(day){
    const open = day.classList.toggle('available');
    day.setAttribute('aria-pressed', String(open));
    day.querySelector('span').textContent = open ? 'Ouvert' : 'Fermé';
    day.querySelector('em').textContent = open ? '14 h – 20 h' : 'Ouvrir ce jour';
    showToast(open ? 'Créneau ouvert aux familles' : 'Journée fermée');
  }
});

/* Les planchers annoncés aux hôtes (6 €/pers, 40 €/2 h, 90 €/demi-journée, 120 €/jour) doivent
   être tenus à la saisie aussi, pas seulement par les flèches : un prix tapé plus bas était accepté. */
document.addEventListener('change', event => {
  const input = event.target;
  if(!(input instanceof HTMLInputElement) || input.type !== 'number') return;
  // l'éditeur de créneau a sa propre validation avec message inline : pas de correction muette ici
  if(input.closest('#slotForm')) return;
  const minimum = Number(input.min || 0);
  if(!minimum || input.value === '') return;
  if(Number(input.value) < minimum){
    input.value = String(minimum);
    const label = (input.getAttribute('aria-label') || 'Ce réglage').toLowerCase();
    showToast('Le minimum pour ' + label + ' est de ' + minimum + ' — valeur ramenée au plancher');
    input.focus();
  }
});

document.addEventListener('click', event => {
  const step = event.target.closest('[data-number-step]');
  if(!step) return;
  const input = step.parentElement?.querySelector('input[type="number"]');
  if(!input) return;
  const delta = Number(step.dataset.numberStep || 0);
  const minimum = Number(input.min || 0);
  input.value = String(Math.max(minimum, Number(input.value || 0) + delta));
  input.dispatchEvent(new Event('input', {bubbles:true}));
  showToast('Réglage mis à jour · pensez à enregistrer');
});

function openHostConversation(id){
  const data = hostConversations[id];
  if(!data) return;
  activeHostConversation = id;
  document.querySelectorAll('[data-host-conversation]').forEach(item => item.classList.toggle('active', item.dataset.hostConversation === id));
  const thread = document.getElementById('hostThread');
  const avatar = thread.querySelector('header>span');
  avatar.firstChild.textContent = data.initials;
  thread.querySelector('header div b').textContent = data.name;
  thread.querySelector('header div small').textContent = data.meta;
  thread.querySelector('.host-thread-booking b').textContent = data.booking;
  thread.querySelector('.host-thread-booking small').textContent = data.detail;
  document.getElementById('hostMessageInput').placeholder = data.placeholder;
  const history = [...data.messages, ...(window.LTPStore?.loadThread('host', id) || [])];
  const body = document.getElementById('hostThreadBody');
  body.replaceChildren();
  history.forEach(message => {
    const bubble = document.createElement('div');
    bubble.className = 'host-bubble ' + message[0];
    const paragraph = document.createElement('p');
    paragraph.textContent = message[1];
    const stamp = document.createElement('small');
    stamp.textContent = message[2];
    bubble.append(paragraph, stamp);
    body.appendChild(bubble);
  });
  document.querySelector('.host-message-center').classList.add('thread-open');
}

function filterReservations(filter, button){
  document.querySelectorAll('[data-reservation-filter]').forEach(item => item.classList.toggle('active', item === button));
  document.querySelectorAll('[data-reservation]').forEach(item => item.hidden = filter !== 'upcoming' && !item.dataset.status.includes(filter) || filter === 'upcoming' && !item.dataset.status.includes('upcoming'));
}

function selectReservation(item, openOnMobile = true){
  document.querySelectorAll('[data-reservation]').forEach(row => row.classList.toggle('active', row === item));
  const record = reservationRecords.find(entry => entry.id === item.dataset.reservation);
  if(!record) return;
  selectedReservationId = record.id;
  const detail = document.getElementById('hostReservationDetail');
  const isToday = record.start.toDateString() === new Date().toDateString();
  detail.querySelector('h2').textContent = record.name;
  detail.querySelector('[data-reservation-date]').textContent = (isToday ? 'AUJOURD’HUI' : record.start.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()) + ' · ' + formatTime(record.start);
  detail.querySelector('[data-reservation-ref]').textContent = 'Réservation #' + record.ref;
  detail.querySelector('[data-reservation-state]').textContent = statusLabel(record.status);
  detail.querySelector('.reservation-guests span').textContent = initials(record.name);
  detail.querySelector('[data-reservation-guests]').textContent = record.guestDetail;
  detail.querySelector('[data-reservation-history]').textContent = record.history;
  detail.querySelector('[data-reservation-field="format"]').textContent = record.format + ' · ' + Math.round(record.duration / 60) + ' h';
  const netExact = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2}).format(record.amount * .85);
  detail.querySelector('[data-reservation-field="payment"]').textContent = formatMoney(record.amount) + ' payé · ' + netExact + ' net';
  detail.querySelector('[data-reservation-field="arrival"]').textContent = record.arrival;
  detail.querySelector('[data-reservation-field="prepare"]').textContent = record.prepare;
  renderReservationActions(detail, record);
  if(openOnMobile && matchMedia('(max-width:900px)').matches){
    document.querySelector('.reservation-command')?.classList.add('detail-open');
    document.body.classList.add('reservation-detail-open');
  }
}

/* Les actions dépendent du statut : une demande « À valider » doit pouvoir être acceptée ou refusée,
   sinon le tableau de bord réclame une action qu'aucun bouton ne permet. */
function renderReservationActions(detail, record){
  const zone = detail.querySelector('.reservation-detail-actions');
  if(!zone) return;
  const prenom = record.name.split(/\s+/)[0];
  zone.replaceChildren();
  const bouton = (label, attr, primaire) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if(primaire) b.className = 'primary';
    b.setAttribute(attr, '');
    return b;
  };
  if(record.status === 'pending'){
    zone.append(bouton('Accepter la demande', 'data-reservation-accept', true), bouton('Refuser', 'data-reservation-decline'));
  } else if(record.status === 'confirmed'){
    zone.appendChild(bouton('Marquer comme prêt', 'data-reservation-ready', true));
  }
  const ecrire = bouton('Écrire à ' + prenom, 'data-host-view-jump', false);
  ecrire.dataset.hostViewJump = 'messages';
  zone.appendChild(ecrire);
}

function decideReservation(accepted){
  const record = reservationRecords.find(entry => entry.id === selectedReservationId);
  if(!record || record.status !== 'pending') return;
  record.status = accepted ? 'confirmed' : 'cancelled';
  try {
    const decisions = JSON.parse(localStorage.getItem('ltp-host-decisions') || '{}');
    decisions[record.id] = record.status;
    localStorage.setItem('ltp-host-decisions', JSON.stringify(decisions));
  } catch { /* la décision reste valable pour la session */ }
  renderReservations(reservationRecords);
  const row = document.querySelector(`[data-reservation="${record.id}"]`);
  if(row) selectReservation(row, false);
  refreshPendingBadges();
  showToast(accepted
    ? record.name + ' est confirmé · le créneau est bloqué'
    : 'Demande refusée · le créneau redevient disponible');
}

/* Les pastilles « à valider » de la barre latérale suivent le nombre réel de demandes en attente. */
function refreshPendingBadges(){
  const pending = reservationRecords.filter(entry => entry.status === 'pending').length;
  document.querySelectorAll('[data-host-view="reservations"] i').forEach(badge => {
    badge.textContent = String(pending);
    badge.hidden = pending === 0;
  });
}

function refreshOfferChoices(){
  const toggles = [...document.querySelectorAll('[data-format-toggle]')];
  toggles.forEach(toggle => {
    const card = toggle.closest('.offer-choice');
    card?.classList.toggle('active', toggle.checked);
    const status = card?.querySelector('header>em');
    if(status) status.textContent = toggle.checked ? 'Actif' : 'Inactif';
  });
  const counter = document.querySelector('.listing-offer>header>span');
  const active = toggles.filter(toggle => toggle.checked).length;
  if(counter) counter.textContent = active + ' format' + (active > 1 ? 's' : '') + ' actif' + (active > 1 ? 's' : '');
}

document.querySelectorAll('[data-sync]').forEach(control => control.addEventListener('change', event => {
  const source = event.currentTarget;
  document.querySelectorAll(`[data-sync="${source.dataset.sync}"]`).forEach(target => {
    if(target === source) return;
    if(source.type === 'checkbox') target.checked = source.checked;
    else target.value = source.value;
  });
  refreshOfferChoices();
}));
refreshOfferChoices();

document.getElementById('addHostRule').addEventListener('click', () => {
  const input = document.getElementById('customRule');
  const value = input.value.trim();
  if(!value){ input.focus(); return; }
  const rule = document.createElement('span');
  rule.append(document.createTextNode(value + ' '));
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.setAttribute('aria-label','Retirer cette règle');
  remove.textContent = '×';
  remove.addEventListener('click', () => rule.remove());
  rule.appendChild(remove);
  document.getElementById('customRules').appendChild(rule);
  input.value = '';
  showToast('Consigne ajoutée au règlement');
});

document.querySelectorAll('#customRules button').forEach(button => button.addEventListener('click', () => button.parentElement.remove()));

/* Le calendrier hôte était figé sur la semaine du 27 juillet : dates en dur, flèches mortes,
   et « juillet » collé au nom du jour quel que soit le mois. La semaine est désormais générée
   depuis la date réelle, et les flèches naviguent. */
let weekStart = (() => {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
})();
let selectedDayDate = new Date();

const JOURS = ['Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.','Dim.'];
const MOIS_LONG = new Intl.DateTimeFormat('fr-FR', {day:'numeric', month:'long'});
const semaineLabel = () => {
  const fin = new Date(weekStart.getTime() + 6 * 86400000);
  return (MOIS_LONG.format(weekStart) + ' – ' + MOIS_LONG.format(fin)).toUpperCase();
};

function renderHostWeek(){
  const container = document.querySelector('.calendar-days');
  const header = container?.closest('section')?.querySelector('header');
  if(!container || !header) return;
  header.querySelector('small').textContent = semaineLabel();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const offset = Math.round((weekStart - now) / 86400000);
  header.querySelector('h2').textContent = offset === 0 || (offset < 0 && offset > -7)
    ? 'Cette semaine' : (offset > 0 && offset < 8 ? 'Semaine prochaine' : 'Semaine du ' + MOIS_LONG.format(weekStart));
  container.replaceChildren();
  for(let i = 0; i < 7; i++){
    const date = new Date(weekStart.getTime() + i * 86400000);
    const button = document.createElement('button');
    button.type = 'button';
    if(date.toDateString() === selectedDayDate.toDateString()) button.className = 'active';
    if(date < now) button.classList.add('past');
    button.dataset.calDate = localDateValue(date);
    const nom = document.createElement('small'); nom.textContent = JOURS[i];
    const num = document.createElement('b'); num.className = 'num'; num.textContent = pad(date.getDate());
    button.append(nom, num);
    button.addEventListener('click', () => {
      selectedDayDate = date;
      renderHostWeek();
      document.querySelector('.slot-planner>header b').textContent =
        capitalize(new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(date));
      refreshPersistedSlots();
    });
    container.appendChild(button);
  }
}

document.querySelectorAll('[aria-label="Semaine précédente"],[aria-label="Semaine suivante"]').forEach(arrow => {
  arrow.addEventListener('click', () => {
    const sens = arrow.getAttribute('aria-label') === 'Semaine suivante' ? 7 : -7;
    weekStart = new Date(weekStart.getTime() + sens * 86400000);
    renderHostWeek();
    showToast('Semaine du ' + MOIS_LONG.format(weekStart));
  });
});
renderHostWeek();
document.querySelector('.slot-planner>header b').textContent =
  capitalize(new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(selectedDayDate));

const slotEditor = document.getElementById('slotEditor');
const slotForm = document.getElementById('slotForm');
const slotLabels = {open:'Séance ouverte',private:'Privatisation',blue_hour:'Heure bleue',night:'Créneau de nuit'};

function localDateValue(date){
  return [date.getFullYear(),pad(date.getMonth() + 1),pad(date.getDate())].join('-');
}

function closeSlotEditor(){
  slotEditor.hidden = true;
  document.body.classList.remove('slot-editor-open');
}

function slotPayload(){
  const values = new FormData(slotForm);
  const date = values.get('date');
  const format = values.get('format');
  const startAt = new Date(date + 'T' + values.get('start'));
  const endAt = new Date(date + 'T' + values.get('end'));
  if(endAt <= startAt && format === 'night') endAt.setDate(endAt.getDate() + 1);
  return {
    format,
    startAt:startAt.toISOString(),
    endAt:endAt.toISOString(),
    priceAmount:Number(values.get('price')),
    priceUnit:String(values.get('priceUnit')),
    capacity:Number(values.get('capacity'))
  };
}

function refreshSlotSummary(){
  const summary = document.getElementById('slotEditorSummary');
  const error = document.getElementById('slotEditorError');
  try {
    const payload = slotPayload();
    const start = new Date(payload.startAt);
    const end = new Date(payload.endAt);
    const price = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(payload.priceAmount);
    summary.innerHTML = '<span><small>Votre créneau</small><b></b></span><span><small>Tarif et jauge</small><b></b></span>';
    summary.children[0].querySelector('b').textContent = capitalize(start.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})) + ' · ' + formatTime(start) + ' – ' + formatTime(end);
    summary.children[1].querySelector('b').textContent = price + (payload.priceUnit === 'person' ? ' / personne' : ' / créneau') + ' · ' + payload.capacity + ' places';
    error.hidden = true;
  } catch(errorValue){
    summary.replaceChildren();
  }
}

function openSlotEditor(){
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('slotDate').value = localDateValue(tomorrow);
  document.getElementById('slotEditorError').hidden = true;
  slotEditor.hidden = false;
  document.body.classList.add('slot-editor-open');
  refreshSlotSummary();
  requestAnimationFrame(() => document.getElementById('slotDate').focus());
}

function renderPersistedSlot(slot){
  const container = document.getElementById('hostSlotRows');
  if(container.querySelector('[data-persisted-slot="' + slot.id + '"]')) return;
  // un créneau publié pour mercredi n'a rien à faire dans la liste du lundi
  const jour = new Date(slot.start_at || slot.startAt);
  if(jour.toDateString() !== selectedDayDate.toDateString()) return;
  const start = new Date(slot.start_at || slot.startAt);
  const end = new Date(slot.end_at || slot.endAt);
  const format = slot.format;
  const price = Number(slot.price_amount ?? slot.priceAmount);
  const unit = (slot.price_unit || slot.priceUnit) === 'person' ? ' / personne' : ' / créneau';
  const row = document.createElement('label');
  row.dataset.persistedSlot = slot.id;
  if(format === 'night') row.className = 'night';
  const time = document.createElement('time');
  time.textContent = formatTime(start) + ' — ' + formatTime(end);
  const copy = document.createElement('span');
  const title = document.createElement('b');
  title.textContent = slotLabels[format] || 'Créneau';
  const details = document.createElement('small');
  details.textContent = start.toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) + ' · ' + price.toLocaleString('fr-FR') + ' €' + unit + ' · ' + slot.capacity + ' places';
  copy.append(title,details);
  const state = document.createElement('em');
  state.className = 'slot-published';
  state.textContent = 'Publié';
  row.append(time,copy,state);
  container.appendChild(row);
  refreshPlannerSummary();
}

function refreshPlannerSummary(){
  const container = document.getElementById('hostSlotRows');
  const openCount = container.querySelectorAll('label:not([hidden]) input[type="checkbox"]:checked,label:not([hidden]) .slot-published').length;
  const reservationCount = [...container.querySelectorAll('label:not([hidden]) em:not(.slot-published)')].filter(item => /réserv/i.test(item.textContent)).length;
  document.getElementById('slotPlannerSummary').textContent = openCount + ' créneau' + (openCount > 1 ? 'x' : '') + ' ouvert' + (openCount > 1 ? 's' : '') + ' · ' + reservationCount + ' réservation' + (reservationCount > 1 ? 's' : '');
}

async function loadHostSlots(){
  if(!window.LTPBackend) return;
  try {
    const slots = await window.LTPBackend.listHostSlots();
    slots.filter(slot => slot.status === 'open').forEach(renderPersistedSlot);
    refreshPlannerSummary();
  } catch(error){ showToast(error.message || 'Impossible de charger les créneaux'); }
}

/* Au changement de jour : on retire les créneaux publiés affichés et on recharge ceux du jour.
   Les lignes de démonstration n'appartiennent qu'à AUJOURD'HUI — les afficher identiques tous
   les jours faisait passer le calendrier pour un décor. */
function refreshPersistedSlots(){
  document.querySelectorAll('#hostSlotRows [data-persisted-slot]').forEach(row => row.remove());
  const container = document.getElementById('hostSlotRows');
  const estAujourdhui = selectedDayDate.toDateString() === new Date().toDateString();
  container.querySelectorAll('label:not([data-persisted-slot])').forEach(row => { row.hidden = !estAujourdhui; });
  let vide = container.querySelector('[data-empty-day]');
  if(!vide){
    vide = document.createElement('p');
    vide.setAttribute('data-empty-day','');
    vide.className = 'slot-empty-day';
    vide.textContent = 'Aucun créneau ce jour — « + Ajouter un créneau » pour en ouvrir un.';
    container.appendChild(vide);
  }
  Promise.resolve(window.LTPBackend?.listHostSlots?.() || []).then(slots => {
    (slots || []).filter(slot => slot.status === 'open').forEach(renderPersistedSlot);
    const visibles = container.querySelectorAll('label:not([hidden])').length;
    vide.hidden = estAujourdhui || visibles > 0;
    refreshPlannerSummary();
  }).catch(() => { vide.hidden = estAujourdhui; });
}

document.querySelector('[data-add-slot]').addEventListener('click', openSlotEditor);
document.querySelectorAll('[data-close-slot]').forEach(button => button.addEventListener('click', closeSlotEditor));
slotForm.addEventListener('input', event => {
  if(event.target.name === 'format' && event.target.value === 'private') document.getElementById('slotPriceUnit').value = 'slot';
  if(event.target.name === 'format' && event.target.value !== 'private') document.getElementById('slotPriceUnit').value = 'person';
  refreshSlotSummary();
});
slotForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  const error = document.getElementById('slotEditorError');
  button.disabled = true;
  button.textContent = 'Publication…';
  try {
    if(!window.LTPBackend) throw new Error('Le service de disponibilités n’est pas encore prêt.');
    const created = await window.LTPBackend.publishAvailabilitySlot(slotPayload());
    // on rejoint le jour du créneau : il apparaît là où il vivra, pas dans la liste affichée
    const jourCreneau = new Date(created.start_at || created.startAt);
    selectedDayDate = jourCreneau;
    weekStart = new Date(jourCreneau);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    renderHostWeek();
    document.querySelector('.slot-planner>header b').textContent =
      capitalize(new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(jourCreneau));
    renderPersistedSlot(created);
    closeSlotEditor();
    showToast('Créneau publié le ' + MOIS_LONG.format(jourCreneau));
  } catch(errorValue){
    error.textContent = errorValue.message || 'Impossible de publier ce créneau.';
    error.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Publier ce créneau';
  }
});

document.getElementById('hostPhotoInput').addEventListener('change', event => {
  const files = [...event.target.files];
  const grid = document.getElementById('hostPhotoGrid');
  if(files.length && grid){
    files.forEach((file, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.hostCover = '';
      const image = document.createElement('img');
      image.src = URL.createObjectURL(file);
      image.alt = 'Photo importée ' + (index + 1);
      const caption = document.createElement('span');
      caption.textContent = 'Définir en couverture';
      const order = document.createElement('i');
      order.textContent = grid.children.length + 1;
      button.append(image, caption, order);
      grid.appendChild(button);
    });
  }
  if(files.length) showToast(files.length + ' photo' + (files.length > 1 ? 's' : '') + ' ajoutée' + (files.length > 1 ? 's' : '') + ' · ordre modifiable');
  event.target.value = '';
});

document.getElementById('listingToggle').addEventListener('click', event => {
  const button = event.currentTarget;
  const online = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(online));
  button.lastChild.textContent = online ? 'En ligne' : 'En pause';
  showToast(online ? 'Votre annonce est de nouveau visible' : 'Votre annonce est mise en pause');
});

document.getElementById('hostMessageComposer')?.addEventListener('submit', event => {
  event.preventDefault();
  const input = document.getElementById('hostMessageInput');
  const value = input.value.trim();
  if(!value){ input.focus(); return; }
  const bubble = document.createElement('div');
  bubble.className = 'host-bubble outgoing';
  bubble.innerHTML = '<p></p><small>À l’instant · Envoyé</small>';
  const paragraph = bubble.querySelector('p');
  paragraph.textContent = value;
  document.getElementById('hostThreadBody').appendChild(bubble);
  input.value = '';
  bubble.scrollIntoView({behavior:'smooth', block:'nearest'});
  const stored = window.LTPStore?.playMasking(bubble, paragraph, value) ?? value;
  if(stored !== value) showToast('Coordonnées masquées — la réservation passe par la plateforme');
  window.LTPStore?.appendMessage('host', activeHostConversation, 'outgoing', stored);
});

document.getElementById('hostMessageFile')?.addEventListener('change', event => {
  const files = [...event.target.files];
  if(!files.length) return;
  const bubble = document.createElement('div');
  bubble.className = 'host-bubble outgoing attachment';
  bubble.innerHTML = '<p></p><small>À l’instant · Envoyé</small>';
  bubble.querySelector('p').textContent = files.map(file => file.name).join(' · ');
  document.getElementById('hostThreadBody').appendChild(bubble);
  event.target.value = '';
  showToast(files.length + ' pièce' + (files.length > 1 ? 's' : '') + ' jointe' + (files.length > 1 ? 's' : ''));
});

document.querySelector('[data-reservation-search]')?.addEventListener('input', event => {
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll('[data-reservation]').forEach(item => item.hidden = !!query && !item.textContent.toLowerCase().includes(query));
});

document.getElementById('hostAccountForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = event.submitter;
  const values = Object.fromEntries(new FormData(form));
  ['booking_notifications','message_notifications','maz_notifications'].forEach(name => { values[name] = form.elements[name].checked; });
  button.disabled = true;
  button.textContent = 'Enregistrement…';
  try {
    if(window.LTPBackend) await window.LTPBackend.saveAccount('host', values);
    showToast('Compte hôte enregistré');
  } catch(error){ showToast(error.message || 'Impossible d’enregistrer'); }
  finally { button.disabled = false; button.textContent = 'Enregistrer les modifications'; }
});

document.addEventListener('click', event => {
  const action = event.target.closest('[data-account-action]');
  if(!action) return;
  if(action.dataset.accountAction === 'payout'){
    setHostView('bookings');
    return;
  }
  if(action.dataset.accountAction === 'calendar'){
    // la vraie date sélectionnée, pas un numéro de jour recollé sur le mois courant
    const calendarDate = new Date(selectedDayDate);
    const toIcal = date => [date.getFullYear(),pad(date.getMonth() + 1),pad(date.getDate())].join('') + 'T' + pad(date.getHours()) + pad(date.getMinutes()) + '00';
    const slots = [...document.querySelectorAll('#hostSlotRows label')].map((row,index) => {
      const times = row.querySelector('time')?.textContent.match(/\d{2}:\d{2}/g) || [];
      const start = new Date(calendarDate);
      const end = new Date(calendarDate);
      const startParts = (times[0] || '09:00').split(':').map(Number);
      const endParts = (times[1] || '11:00').split(':').map(Number);
      start.setHours(startParts[0],startParts[1],0,0);
      end.setHours(endParts[0],endParts[1],0,0);
      if(end <= start) end.setDate(end.getDate() + 1);
      return ['BEGIN:VEVENT','UID:ltp-' + index + '@louetapiscine.local','SUMMARY:' + (row.querySelector('b')?.textContent || 'Créneau piscine'),'DESCRIPTION:' + (row.querySelector('small')?.textContent || ''),'DTSTART:' + toIcal(start),'DTEND:' + toIcal(end),'END:VEVENT'].join('\r\n');
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['BEGIN:VCALENDAR\r\nVERSION:2.0\r\n' + slots.join('\r\n') + '\r\nEND:VCALENDAR'],{type:'text/calendar'}));
    link.download = 'calendrier-loue-ta-piscine.ics';
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Calendrier iCal téléchargé');
    return;
  }
  if(action.dataset.accountAction === 'password'){
    const email = document.getElementById('hostAccountForm')?.elements.email?.value;
    Promise.resolve(window.LTPBackend?.requestPasswordReset(email)).then(result => {
      if(result) showToast('E-mail sécurisé de réinitialisation envoyé');
    }).catch(error => showToast(error.message || 'Réinitialisation indisponible'));
  }
});

window.addEventListener('ltp:backend-ready', () => { loadHostAccount(); loadOperationalReservations(); loadHostSlots(); });
setTimeout(() => {
  restoreControls('ltp-host-calendar-settings','[data-host-panel="calendar"] [data-sync]');
  restoreControls('ltp-host-listing-settings','[data-host-panel="listing"] input,[data-host-panel="listing"] select,[data-host-panel="listing"] textarea');
  loadHostAccount();
  loadHostSlots();
  refreshPlannerSummary();
}, 0);

document.addEventListener('keydown', event => {
  if(event.key !== 'Escape') return;
  closeNotifications();
  if(!slotEditor.hidden) closeSlotEditor();
});

if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  const items = document.querySelectorAll('[data-host-panel="dashboard"] .host-status-line,[data-host-panel="dashboard"] .host-overview>article,[data-host-panel="dashboard"] .host-calendar-card,[data-host-panel="dashboard"] .host-lower-grid>article,[data-host-panel="dashboard"] .host-ai-studio');
  document.body.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {threshold:.08});
  items.forEach(item => { item.classList.add('experience-reveal'); observer.observe(item); });
}

/* Les décisions Accepter/Refuser survivent au rechargement, et les compteurs partent des données. */
function demoReservationsAvecDecisions(){
  const records = demoReservations();
  try {
    const decisions = JSON.parse(localStorage.getItem('ltp-host-decisions') || '{}');
    records.forEach(record => { if(decisions[record.id]) record.status = decisions[record.id]; });
  } catch { /* stockage illisible : on garde les statuts de démo */ }
  return records;
}

renderReservations(demoReservationsAvecDecisions());
refreshPendingBadges();

/* La semaine du tableau de bord et la date de virement suivent le calendrier réel —
   elles étaient écrites en dur au 27 juillet et allaient périmer. */
(function alignDashboardOnToday(){
  const buttons = document.querySelectorAll('#hostCalendar .host-week button');
  if(buttons.length === 7){
    const now = new Date(); now.setHours(0,0,0,0);
    const monday = new Date(now);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    buttons.forEach((button, i) => {
      const date = new Date(monday.getTime() + i * 86400000);
      const nom = button.querySelector('small');
      const num = button.querySelector('b');
      if(nom) nom.textContent = JOURS[i];
      if(num) num.textContent = pad(date.getDate());
      const passe = date < now;
      button.classList.toggle('past', passe);
      if(passe){
        button.classList.remove('booked','available');
        button.removeAttribute('aria-pressed');
        const etat = button.querySelector('span');
        if(etat) etat.textContent = 'Terminé';
        const detail = button.querySelector('em');
        if(detail) detail.remove();
        button.setAttribute('aria-label', JOURS[i] + ' ' + date.getDate() + ', terminé');
      }
    });
  }
  const prochainMercredi = new Date();
  prochainMercredi.setDate(prochainMercredi.getDate() + ((3 - prochainMercredi.getDay() + 7) % 7 || 7));
  const libelle = capitalize(new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(prochainMercredi));
  document.querySelectorAll('.revenue-kpis article span').forEach(span => {
    if(/^Mercredi \d/.test(span.textContent)) span.textContent = libelle;
  });
})();

/* Les fils de messages et le panneau de notifications reprennent les horaires RÉELS
   des réservations — ils étaient figés à 16:00 quel que soit le planning. */
(function alignConversationsOnRecords(){
  reservationRecords.forEach(record => {
    const thread = hostConversations[record.id];
    if(!thread) return;
    const heure = formatTime(record.start) + ' – ' + formatTime(record.end);
    const jour = record.start.toDateString() === new Date().toDateString()
      ? 'aujourd’hui'
      : record.start.toLocaleDateString('fr-FR', {weekday:'long'});
    if(record.status === 'completed'){ return; }
    thread.meta = 'Réservation ' + jour + ' · ' + formatTime(record.start);
    thread.booking = record.format + ' · ' + heure;
    thread.detail = record.guests + ' voyageurs · ' + statusLabel(record.status).toLowerCase();
  });
  const notif = document.querySelector('#hostNotificationPanel [data-host-view-jump="reservations"] small');
  const martin = reservationRecords.find(record => record.id === 'martin');
  if(notif && martin) notif.textContent = martin.name + ' · ' +
    (martin.start.toDateString() === new Date().toDateString() ? 'aujourd’hui ' : '') + formatTime(martin.start);
})();
setInterval(() => {
  const next = reservationRecords.find(record => record.end > new Date() && !['cancelled','completed'].includes(record.status));
  refreshDashboard(next);
}, 60000);
setHostView(new URLSearchParams(location.search).get('view') || 'dashboard');
})();
