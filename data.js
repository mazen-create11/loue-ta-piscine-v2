/* Données partagées home + fiche. Grille Micocouliers verrouillée : 8/7/12 · 68 · 105 · 139 · 290. Planchers hôte : 6 €/pers · 40 €/2 h · 90 €/½ j · 120 €/jour. */
(function(){
'use strict';

const listings = [
  {
    id:'micocouliers', type:'piscine', name:'La piscine des Micocouliers', location:'Aix-en-Provence', distance:'12 min',
    image:'assets/famille-bleue-v2.webp',
    gallery:['assets/famille-bleue-v2.webp','assets/bassin-2.webp','assets/famille-jeux-v2.webp','assets/portillon.webp','assets/provencale.webp'],
    rating:'4,93', reviews:41, price:'dès 7\u00A0€', priceNote:'/pers · séance 2 h', day:'290\u00A0€ la journée', capacity:12, dayCap:15, dayHours:'9 h – 19 h',
    badges:['Séance ouverte'], instant:true, availability:'Aujourd’hui 17 h', moments:['nage','apres-midi','anniversaire','soir'],
    facts:['27 °C','10 × 5 m','Douche','Jardin'],
    description:'Piscine de pierre chauffée d’avril à octobre, dans un jardin de lavandes, avec accès indépendant.',
    dims:'10 × 5 m · profondeur 1,20 – 2 m',
    model:'open',
    pricing:{ openWeek:7, openWE:8, openBleue:12, openNight:15, priv:68, privBleue:105, privNight:128, halfDay:139, dayPrice:290 },
    equipment:[['shower','Douche extérieure'],['deck','4 transats + parasol'],['heat','Chauffée avril – octobre'],['wc','Vestiaire & WC dédiés'],['gate','Accès sans passer par la maison'],['fence','Barrière de sécurité normée']],
    extras:[{id:'bbq',lbl:'Barbecue à disposition',sub:'charbon fourni',price:15},{id:'serv',lbl:'Serviettes — lot de 4',sub:'lavées entre chaque séance',price:6},{id:'gouter',lbl:'Goûter maison',sub:'préparé par Claire, 6 pers.',price:18}],
    host:{name:'Claire', initial:'C', response:'~1 h', premium:false, onsite:true, phone:'06 44 71 28 93', address:'12 traverse des Micocouliers, 13100 Aix-en-Provence'},
    visit:{date:'12 mai 2026', points:['Dispositif de sécurité normé (barrière NF P90-306)','Analyse d’eau du mois consultée','Profondeurs affichées au bord de la piscine','Margelles et abords en bon état, non glissants','Douche et rinçage en état de marche','Sanitaires accessibles aux baigneurs','Accès indépendant, sans traversée du logement','Photos conformes à la réalité','Jauge cohérente avec la taille de la piscine','Trousse de premiers secours à proximité','Perche et bouée de sauvetage visibles','Identité de l’hôte vérifiée']},
    rules:['Enfants de moins de 10 ans accompagnés d’un adulte dans l’eau','Musique autorisée à volume raisonnable · volume doux après 22 h','Animaux non admis dans l’espace piscine · règle choisie par l’hôte','Pas de verre autour de la piscine — gobelets fournis','Maillot de bain obligatoire et douche avant baignade · règle choisie par l’hôte','Le portillon reste fermé — jardin partagé avec personne','Créneaux du soir possibles jusqu’à 1 h · départ silencieux demandé'],
    reviewsList:[{text:'Eau à 27°, accès simple et lieu conforme aux photos.',author:'Mélanie — juillet 2026 · séance ouverte'},{text:'Privatisation fluide, et le créneau de l’heure bleue vaut chaque euro.',author:'Karim — juin 2026 · privatisation'},{text:'Les enfants ont adoré les jeux et nous avons vraiment apprécié le coin ombragé.',author:'Sarah — juin 2026 · séance ouverte'},{text:'Très calme le soir. Les consignes après 22 h sont simples et respectueuses du voisinage.',author:'Nassim — mai 2026 · créneau de nuit'},{text:'Claire répond vite et tout était prêt à notre arrivée.',author:'Élodie — mai 2026 · privatisation'}]
  },
  {
    id:'collines', type:'piscine', name:'Le miroir des collines', location:'Cassis', distance:'25 min',
    image:'assets/moderne.webp',
    gallery:['assets/moderne.webp','assets/hero-bleue.webp','assets/margelle.webp'],
    rating:'4,88', reviews:26, price:'34\u00A0€', priceNote:'/h · 2 h minimum', day:'250\u00A0€ la journée', capacity:10, dayCap:10, dayHours:'9 h – 19 h',
    badges:['Privatisé'], instant:false, availability:'Demain 10 h', moments:['nage','apres-midi','soir'],
    facts:['Vue dégagée','Débordement','Transats','Parking'],
    description:'Piscine à débordement, terrasse minérale et vue sur les collines. Toujours privatisée : la piscine est à vous.',
    dims:'12 × 4 m · profondeur 1,40 m',
    model:'private', unit:'2 h', unitPrice:68, unitNote:'34\u00A0€/h · 2 h minimum',
    pricing:{ dayPrice:250 },
    equipment:[['deck','6 transats face à la vue'],['parking','Parking privé 3 places'],['shower','Douche extérieure'],['light','Éclairage de nuit']],
    extras:[{id:'serv',lbl:'Serviettes — lot de 4',sub:'fournies pliées',price:6},{id:'apero',lbl:'Plateau apéritif',sub:'produits locaux, 4 pers.',price:24}],
    host:{name:'Julien', initial:'J', response:'~2 h', premium:false, onsite:false, phone:'06 51 08 42 76', address:'4 chemin du Miroir, 13260 Cassis'},
    visit:{date:'3 juin 2026', points:['Dispositif de sécurité normé','Analyse d’eau du mois consultée','Profondeurs affichées','Abords en bon état','Douche en état de marche','Accès indépendant','Photos conformes','Jauge cohérente','Trousse de premiers secours','Identité de l’hôte vérifiée']},
    rules:['Musique au volume raisonnable','Pas de verre autour de la piscine','Douche avant baignade','Départ à l’heure — rotation 30 min'],
    reviewsList:[{text:'La vue est irréelle, et être seuls change tout.',author:'Sophie — juillet 2026 · privatisation'},{text:'Accueil parfait, piscine impeccable.',author:'Marc — juin 2026 · privatisation'}]
  },
  {
    id:'verger', type:'piscine', name:'La piscine du verger', location:'Pertuis', distance:'18 min',
    image:'assets/famille-jeux-v2.webp',
    gallery:['assets/famille-jeux-v2.webp','assets/familiale.webp','assets/famille-hero-v2.webp'],
    rating:'4,97', reviews:58, price:'dès 6\u00A0€', priceNote:'/pers · séance 2 h', day:'180\u00A0€ la journée', capacity:12, dayCap:12, dayHours:'9 h – 19 h',
    badges:['À la une','Séance ouverte'], instant:true, availability:'Samedi 14 h', moments:['apres-midi','anniversaire'],
    facts:['Jeux d’eau','Pelouse','Coin repas','Douche'],
    description:'Piscine ouverte sur un grand jardin, ombre naturelle et jeux d’eau. Les enfants n’en sortent plus.',
    dims:'8 × 4 m · profondeur 1,10 – 1,60 m',
    model:'open',
    pricing:{ openWeek:6, openWE:7, openBleue:9, priv:58, privBleue:82, halfDay:110, dayPrice:180 },
    equipment:[['deck','Grande pelouse ombragée'],['shower','Douche extérieure'],['wc','WC accessibles'],['fence','Barrière de sécurité normée']],
    extras:[{id:'jeux',lbl:'Malle de jeux d’eau',sub:'brassards, frites, ballons',price:5},{id:'serv',lbl:'Serviettes — lot de 4',sub:'lavées entre chaque séance',price:6}],
    host:{name:'Nadia', initial:'N', response:'~45 min', premium:true, onsite:true, phone:'07 68 24 91 35', address:'18 rue du Verger, 84120 Pertuis'},
    visit:{date:'28 mai 2026', points:['Dispositif de sécurité normé','Analyse d’eau consultée','Profondeurs affichées','Abords non glissants','Douche en état de marche','Sanitaires accessibles','Accès indépendant','Photos conformes','Jauge cohérente','Premiers secours à proximité','Perche et bouée visibles','Identité de l’hôte vérifiée']},
    rules:['Enfants accompagnés d’un adulte dans l’eau','Pas d’animaux','Pique-nique autorisé au coin repas','Douche avant baignade'],
    reviewsList:[{text:'Anniversaire des 8 ans réussi — les jeux d’eau font tout.',author:'Laura — juillet 2026 · séance ouverte'},{text:'Nadia est adorable, on reviendra.',author:'Hugo — juin 2026 · séance ouverte'}]
  },
  {
    id:'margelles', type:'piscine', name:'Les margelles blondes', location:'Lourmarin', distance:'30 min',
    image:'assets/margelle.webp',
    gallery:['assets/margelle.webp','assets/hero-bleue.webp','assets/provencale.webp'],
    rating:'4,91', reviews:33, price:'12\u00A0€', priceNote:'/pers · créneau du soir', day:'220\u00A0€ la journée', capacity:8, dayCap:8, dayHours:'10 h – 20 h',
    badges:['Heure bleue'], instant:true, availability:'Ce soir 19 h', moments:['soir','nage'],
    facts:['Éclairage','Vue jardin','Transats','Douche'],
    description:'Margelles en travertin, eau sombre et éclairage doux au crépuscule. Le créneau du soir est le plus demandé.',
    dims:'9 × 4 m · profondeur 1,30 – 1,80 m',
    model:'open',
    pricing:{ openWeek:8, openWE:9, openBleue:12, openNight:15, priv:72, privBleue:98, privNight:120, halfDay:120, dayPrice:220 },
    equipment:[['light','Éclairage du bassin'],['deck','4 transats'],['shower','Douche extérieure'],['gate','Accès par le jardin']],
    extras:[{id:'serv',lbl:'Serviettes — lot de 4',sub:'fournies pliées',price:6},{id:'lanterne',lbl:'Lanternes & plaids',sub:'pour prolonger la soirée',price:9}],
    host:{name:'Paul', initial:'P', response:'~3 h', premium:false, onsite:false, phone:'06 32 87 15 60', address:'7 impasse des Margelles, 84160 Lourmarin'},
    visit:{date:'19 juin 2026', points:['Dispositif de sécurité normé','Analyse d’eau consultée','Profondeurs affichées','Abords en bon état','Éclairage vérifié','Accès indépendant','Photos conformes','Jauge cohérente','Premiers secours à proximité','Identité de l’hôte vérifiée']},
    rules:['Musique jusqu’à 21 h','Pas de verre autour de la piscine','Départ à l’heure — rotation 30 min'],
    reviewsList:[{text:'Nager à la tombée du jour, lumière incroyable.',author:'Inès — juillet 2026 · heure bleue'},{text:'Le cadre vaut le déplacement depuis Aix.',author:'Théo — juin 2026 · séance ouverte'}]
  },
  {
    id:'oliviers', type:'jacuzzi', name:'Le jacuzzi des Oliviers', location:'Marseille 4ᵉ', distance:'8 min',
    image:'assets/jacuzzi-convivial-v3.webp',
    gallery:['assets/jacuzzi-convivial-v3.webp','assets/jacuzzi-terrasse-v2.webp','assets/spa.webp'],
    rating:'4,85', reviews:19, price:'25\u00A0€', priceNote:'/h · privatisé', day:'160\u00A0€ la journée', capacity:4, dayCap:4, dayHours:'10 h – 20 h',
    badges:['Privatisé'], instant:true, availability:'Ce soir 20 h', moments:['soir','apres-midi'],
    facts:['38 °C','4 places','Peignoirs','Jardin'],
    description:'Jacuzzi extérieur, jardin calme et lumière douce à la tombée du jour. Toujours privatisé, jamais partagé.',
    dims:'4 places · 38 °C toute l’année',
    model:'private', unit:'1 h', unitPrice:25, unitNote:'25\u00A0€/h · privatisé',
    pricing:{ dayPrice:160 },
    equipment:[['robe','Peignoirs & chaussons'],['heat','38 °C toute l’année'],['light','Jardin éclairé le soir'],['shower','Douche attenante']],
    extras:[{id:'serv',lbl:'Serviettes chaudes',sub:'2 par personne',price:4},{id:'tisane',lbl:'Tisanes & thé glacé',sub:'à volonté',price:5}],
    host:{name:'Sonia', initial:'S', response:'~1 h', premium:false, onsite:false, phone:'07 45 63 20 18', address:'22 avenue des Oliviers, 13100 Aix-en-Provence'},
    visit:{date:'7 juin 2026', points:['Carnet sanitaire à jour','Température contrôlée','Traitement de l’eau vérifié','Douche en état de marche','Accès indépendant','Photos conformes','Identité de l’hôte vérifiée']},
    rules:['Douche savonnée obligatoire avant l’eau','Pas de verre dans le jacuzzi','2 h maximum recommandées à 38 °C','Déconseillé aux moins de 12 ans'],
    reviewsList:[{text:'Parenthèse parfaite après le travail, à 8 minutes de chez nous.',author:'Camille — juillet 2026'},{text:'Propre, chaud, calme. Rien à redire.',author:'Yanis — juin 2026'}]
  },
  {
    id:'bastide', type:'sauna', name:'Le sauna de la bastide', location:'Aix-en-Provence', distance:'15 min',
    image:'assets/sauna-jardin-v3.webp',
    gallery:['assets/sauna-jardin-v3.webp','assets/sauna-jardin-v2.webp','assets/sauna.webp'],
    rating:'4,94', reviews:31, price:'18\u00A0€', priceNote:'/h · privatisé', day:'120\u00A0€ la journée', capacity:6, dayCap:6, dayHours:'9 h – 21 h',
    badges:['Paiement sur place'], instant:true, availability:'Dimanche 9 h', moments:['soir','apres-midi'],
    facts:['Cèdre','80 °C','Douche froide','Jardin'],
    description:'Sauna en cèdre ouvert sur un jardin, douche extérieure et vestiaire. Séance privée, serviettes fournies.',
    dims:'6 places · 70 à 90 °C',
    model:'private', unit:'1 h', unitPrice:18, unitNote:'18\u00A0€/h · privatisé',
    pricing:{ dayPrice:120 },
    equipment:[['heat','Poêle à pierres 70–90 °C'],['shower','Douche froide extérieure'],['wc','Vestiaire dédié'],['robe','Serviettes fournies']],
    extras:[{id:'huiles',lbl:'Huiles essentielles',sub:'eucalyptus ou pin',price:3},{id:'tisane',lbl:'Tisanes après séance',sub:'servies au jardin',price:5}],
    host:{name:'Marc', initial:'M', response:'~2 h', premium:true, onsite:true, phone:'06 74 39 58 02', address:'3 montée de la Bastide, 13510 Éguilles'},
    visit:{date:'15 juin 2026', points:['Poêle et température contrôlés','Consignes de sécurité affichées','Douche en état de marche','Vestiaire propre','Accès indépendant','Photos conformes','Identité de l’hôte vérifiée']},
    rules:['Séance sur serviette obligatoire','Hydratation : eau à disposition','15 min maximum par passage recommandées','Déconseillé aux moins de 16 ans'],
    reviewsList:[{text:'Un vrai sauna de jardin, comme dans le Nord. Rare ici.',author:'Elsa — juin 2026'},{text:'Marc explique tout, séance parfaite.',author:'Romain — mai 2026'}]
  }
];

function hash(str){ let h = 0; for(let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }
function euro(n){ return n.toFixed(2).replace('.', ',').replace(',00','') + '\u00A0€'; }

const DOW = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

/* Planning déterministe sur 14 jours à partir d'aujourd'hui — la démo ne périme jamais. */
function makeSchedule(listing){
  const seed = hash(listing.id);
  const today = new Date();
  const days = [];
  for(let i = 0; i < 14; i++){
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const dow = date.getDay();
    const we = dow === 0 || dow === 6;
    const slots = listing.model === 'open' ? openSlots(listing, seed, i, we) : privateSlots(listing, seed, i);
    const iso = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    days.push({ lbl:[DOW[dow], String(date.getDate())], month:MONTHS[date.getMonth()], we, iso, slots });
  }
  return days;
}

/* Jours 3 et 6 : toujours entièrement libres. Sans cette garantie, la première semaine saturait
   et les formats journée (290 €) et demi-journée (139 €) menaient à sept pastilles « réservé ». */
const FULLY_FREE = (i) => i === 3 || i === 6;

function openSlots(listing, seed, i, we){
  const p = listing.pricing;
  const pp = we ? p.openWE : p.openWeek;
  const cap = listing.capacity;
  const mix = (k) => (seed + i * 13 + k * 7) % 17;
  /* Les réservations s'amincissent avec la distance : jours proches chargés, semaine 2 presque libre. */
  const booked = (k, c) => {
    if(FULLY_FREE(i)) return 0;
    const m = mix(k);
    if(i >= 7) return m % 5 === 0 ? 1 + m % 3 : 0;
    return m > 12 ? c : m % Math.max(1, c - 2);
  };
  const s = (t, k, c, price, priv) => ({ t, regime:'open', cap:c, booked:Math.min(c, booked(k, c)), priceP:price, pricePriv:priv });
  const BUF = { buffer:true };
  const dayTaken = i < 7 && !FULLY_FREE(i) && mix(20) === 4;
  if(dayTaken) return [ s('9 h – 11 h', 1, cap, pp, p.priv), s('11 h – 13 h', 2, cap, pp, p.priv), BUF, { t:'14 h – 21 h · journée privée', regime:'priv' } ];
  const afternoon = i < 7 && !FULLY_FREE(i) && mix(21) === 2 ? { t:'13 h 30 – 16 h 30 · demi-journée', regime:'priv' } : s('14 h – 16 h', 3, cap, pp, p.priv);
  const out = [ s('9 h – 11 h', 1, cap, pp, p.priv), BUF, s('11 h 30 – 13 h 30', 2, cap, pp, p.priv), BUF, afternoon, BUF, s('17 h – 19 h', 4, cap, pp, p.priv) ];
  if(p.openBleue) out.push(BUF, { ...s('19 h 30 – 21 h 30', 5, Math.max(4, cap - 2), p.openBleue, p.privBleue), bleue:true });
  if(p.openNight) out.push(BUF, { ...s('22 h – 1 h', 6, Math.max(4, cap - 4), p.openNight, p.privNight), night:true });
  return out;
}

function privateSlots(listing, seed, i){
  const two = listing.unit === '2 h';
  const times = two ? ['10 h – 12 h','14 h – 16 h','17 h – 19 h'] : ['10 h – 11 h','11 h – 12 h','17 h – 18 h','18 h – 19 h','19 h – 20 h','20 h – 21 h'];
  const out = [];
  times.forEach((t, k) => {
    const taken = i < 7 && !FULLY_FREE(i) && (seed + i * 11 + k * 5) % 7 === 3;
    out.push(taken ? { t, regime:'priv' } : { t, regime:'unit', price:listing.unitPrice, cap:listing.capacity });
    if(k < times.length - 1 && (two || k === (times.length / 2 | 0) - 1)) out.push({ buffer:true });
  });
  return out;
}

window.LTP = { listings, makeSchedule, euro, hash };
})();
