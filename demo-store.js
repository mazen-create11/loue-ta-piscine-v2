/* Persistance de démo + masquage des coordonnées, partagé par espace.js (baigneur) et hote.js (hôte).
   Le masquage est volontairement joué en deux temps : le message part en clair, puis la plateforme
   l'attrape — c'est ce que la commission achète, il faut que ça se voie. */
(function(){
'use strict';

const THREADS_KEY = 'ltp-demo-threads';

const PATTERNS = [
  // e-mails
  /[\w.+-]+@[\w-]+\.[\w.-]{2,}/gi,
  // téléphones FR : 06 12 34 56 78, 0612345678, +33 6 12 34 56 78, 06-12-34-56-78
  /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d\)?[\s.-]?)?\d(?:[\s.-]?\d){8,13}/g,
  // adresses de site et pseudos de messagerie
  /(?:https?:\/\/|www\.)\S+/gi,
  /@[A-Za-z0-9_.]{3,}/g
];

function maskContacts(text){
  let masked = false;
  let out = text;
  PATTERNS.forEach(pattern => {
    out = out.replace(pattern, match => {
      const digits = (match.match(/\d/g) || []).length;
      // on ne masque pas une heure, un prix ou un petit nombre
      if(!match.includes('@') && !/^https?:|^www\./i.test(match) && digits < 9) return match;
      masked = true;
      return '•'.repeat(Math.min(Math.max(match.replace(/\s/g,'').length, 6), 14));
    });
  });
  return { text: out, masked };
}

function readThreads(){
  try { return JSON.parse(localStorage.getItem(THREADS_KEY) || '{}'); }
  catch { return {}; }
}

function writeThreads(all){
  try { localStorage.setItem(THREADS_KEY, JSON.stringify(all)); }
  catch { /* quota plein : la démo continue sans persister */ }
}

/** Messages ajoutés par l'utilisateur pour un fil donné, dans l'ordre d'envoi. */
function loadThread(scope, id){
  const all = readThreads();
  return all[scope + ':' + id] || [];
}

/** direction = 'incoming' | 'outgoing'. Retourne l'entrée [direction, texte, horodatage]. */
function appendMessage(scope, id, direction, text){
  const all = readThreads();
  const key = scope + ':' + id;
  const now = new Date();
  const stamp = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const entry = [direction, text, stamp];
  all[key] = [...(all[key] || []), entry];
  writeThreads(all);
  return entry;
}

function resetThreads(){
  try { localStorage.removeItem(THREADS_KEY); } catch { /* rien à purger */ }
}

/** Joue le masquage sur une bulle déjà affichée : le texte reste lisible 700 ms, puis se fait attraper. */
function playMasking(bubble, paragraph, rawText){
  const result = maskContacts(rawText);
  if(!result.masked) return rawText;
  window.setTimeout(() => {
    paragraph.textContent = result.text;
    bubble.classList.add('masked-hit');
    const badge = document.createElement('em');
    badge.className = 'mask-badge';
    badge.textContent = 'Coordonnées masquées jusqu’au paiement';
    bubble.appendChild(badge);
    window.setTimeout(() => bubble.classList.remove('masked-hit'), 900);
  }, 700);
  return result.text;
}

window.LTPStore = { maskContacts, loadThread, appendMessage, resetThreads, playMasking };
})();
