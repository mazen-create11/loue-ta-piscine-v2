(function(){
'use strict';

const toast = document.getElementById('spaceToast');
const allowedViews = ['favoris','messages','reservations','account'];
const messageModal = document.getElementById('messageModal');
let activeConversation = 'claire';

function showToast(message){
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function setView(view, updateUrl){
  if(!allowedViews.includes(view)) view = 'favoris';
  document.querySelectorAll('[data-space-panel]').forEach(panel => { panel.hidden = panel.dataset.spacePanel !== view; });
  document.querySelectorAll('[data-space-view]').forEach(item => {
    const active = item.dataset.spaceView === view;
    item.classList.toggle('active', active);
    if(active) item.setAttribute('aria-current','page');
    else item.removeAttribute('aria-current');
  });
  if(updateUrl){
    history.replaceState(null, '', 'espace.html?view=' + view);
    document.querySelector(`[data-space-panel="${view}"]`).scrollIntoView({behavior:'smooth', block:'start'});
  }
  const titles = {messages:'Messages',reservations:'Réservations',favoris:'Favoris',account:'Mon compte'};
  document.title = titles[view] + ' — Loue ta piscine';
}

function fillAccountForm(data){
  const form = document.getElementById('travelerAccountForm');
  if(!form || !data) return;
  const merged = {...data.profile, ...data.preferences, ...data.notifications};
  Object.entries(merged).forEach(([name,value]) => {
    const field = form.elements.namedItem(name);
    if(!field) return;
    if(field.type === 'checkbox') field.checked = Boolean(value);
    else if(value !== null && value !== undefined) field.value = value;
  });
  const displayName = String(data.profile?.full_name || 'Julie').trim().split(/\s+/)[0];
  document.querySelectorAll('[data-account-name]').forEach(item => { item.textContent = displayName; });
}

async function loadAccount(){
  if(!window.LTPBackend) return;
  try { fillAccountForm(await window.LTPBackend.loadAccount('traveler')); }
  catch(error){ showToast(error.message || 'Compte momentanément indisponible'); }
}

/* Les favoris et le comparateur sont TOUJOURS rendus depuis data.js : une seule source de vérité,
   sinon une carte peut annoncer une piscine et ouvrir un sauna. Sans favori enregistré, on part
   d'une sélection par défaut plutôt que d'une grille vide. */
const FAVORIS_PAR_DEFAUT = ['micocouliers','verger','margelles'];

function favorisChoisis(){
  const listings = window.LTP?.listings || [];
  const brut = localStorage.getItem('ltp-v2-favorites');
  // null = jamais touché → sélection de démonstration ; '[]' = vidé volontairement → collection vide
  if(brut === null) return FAVORIS_PAR_DEFAUT.map(id => listings.find(item => item.id === id)).filter(Boolean);
  let ids = [];
  try { ids = JSON.parse(brut || '[]'); }
  catch { ids = []; }
  return ids.map(id => listings.find(item => item.id === id)).filter(Boolean);
}

/* Nom court pour les puces et le tableau : article retiré (les plus longs d'abord, sinon
   « Les margelles » perd son « Le » et donne « s margelles ») puis initiale remise en majuscule. */
function nomCourt(nom){
  const sansArticle = nom.replace(/^(Les|L’|La|Le)\s*/i, '');
  return sansArticle.charAt(0).toUpperCase() + sansArticle.slice(1);
}

/* Les puces du comparateur suivent les favoris affichés : comparer une annonce absente de la
   collection n'a pas de sens, et les libellés en dur finissaient par mentir. */
function renderComparePools(chosen){
  const pools = document.querySelector('.compare-pools');
  const section = document.querySelector('.mia-compare');
  if(!pools) return;
  if(section) section.hidden = chosen.length < 2;
  pools.replaceChildren();
  chosen.slice(0, 4).forEach((listing, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.comparePool = listing.id;
    const active = index < 2;
    button.className = active ? 'active' : '';
    button.setAttribute('aria-pressed', String(active));
    button.textContent = nomCourt(listing.name);
    pools.appendChild(button);
  });
  const result = document.getElementById('compareResult');
  if(result) result.hidden = true;
}

/* Une ligne de comparaison construite depuis l'annonce réelle — plus de valeurs recopiées à la main. */
function compareRow(listing){
  const p = listing.pricing || {};
  const perPerson = p.openWeek || p.openWE;
  const total = perPerson ? (perPerson * 4) + ' €'
    : (listing.unitPrice ? listing.unitPrice + ' €' : (p.dayPrice ? p.dayPrice + ' €' : '—'));
  const kidFacts = (listing.equipment || []).map(pair => pair[1]).filter(label => /jeu|ombre|pelouse|jardin|barrière|douche/i.test(label));
  return {
    name: nomCourt(listing.name),
    total,
    travel: listing.distance,
    format: listing.model === 'open' ? 'Ouverte ou privée' : 'Toujours privée',
    kids: kidFacts.slice(0, 2).join(' + ') || (listing.facts || []).slice(0, 2).join(' + '),
    next: listing.availability
  };
}

function renderFavorites(){
  const grid = document.querySelector('.favorite-grid');
  const listings = window.LTP?.listings;
  if(!grid || !listings) return;
  const chosen = favorisChoisis();

  const words = ['Aucun lieu','Un lieu','Deux lieux','Trois lieux','Quatre lieux','Cinq lieux','Six lieux'];
  const count = words[chosen.length] || (chosen.length + ' lieux');
  const intro = document.querySelector('[data-favorite-count]');
  if(intro) intro.textContent = chosen.length
    ? count + (chosen.length > 1 ? ' qui donnent' : ' qui donne') + ' déjà envie de préparer le sac.'
    : 'Aucun favori pour l’instant — le cœur sur une annonce la range ici.';
  document.querySelectorAll('[data-space-view="favoris"] i').forEach(badge => { badge.textContent = String(chosen.length); });
  renderComparePools(chosen);

  grid.replaceChildren();
  if(!chosen.length){
    const empty = document.createElement('p');
    empty.className = 'favorite-empty';
    empty.textContent = 'Votre collection est vide. Parcourez les annonces et touchez le cœur pour en garder une de côté.';
    grid.appendChild(empty);
    return;
  }
  chosen.forEach(listing => {
    const card = document.createElement('article');
    card.className = 'favorite-place';
    card.dataset.favoriteCard = listing.id;

    const photo = document.createElement('div');
    photo.className = 'favorite-place-photo';
    const image = document.createElement('img');
    image.src = listing.image;
    image.alt = listing.name;
    image.width = 768; image.height = 512; image.loading = 'lazy';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.setAttribute('data-remove-favorite','');
    remove.setAttribute('aria-label','Retirer des favoris');
    remove.setAttribute('aria-pressed','true');
    remove.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>';
    const distance = document.createElement('span');
    distance.textContent = 'À ' + listing.distance;
    const badges = document.createElement('div');
    badges.className = 'favorite-badges';
    (listing.badges || []).forEach(label => {
      const badge = document.createElement('b');
      badge.textContent = label;
      badges.appendChild(badge);
    });
    photo.append(image, remove, distance, badges);

    const copy = document.createElement('div');
    copy.className = 'favorite-place-copy';
    const city = document.createElement('small');
    city.textContent = listing.location;
    const title = document.createElement('h2');
    title.textContent = listing.name;
    const summary = document.createElement('p');
    summary.textContent = (listing.facts || []).slice(0,3).join(' · ');
    const footer = document.createElement('div');
    const price = document.createElement('b');
    price.className = 'num';
    price.textContent = listing.price;
    const unit = document.createElement('small');
    unit.textContent = listing.priceNote || '';
    price.appendChild(unit);
    const link = document.createElement('a');
    link.href = 'fiche.html?id=' + listing.id;
    link.textContent = 'Voir les créneaux';
    footer.append(price, link);
    copy.append(city, title, summary, footer);

    card.append(photo, copy);
    grid.appendChild(card);
  });
}

const conversations = {
  claire:{initial:'CL', name:'Claire', meta:'Hôte vérifiée · répond en 8 min', listing:'fiche.html?id=micocouliers', placeholder:'Écrire à Claire…', context:true, messages:[
    ['incoming','Bonjour Julie, tout est prêt pour dimanche. Vous pourrez vous garer juste devant le portail vert.','11:36'],
    ['outgoing','Super merci ! Les enfants peuvent apporter leurs brassards ?','11:39 · Lu'],
    ['incoming','Oui bien sûr. Le portillon sera ouvert à 15 h 50 et j’ai aussi quelques jeux d’eau sur place.','11:42']
  ]},
  lucas:{initial:'SO', name:'Sonia', meta:'Hôte vérifiée · répond en ~1 h', listing:'fiche.html?id=oliviers', placeholder:'Écrire à Sonia…', context:false, messages:[['incoming','Bonjour Julie, les serviettes sont bien comprises avec le jacuzzi.','Hier · 18:06']]},
  support:{initial:'L', name:'Équipe Loue ta piscine', meta:'L’équipe · 7 j/7', listing:'', placeholder:'Écrire à l’équipe…', context:false, messages:[['incoming','Bienvenue chez Loue ta piscine 👋 Nous restons disponibles si vous avez besoin de nous. Pour préparer une réponse ou retrouver une information, Maz peut vous aider à tout moment.','24 juillet']]},
  mia:{initial:'m', name:'Maz', meta:'Votre assistant · disponible 24 h/24', listing:'', placeholder:'Demander à Maz…', context:false, messages:[['incoming','Hello, moi c’est Maz. Je peux résumer une conversation, préparer une réponse ou retrouver une information sur votre réservation.','À l’instant']]}
};

function openConversation(id){
  const data = conversations[id] || conversations.claire;
  activeConversation = id in conversations ? id : 'claire';
  document.querySelectorAll('[data-conversation]').forEach(item => item.classList.toggle('active', item.dataset.conversation === id));
  const conversationInitial = document.getElementById('conversationInitial');
  conversationInitial.classList.toggle('maz-mark', id === 'mia');
  conversationInitial.firstChild.textContent = id === 'mia' ? '' : data.initial;
  document.getElementById('conversationName').textContent = data.name;
  document.getElementById('conversationMeta').textContent = data.meta;
  const listing = document.getElementById('conversationListing');
  listing.hidden = !data.listing;
  if(data.listing) listing.href = data.listing;
  document.getElementById('bookingContext').hidden = !data.context;
  document.getElementById('conversationMazCompose').hidden = activeConversation === 'mia';
  document.getElementById('messageInput').placeholder = data.placeholder;
  const thread = document.getElementById('messageThread');
  thread.replaceChildren();
  const day = document.createElement('time');
  const perso = window.LTPStore?.loadThread('guest', activeConversation) || [];
  day.textContent = (!perso.length && data.messages.every(m => String(m[2]).includes('Hier'))) ? 'Hier' : 'Aujourd’hui';
  thread.appendChild(day);
  [...data.messages, ...(window.LTPStore?.loadThread('guest', activeConversation) || [])].forEach(message => {
    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + message[0];
    const paragraph = document.createElement('p');
    paragraph.textContent = message[1];
    const stamp = document.createElement('small');
    stamp.textContent = message[2];
    bubble.append(paragraph, stamp);
    thread.appendChild(bubble);
  });
  messageModal.hidden = false;
  document.body.classList.add('conversation-open');
  setTimeout(() => document.getElementById('messageInput').focus(), 80);
}

function closeConversation(){
  messageModal.hidden = true;
  document.body.classList.remove('conversation-open');
}

document.addEventListener('click', event => {
  const view = event.target.closest('[data-space-view]');
  if(view){ setView(view.dataset.spaceView, true); return; }

  const notice = event.target.closest('[data-space-toast]');
  if(notice){ showToast(notice.dataset.spaceToast); return; }

  const favorite = event.target.closest('[data-remove-favorite]');
  if(favorite){
    const card = favorite.closest('[data-favorite-card]');
    const removed = card.classList.toggle('removed');
    favorite.setAttribute('aria-pressed', String(!removed));
    // on repart de ce qui est RÉELLEMENT affiché : sinon le premier retrait, parti d'une liste
    // vide, effaçait toutes les autres cartes au rechargement suivant
    const visibles = [...document.querySelectorAll('[data-favorite-card]')]
      .filter(item => !item.classList.contains('removed'))
      .map(item => item.dataset.favoriteCard);
    try { localStorage.setItem('ltp-v2-favorites', JSON.stringify(visibles)); }
    catch { /* la démo continue même sans stockage */ }
    const restants = visibles.map(id => (window.LTP?.listings || []).find(l => l.id === id)).filter(Boolean);
    renderComparePools(restants);
    document.querySelectorAll('[data-space-view="favoris"] i').forEach(badge => { badge.textContent = String(restants.length); });
    const mots = ['Aucun lieu','Un lieu','Deux lieux','Trois lieux','Quatre lieux','Cinq lieux','Six lieux'];
    const intro = document.querySelector('[data-favorite-count]');
    if(intro) intro.textContent = restants.length
      ? (mots[restants.length] || restants.length + ' lieux') + (restants.length > 1 ? ' qui donnent' : ' qui donne') + ' déjà envie de préparer le sac.'
      : 'Aucun favori pour l’instant — le cœur sur une annonce la range ici.';
    showToast(removed ? 'Retiré des favoris · annuler en rappuyant' : 'Ajouté aux favoris');
    return;
  }

  const conversation = event.target.closest('[data-conversation]');
  if(conversation){
    openConversation(conversation.dataset.conversation);
    return;
  }

  if(event.target.closest('[data-close-conversation]')){ closeConversation(); return; }

  const mazCompose = event.target.closest('[data-maz-compose]');
  if(mazCompose){
    if(!window.LTPPremium?.isGuestPremium()){
      window.LTPPremium?.open('guest');
      return;
    }
    const drafts = {
      claire:'Merci Claire. Parfait pour le portillon et les jeux d’eau. Nous apporterons les brassards des enfants et arriverons quelques minutes avant 16 h.',
      lucas:'Merci Lucas pour la confirmation. Parfait pour les serviettes, nous arriverons à l’heure indiquée.',
      support:'Merci pour votre message. Pouvez-vous me confirmer la prochaine étape à suivre pour ma réservation ?'
    };
    const input = document.getElementById('messageInput');
    mazCompose.disabled = true;
    mazCompose.textContent = 'Préparation…';
    window.setTimeout(() => {
      input.value = drafts[activeConversation] || 'Merci pour votre message. Pouvez-vous me confirmer les informations utiles avant notre arrivée ?';
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      mazCompose.disabled = false;
      mazCompose.textContent = 'Reformuler';
      showToast('Brouillon préparé · relisez-le avant de l’envoyer');
    }, 420);
    return;
  }

  const pool = event.target.closest('[data-compare-pool]');
  if(pool){
    const selected = [...document.querySelectorAll('[data-compare-pool].active')];
    if(!pool.classList.contains('active') && selected.length >= 2){ showToast('Choisissez deux favoris maximum'); return; }
    pool.classList.toggle('active');
    pool.setAttribute('aria-pressed', String(pool.classList.contains('active')));
    document.getElementById('compareResult').hidden = true;
    return;
  }

  const priority = event.target.closest('[data-compare-priority]');
  if(priority){
    document.querySelectorAll('[data-compare-priority]').forEach(item => {
      const active = item === priority;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    document.getElementById('compareResult').hidden = true;
  }
});

document.getElementById('runCompare').addEventListener('click', () => {
  if(!window.LTPPremium?.isGuestPremium()){
    window.LTPPremium?.open('guest');
    return;
  }
  const pools = [...document.querySelectorAll('[data-compare-pool].active')].map(item => item.dataset.comparePool);
  if(pools.length !== 2){ showToast('Sélectionnez exactement deux favoris'); return; }
  const priority = document.querySelector('[data-compare-priority].active').dataset.comparePriority;
  const poolData = Object.fromEntries((window.LTP?.listings || []).map(l => [l.id, compareRow(l)]));
  const insights = {
    family:'Pour une famille, regardez d’abord la ligne « enfants » puis le trajet.',
    price:'Le total est calculé ici pour 4 personnes, frais affichés inclus.',
    near:'Le trajet départage clairement les lieux sans masquer le prix total.',
    calm:'La privatisation et l’environnement vous donnent le meilleur repère de calme.'
  };
  const first = poolData[pools[0]], second = poolData[pools[1]];
  const rows = [
    ['Total · 4 pers.',first.total,second.total,'price'],
    ['Trajet',first.travel,second.travel,'near'],
    ['Format',first.format,second.format,'calm'],
    ['Enfants',first.kids,second.kids,'family'],
    ['Prochain créneau',first.next,second.next,'']
  ];
  const result = document.getElementById('compareResult');
  result.innerHTML = '<div class="compare-table" role="table" aria-label="Comparaison de ' + first.name + ' et ' + second.name + '"><div class="compare-table-head" role="row"><span></span><b role="columnheader">' + first.name + '</b><b role="columnheader">' + second.name + '</b></div>' + rows.map(row => '<div class="compare-table-row' + (row[3] === priority ? ' focus' : '') + '" role="row"><span role="rowheader">' + row[0] + '</span><strong role="cell">' + row[1] + '</strong><strong role="cell">' + row[2] + '</strong></div>').join('') + '</div><p class="compare-insight"><i class="maz-mark" aria-hidden="true"></i><span><b>Le regard de Maz</b>' + insights[priority] + ' Vous gardez le dernier mot.</span></p>';
  result.hidden = false;
});

document.getElementById('messageComposer').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  if(!message){ input.focus(); return; }
  const bubble = document.createElement('div');
  bubble.className = 'bubble outgoing';
  const text = document.createElement('p');
  text.textContent = message;
  const time = document.createElement('small');
  time.textContent = 'À l’instant · Envoyé';
  bubble.append(text, time);
  document.getElementById('messageThread').appendChild(bubble);
  bubble.scrollIntoView({behavior:'smooth', block:'nearest'});
  input.value = '';
  const confirmee = Boolean(conversations[activeConversation]?.context);
  const stored = confirmee ? message : (window.LTPStore?.playMasking(bubble, text, message) ?? message);
  if(stored !== message) showToast('Coordonnées masquées jusqu’au paiement');
  window.LTPStore?.appendMessage('guest', activeConversation, 'outgoing', stored);
});

document.getElementById('messageAttach').addEventListener('click', () => document.getElementById('messageFile').click());
document.getElementById('messageFile').addEventListener('change', event => {
  const files = [...event.target.files];
  if(!files.length) return;
  files.forEach(file => {
    const attachment = document.createElement('figure');
    attachment.className = 'message-attachment';
    if(file.type.startsWith('image/')){
      const image = document.createElement('img');
      image.src = URL.createObjectURL(file);
      image.alt = file.name;
      image.addEventListener('load', () => URL.revokeObjectURL(image.src), {once:true});
      attachment.appendChild(image);
    } else if(file.type.startsWith('video/')){
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.controls = true;
      video.preload = 'metadata';
      attachment.appendChild(video);
    } else {
      const icon = document.createElement('span');
      icon.textContent = 'DOC';
      attachment.appendChild(icon);
    }
    const caption = document.createElement('figcaption');
    caption.textContent = file.name;
    attachment.appendChild(caption);
    document.getElementById('messageThread').appendChild(attachment);
  });
  document.getElementById('messageThread').lastElementChild.scrollIntoView({behavior:'smooth', block:'nearest'});
  showToast(files.length + ' média' + (files.length > 1 ? 's' : '') + ' ajouté' + (files.length > 1 ? 's' : ''));
  event.target.value = '';
});

document.addEventListener('keydown', event => { if(event.key === 'Escape' && !messageModal.hidden) closeConversation(); });

document.getElementById('travelerAccountForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  ['quiet_preference','accessible','booking_notifications','message_notifications','marketing_notifications'].forEach(name => { values[name] = form.elements[name].checked; });
  button.disabled = true;
  button.textContent = 'Enregistrement…';
  try {
    if(window.LTPBackend) await window.LTPBackend.saveAccount('traveler', values);
    const prenom = String(values.full_name || 'Julie').trim().split(/\s+/)[0];
    document.querySelectorAll('[data-account-name]').forEach(item => { item.textContent = prenom; });
    showToast('Réglages enregistrés');
  } catch(error){ showToast(error.message || 'Impossible d’enregistrer'); }
  finally { button.disabled = false; button.textContent = 'Enregistrer les modifications'; }
});

document.addEventListener('click', event => {
  const action = event.target.closest('[data-account-action]');
  if(!action) return;
  if(action.dataset.accountAction === 'export'){
    const form = document.getElementById('travelerAccountForm');
    // export lisible : cases à cocher en vrai/faux explicites, jamais « on » ni d'absence muette
    const payload = Object.fromEntries(new FormData(form));
    ['quiet_preference','accessible','booking_notifications','message_notifications','marketing_notifications'].forEach(name => {
      if(form.elements[name]) payload[name] = form.elements[name].checked;
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    link.download = 'mes-donnees-loue-ta-piscine.json';
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Vos données ont été téléchargées');
    return;
  }
  if(action.dataset.accountAction === 'password'){
    const email = document.getElementById('travelerAccountForm')?.elements.email?.value;
    Promise.resolve(window.LTPBackend?.requestPasswordReset(email)).then(result => {
      if(result) showToast('E-mail sécurisé de réinitialisation envoyé');
    }).catch(error => showToast(error.message || 'Réinitialisation indisponible'));
  }
});

window.addEventListener('ltp:backend-ready', loadAccount);
setTimeout(loadAccount, 0);

/* Les réservations réellement passées (clé ltp-bookings, écrite par la confirmation)
   remplacent le ticket de démonstration : la promesse de synchronisation devient vraie. */
function renderBookings(){
  const list = document.getElementById('reservationList');
  const demo = document.querySelector('[data-demo-ticket]');
  if(!list) return;
  let bookings = [];
  try { bookings = JSON.parse(localStorage.getItem('ltp-bookings') || '[]'); }
  catch { bookings = []; }
  if(demo) demo.hidden = bookings.length > 0;
  list.replaceChildren();
  bookings.forEach(entry => {
    const ticket = document.createElement('article');
    ticket.className = 'reservation-ticket';
    const copy = document.createElement('div');
    const etat = document.createElement('small');
    etat.textContent = (entry.onsite ? 'À RÉGLER SUR PLACE · ' : 'CONFIRMÉE · ') + String(entry.date).toUpperCase();
    const titre = document.createElement('h2');
    titre.textContent = entry.name;
    const detail = document.createElement('p');
    const qui = /journée|privat/.test(entry.mode || '') ? 'participants' : 'baigneurs';
    detail.textContent = entry.time + ' · ' + entry.persons + ' ' + qui + ' · ' + entry.location + ' · ' + entry.total + ' €';
    copy.append(etat, titre, detail);
    const photo = document.createElement('img');
    photo.src = entry.image;
    photo.alt = entry.name;
    photo.loading = 'lazy';
    const lien = document.createElement('a');
    lien.href = 'fiche.html?id=' + entry.id;
    lien.textContent = 'Voir ma réservation';
    ticket.append(copy, photo, lien);
    list.appendChild(ticket);
  });
}

renderBookings();
renderFavorites();

const initialView = new URLSearchParams(location.search).get('view') || 'favoris';
setView(initialView, false);
})();
