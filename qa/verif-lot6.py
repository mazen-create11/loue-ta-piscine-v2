"""Lot 6 : systématisation états + motion + ergonomie mobile."""
from playwright.sync_api import sync_playwright
import os, sys

BASE = os.environ.get("LTP_BASE", "http://127.0.0.1:4196")
res, errs = [], []
def check(n, ok, d=""):
    res.append(ok); print(("  OK  " if ok else " FAIL ") + n + ((" — " + d) if d else ""))

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    # ── MOTION : reveals fiche + espace, transition de vues, pop du cœur ──
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("motion: "+str(e)))
    page.goto(f"{BASE}/fiche.html?id=micocouliers", wait_until="networkidle"); page.wait_for_timeout(800)
    n_rev = page.evaluate("document.querySelectorAll('.experience-reveal').length")
    ready = page.evaluate("document.body.classList.contains('motion-ready')")
    check("fiche · orchestration au scroll active", ready and n_rev >= 5, f"{n_rev} éléments, ready {ready}")
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)"); page.wait_for_timeout(900)
    page.evaluate("window.scrollTo(0, 0)"); page.wait_for_timeout(400)
    visibles = page.evaluate("document.querySelectorAll('.experience-reveal.is-visible').length")
    check("fiche · les blocs se révèlent (aucun bloqué invisible)", visibles == n_rev, f"{visibles}/{n_rev}")
    page.goto(f"{BASE}/espace.html?view=favoris", wait_until="networkidle"); page.wait_for_timeout(700)
    ready = page.evaluate("document.body.classList.contains('motion-ready')")
    check("espace · orchestration au scroll active", ready, str(ready))
    a_regle = page.evaluate("""()=>{
      let panel=false, heart=false, press=0;
      for(const sheet of document.styleSheets){
        let rules; try{ rules=sheet.cssRules }catch{ continue }
        for(const r of rules){
          const t=(r.cssText||'');
          if(t.includes('panelIn')) panel=true;
          if(t.includes('heartPop')) heart=true;
          if((r.selectorText||'').includes(':active') && t.includes('scale')) press++;
        }
      }
      return {panel, heart, press};
    }""")
    check("css · transition de vues + pop cœur + appui tactile déclarés", a_regle["panel"] and a_regle["heart"] and a_regle["press"] >= 1, str(a_regle))
    ctx.close()

    # pop du cœur au clic (accueil)
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("coeur: "+str(e)))
    page.goto(f"{BASE}/index.html", wait_until="networkidle"); page.wait_for_timeout(700)
    page.evaluate("document.querySelector('#explorer').scrollIntoView()"); page.wait_for_timeout(400)
    premier = page.eval_on_selector(".listing-card .favorite", "e=>e.dataset.favorite")
    page.click(f'[data-favorite="{premier}"]'); page.wait_for_timeout(300)
    pop = page.eval_on_selector(f'[data-favorite="{premier}"]', "e=>e.classList.contains('pop') && e.classList.contains('active')")
    check("accueil · le cœur ajouté joue son pop", pop, premier)
    ctx.close()

    # ── MOBILE : inputs ≥16px (anti-zoom iOS) ──
    ctx = b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("inputs: "+str(e)))
    for url, nom in [("/espace.html?view=messages","espace"), ("/hote.html","hote")]:
        page.goto(BASE+url, wait_until="networkidle"); page.wait_for_timeout(600)
        petits = page.evaluate("""()=>[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),select,textarea')]
          .filter(i=>parseFloat(getComputedStyle(i).fontSize)<16)
          .map(i=>(i.name||i.id||i.placeholder||i.type||'?').slice(0,14))""")
        check(f"mobile · zéro input sous 16 px ({nom})", not petits, str(petits[:5]))
    # lisibilité : en-tête de conversation ≥ 11px
    page.goto(f"{BASE}/espace.html?view=messages", wait_until="networkidle"); page.wait_for_timeout(500)
    page.click('[data-conversation="claire"]'); page.wait_for_timeout(400)
    fs = page.eval_on_selector(".conversation-person small", "e=>getComputedStyle(e).fontSize")
    check("espace · méta du fil lisible (≥ 11 px)", float(fs.replace("px","")) >= 11, fs)
    ctx2 = page.eval_on_selector("#bookingContext", "e=>e.textContent")
    img2 = page.eval_on_selector("#bookingContext img", "e=>e.getAttribute('src')")
    check("espace · contexte Claire aligné (2 baigneurs · séance · bonne photo)",
          "2 baigneurs" in ctx2 and "Séance ouverte" in ctx2 and "famille-bleue" in img2, ctx2[:60])
    ctx.close()

    # ── HÔTE : le fil dit la même chose que la réservation ──
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("fil: "+str(e)))
    page.goto(f"{BASE}/hote.html?view=reservations", wait_until="networkidle"); page.wait_for_timeout(700)
    heure_resa = page.eval_on_selector('[data-reservation="martin"] span small', "e=>e.textContent.split(' · ')[0]")
    page.goto(f"{BASE}/hote.html?view=messages", wait_until="networkidle"); page.wait_for_timeout(700)
    ligne_fil = page.eval_on_selector(".host-thread-booking b", "e=>e.textContent")
    meta_fil = page.eval_on_selector("#hostThread>header div small", "e=>e.textContent")
    check("hôte · le fil Martin reprend les horaires réels", heure_resa.split(" – ")[0] in ligne_fil, f"resa {heure_resa} vs fil {ligne_fil}")
    check("hôte · méta du fil regénérée (plus de 16:00 figé)", "Réservation" in meta_fil and meta_fil.split("· ")[-1] in ligne_fil, meta_fil)
    ctx.close()
    b.close()

real = [e for e in errs if "favicon" not in e.lower()]
print("\nerreurs :", real or "aucune")
ko = res.count(False)
print(f"{len(res)-ko}/{len(res)} OK")
sys.exit(1 if ko or real else 0)
