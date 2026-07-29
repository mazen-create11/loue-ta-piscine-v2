(function(){
'use strict';

const HOST_KEY = 'ltp-host-premium';
const GUEST_KEY = 'ltp-guest-premium';
const BOOST_KEY = 'ltp-host-boost-until';
const DAY = 86400000;

function has(key){ return localStorage.getItem(key) === 'true'; }
function boostActive(){ return Number(localStorage.getItem(BOOST_KEY) || 0) > Date.now(); }
function formatBoost(){
  const end = Number(localStorage.getItem(BOOST_KEY) || 0);
  return end > Date.now() ? new Intl.DateTimeFormat('fr-FR', {day:'numeric', month:'short'}).format(end) : '';
}

function subscriptionDate(type){
  const key = type === 'host' ? HOST_KEY : GUEST_KEY;
  const started = Number(localStorage.getItem(key + '-started') || Date.now());
  const delay = type === 'guest' ? 7 : 30;
  return new Intl.DateTimeFormat('fr-FR', {day:'numeric', month:'long', year:'numeric'}).format(started + delay * DAY);
}

function icon(name){
  const paths = {
    spark:'<path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    photo:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m5 18 5-5 3 3 2-2 4 4"/>',
    message:'<path d="M4 5h16v12H9l-5 3z"/><path d="M8 10h8M8 13h5"/>',
    chart:'<path d="M4 20V9M10 20V4M16 20v-7M22 20H2"/>',
    badge:'<path d="m12 3 2.3 2.1 3.1-.2.8 3 2.6 1.7-1.2 2.9 1.2 2.9-2.6 1.7-.8 3-3.1-.2L12 21l-2.3-2.1-3.1.2-.8-3-2.6-1.7 1.2-2.9-1.2-2.9 2.6-1.7.8-3 3.1.2z"/><path d="m9 12 2 2 4-4"/>',
    search:'<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
    heart:'<path d="M20.8 5a5.4 5.4 0 0 0-7.7 0L12 6l-1.1-1a5.4 5.4 0 0 0-7.7 7.7L12 21l8.8-8.3A5.4 5.4 0 0 0 20.8 5Z"/>',
    bell:'<path d="M18 9a6 6 0 0 0-12 0c0 6-3 6-3 8h18c0-2-3-2-3-8M10 21h4"/>'
  };
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[name] + '</svg>';
}

const layer = document.createElement('div');
layer.className = 'maz-premium-layer';
layer.id = 'mazPremiumLayer';
layer.hidden = true;
layer.innerHTML = `
  <button class="maz-premium-backdrop" type="button" data-close-premium aria-label="Fermer"></button>
  <section class="maz-premium-sheet" role="dialog" aria-modal="true" aria-labelledby="premiumTitle">
    <header class="maz-premium-head">
      <div class="maz-premium-identity"><span class="maz-orbit"><i class="maz-mark"></i></span><div><small>MAZ · VOTRE COPILOTE</small><h2 id="premiumTitle">Moins d’hésitation.<br>Plus de maîtrise.</h2></div></div>
      <button type="button" data-close-premium aria-label="Fermer">×</button>
    </header>
    <div class="maz-premium-tabs" role="tablist" aria-label="Choisir un profil">
      <button type="button" role="tab" data-premium-tab="guest">Je réserve</button>
      <button type="button" role="tab" data-premium-tab="host">Je loue mon espace</button>
    </div>
    <div class="maz-premium-body">
      <section data-premium-panel="guest">
        <div class="premium-promise"><small>POUR LES BAIGNEURS</small><h3>Votre raccourci vers la bonne adresse.</h3><p>Maz cherche, compare et garde les détails utiles. La décision reste toujours la vôtre.</p></div>
        <div class="premium-benefits">
          <article>${icon('search')}<b>Recherche personnelle</b><span>Famille, horaires, calme et budget croisés en une réponse.</span></article>
          <article>${icon('heart')}<b>Comparaison claire</b><span>Deux favoris, critères identiques, aucun choix imposé.</span></article>
          <article>${icon('bell')}<b>Suivi utile</b><span>Rappels, météo et informations pratiques au bon moment.</span></article>
        </div>
        <div class="premium-compare-line"><span><small>SANS ABONNEMENT</small><b>Chercher, réserver et écrire aux hôtes</b></span><i>+</i><span><small>AVEC MAZ+</small><b>Recherche personnelle, comparaison et suivi proactif</b></span></div>
        <div class="premium-checkout">
          <div><span>MAZ+</span><strong>4,90 €<small>/ mois</small></strong><p>Sans engagement · annulation en un clic</p></div>
          <button type="button" data-subscribe="guest"><span>Activer Maz+</span><small>Essai découverte de 7 jours</small></button>
        </div>
        <section class="premium-membership" data-premium-membership="guest" hidden>
          <header><span><i></i><b>Maz+ est actif</b><small data-renewal-date="guest"></small></span><strong>4,90 €<small>/ mois</small></strong></header>
          <div><span><b>Formule</b><small>Recherche, comparaison et suivi</small></span><span><b>Engagement</b><small>Aucun · arrêt à tout moment</small></span><span><b>Compte</b><small>Avantages disponibles immédiatement</small></span></div>
          <button type="button" data-cancel-premium="guest">Résilier l’abonnement</button>
        </section>
      </section>
      <section data-premium-panel="host" hidden>
        <div class="premium-promise"><small>POUR LES HÔTES</small><h3>Un assistant pour publier, préparer vos réponses et progresser.</h3><p>Maz prépare le travail. Vous gardez chaque réglage, chaque mot et chaque prix.</p></div>
        <div class="premium-benefits host">
          <article>${icon('photo')}<b>Annonce mieux construite</b><span>Ordre photo, recadrage et texte proposés sans inventer le lieu.</span></article>
          <article>${icon('message')}<b>Réponses préparées</b><span>Messages voyageurs résumés et brouillons prêts à relire.</span></article>
          <article>${icon('chart')}<b>Conseils chaque semaine</b><span>Créneaux, prix et qualité de fiche expliqués avec vos données.</span></article>
          <article>${icon('badge')}<b>Badge Hôte Premium</b><span>Un statut d’abonné distinct du contrôle d’identité.</span></article>
        </div>
        <div class="premium-compare-line"><span><small>SANS ABONNEMENT</small><b>Publier, gérer le calendrier, recevoir et répondre</b></span><i>+</i><span><small>AVEC MAZ HÔTE</small><b>Création assistée, brouillons, conseils et badge d’abonné</b></span></div>
        <div class="premium-checkout">
          <div><span>MAZ HÔTE</span><strong>14,90 €<small>/ mois</small></strong><p>Assistant complet · badge inclus · sans engagement</p></div>
          <button type="button" data-subscribe="host"><span>Passer à Maz Hôte</span><small>Activer les outils avancés</small></button>
        </div>
        <section class="premium-membership" data-premium-membership="host" hidden>
          <header><span><i></i><b>Maz Hôte est actif</b><small data-renewal-date="host"></small></span><strong>14,90 €<small>/ mois</small></strong></header>
          <div><span><b>Annonce</b><small>Outils Maz et badge actifs</small></span><span><b>Réponses</b><small>Brouillons disponibles en messagerie</small></span><span><b>Engagement</b><small>Aucun · arrêt à tout moment</small></span></div>
          <button type="button" data-cancel-premium="host">Résilier l’abonnement</button>
        </section>
        <aside class="premium-boost">
          <div><small>VISIBILITÉ À LA CARTE</small><h4>Mettre une annonce À la une</h4><p>7 jours dans le groupe sponsorisé en tête des résultats. Toujours signalé comme mise en avant payée.</p></div>
          <strong>6,90 €<small>/ annonce</small></strong>
          <button type="button" data-buy-boost>Booster 7 jours</button>
        </aside>
        <p class="premium-ethics"><b>Trois signaux, trois sens.</b> « Vérifié » confirme les contrôles de confiance. « Hôte Premium » indique l’abonnement. « À la une » signale une visibilité achetée.</p>
      </section>
    </div>
  </section>`;
document.body.appendChild(layer);

function refresh(){
  const host = has(HOST_KEY), guest = has(GUEST_KEY), boosted = boostActive();
  document.documentElement.classList.toggle('host-premium-active', host);
  document.documentElement.classList.toggle('guest-premium-active', guest);
  document.documentElement.classList.toggle('host-boost-active', boosted);
  document.querySelectorAll('[data-premium-badge]').forEach(el => el.hidden = !host);
  document.querySelectorAll('[data-boost-badge]').forEach(el => el.hidden = !boosted);
  layer.querySelectorAll('[data-subscribe]').forEach(button => {
    const active = has(button.dataset.subscribe === 'host' ? HOST_KEY : GUEST_KEY);
    button.classList.toggle('active', active);
    button.querySelector('span').textContent = active ? 'Abonnement actif' : button.dataset.subscribe === 'host' ? 'Passer à Maz Hôte' : 'Activer Maz+';
    button.querySelector('small').textContent = active ? 'Gérer mon abonnement' : button.dataset.subscribe === 'host' ? 'Activer les outils avancés' : 'Essai découverte de 7 jours';
  });
  layer.querySelectorAll('[data-premium-membership]').forEach(section => {
    const type = section.dataset.premiumMembership;
    section.hidden = !has(type === 'host' ? HOST_KEY : GUEST_KEY);
    const date = section.querySelector('[data-renewal-date]');
    if(date) date.textContent = (type === 'guest' ? 'Fin de l’essai le ' : 'Prochaine échéance le ') + subscriptionDate(type);
    const cancel = section.querySelector('[data-cancel-premium]');
    cancel.dataset.confirm = '';
    cancel.textContent = 'Résilier l’abonnement';
  });
  const boost = layer.querySelector('[data-buy-boost]');
  boost.classList.toggle('active', boosted);
  boost.textContent = boosted ? 'À la une jusqu’au ' + formatBoost() : 'Booster 7 jours';
  window.dispatchEvent(new CustomEvent('ltp:premium-change', {detail:{host, guest, boosted}}));
}

function selectTab(tab){
  layer.querySelectorAll('[data-premium-tab]').forEach(button => {
    const active = button.dataset.premiumTab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  layer.querySelectorAll('[data-premium-panel]').forEach(panel => panel.hidden = panel.dataset.premiumPanel !== tab);
}

function open(tab){
  selectTab(tab || (document.body.classList.contains('host-app') ? 'host' : 'guest'));
  layer.hidden = false;
  document.body.classList.add('premium-open');
  layer.querySelector('.maz-premium-sheet>header button').focus();
}

function close(){
  layer.hidden = true;
  document.body.classList.remove('premium-open');
}

document.addEventListener('click', event => {
  const opener = event.target.closest('[data-open-premium]');
  if(opener){ event.preventDefault(); open(opener.dataset.openPremium || undefined); return; }
  if(event.target.closest('[data-close-premium]')){ close(); return; }
  const tab = event.target.closest('[data-premium-tab]');
  if(tab){ selectTab(tab.dataset.premiumTab); return; }
  const subscribe = event.target.closest('[data-subscribe]');
  if(subscribe){
    const type = subscribe.dataset.subscribe;
    const key = type === 'host' ? HOST_KEY : GUEST_KEY;
    if(has(key)){
      layer.querySelector(`[data-premium-membership="${type}"]`)?.scrollIntoView({behavior:'smooth', block:'center'});
    } else {
      localStorage.setItem(key, 'true');
      localStorage.setItem(key + '-started', String(Date.now()));
      refresh();
      layer.querySelector(`[data-premium-membership="${type}"]`)?.scrollIntoView({behavior:'smooth', block:'center'});
    }
    return;
  }
  const cancel = event.target.closest('[data-cancel-premium]');
  if(cancel){
    if(cancel.dataset.confirm !== 'yes'){
      cancel.dataset.confirm = 'yes';
      cancel.textContent = 'Confirmer la résiliation';
      return;
    }
    const type = cancel.dataset.cancelPremium;
    localStorage.setItem(type === 'host' ? HOST_KEY : GUEST_KEY, 'false');
    refresh();
    return;
  }
  if(event.target.closest('[data-buy-boost]')){
    localStorage.setItem(BOOST_KEY, String(Date.now() + 7 * DAY));
    refresh();
  }
});

document.addEventListener('keydown', event => { if(event.key === 'Escape' && !layer.hidden) close(); });

window.LTPPremium = {open, close, refresh, isHostPremium:() => has(HOST_KEY), isGuestPremium:() => has(GUEST_KEY), isBoosted:boostActive};
refresh();
})();
