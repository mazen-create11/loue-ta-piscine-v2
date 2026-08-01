"""Lot 5 : corrections de l'inspection finale (mobile + DA)."""
from playwright.sync_api import sync_playwright
import os, sys, re

BASE = os.environ.get("LTP_BASE", "http://127.0.0.1:4196")
res, errs = [], []
def check(n, ok, d=""):
    res.append(ok); print(("  OK  " if ok else " FAIL ") + n + ((" — " + d) if d else ""))

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    # ── MOBILE 390 : débordement + proof + faq + nav ──
    ctx = b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("mobile: "+str(e)))
    page.goto(f"{BASE}/index.html", wait_until="networkidle"); page.wait_for_timeout(700)
    sw = page.evaluate("document.documentElement.scrollWidth")
    check("mobile · plus de débordement horizontal (390)", sw == 390, f"scrollWidth {sw}")
    dire = page.evaluate("""()=>{
      const h=[...document.querySelectorAll('h2')].find(x=>/dire oui/i.test(x.textContent));
      return h ? Math.round(h.getBoundingClientRect().left) : -1;
    }""")
    check("mobile · titre « dire oui » décollé du bord", dire >= 15, f"left {dire}px")
    faq = page.evaluate("""()=>{
      const h=document.getElementById('faqTitle'); const r=h.getBoundingClientRect();
      return {right:Math.round(r.right), fs:getComputedStyle(h).fontSize};
    }""")
    check("mobile · titre FAQ tient dans l'écran", faq["right"] <= 390, str(faq))
    nav = page.eval_on_selector_all(".mobile-nav a, .mobile-nav button", "els=>els.map(e=>e.textContent.trim())")
    check("mobile · nav accueil = 5 onglets dont Réservations", len(nav) == 5 and "Réservations" in nav, str(nav))
    resa_href = page.eval_on_selector(".mobile-nav a[href*='reservations']", "e=>e.getAttribute('href')") if page.locator(".mobile-nav a[href*='reservations']").count() else ""
    check("mobile · l'onglet mène à l'espace réservations", "view=reservations" in resa_href, resa_href)
    # insécables : plus de « chiffre + espace normale + € » dans le texte rendu
    for url, nom in [(f"{BASE}/index.html","index"), (f"{BASE}/hote.html","hote")]:
        page.goto(url, wait_until="networkidle"); page.wait_for_timeout(500)
        txt = page.evaluate("document.body.textContent")
        mauvais = re.findall(r"\d €", txt)
        check(f"typo · zéro espace sécable avant € ({nom})", not mauvais, f"{len(mauvais)} restants")
    ctx.close()

    # ── FOOTERS + CONFIRMATION ──
    ctx = b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("footers: "+str(e)))
    page.goto(f"{BASE}/fiche.html?id=micocouliers", wait_until="networkidle"); page.wait_for_timeout(500)
    foot = page.text_content("footer")
    check("fiche · footer avec colonne Légal", "Mentions légales" in foot and "synchronisées" not in foot)
    ghost = page.evaluate("""()=>[...document.images].filter(i=>i.naturalWidth===0 && i.src && !i.getAttribute('loading')).map(i=>i.id)""")
    lb = page.evaluate("()=>{const i=document.getElementById('lightboxImage'); return i ? (i.getAttribute('src')===null ? 'sans-src' : i.getAttribute('src')) : 'absent'}")
    check("fiche · lightbox sans requête parasite", lb == "sans-src", str(lb))
    page.goto(f"{BASE}/confirmation.html", wait_until="networkidle"); page.wait_for_timeout(500)
    foot = page.text_content("footer")
    check("confirmation · footer avec colonne Légal", "Mentions légales" in foot and "synchronisées" not in foot)
    corps = page.text_content("body")
    check("confirmation · défaut aligné 16 € (2 baigneurs, dimanche)", "16 €" in corps and "28" not in page.text_content("#confirmRows"))
    hauteurs = page.eval_on_selector_all("footer div a", "els=>els.map(a=>Math.round(a.getBoundingClientRect().height))")
    check("confirmation · liens footer tappables ≥ 40 px", hauteurs and min(hauteurs) >= 40, str(hauteurs))
    ctx.close()

    # ── ESPACE : ticket démo, CTA réservation, avatar, retour ──
    ctx = b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("espace: "+str(e)))
    page.goto(f"{BASE}/espace.html?view=reservations", wait_until="networkidle"); page.wait_for_timeout(500)
    demo = page.text_content("[data-demo-ticket]")
    demo_img = page.eval_on_selector("[data-demo-ticket] img", "e=>e.getAttribute('src')")
    check("espace · ticket démo cohérent (2 baigneurs · 16 €)", "2 baigneurs" in demo and "16 €" in demo, demo[:60])
    check("espace · ticket démo avec la photo Micocouliers", "famille-bleue" in demo_img, demo_img)
    liens_demo = page.eval_on_selector_all("[data-demo-ticket] a", "els=>els.map(a=>a.getAttribute('href'))")
    check("espace · ticket démo : Voir → confirmation, Revoir → fiche",
          len(liens_demo) == 2 and "confirmation.html" in liens_demo[0] and "fiche.html" in liens_demo[1], str(liens_demo))
    # vraie réservation → CTA vers la confirmation avec les bons params
    page.goto(f"{BASE}/confirmation.html?id=verger&total=110&persons=6&mode=demi-journ%C3%A9e&date=Samedi%208%20ao%C3%BBt&time=14%20h%20%E2%80%93%2018%20h", wait_until="networkidle")
    page.wait_for_timeout(400)
    page.goto(f"{BASE}/espace.html?view=reservations", wait_until="networkidle"); page.wait_for_timeout(500)
    cta = page.eval_on_selector("#reservationList .reservation-ticket a", "e=>e.getAttribute('href')")
    check("espace · CTA du vrai ticket → confirmation avec params", cta.startswith("confirmation.html?") and "total=110" in cta, cta[:70])
    page.click("#reservationList .reservation-ticket a"); page.wait_for_timeout(600)
    corps = page.text_content("body")
    check("espace · la confirmation rouverte montre MA réservation", "110 €" in corps and "Samedi 8 août" in corps)
    page.go_back(); page.wait_for_timeout(400)
    # avatar Sonia
    page.goto(f"{BASE}/espace.html?view=messages", wait_until="networkidle"); page.wait_for_timeout(400)
    sonia = page.eval_on_selector('[data-conversation="lucas"] .message-avatar', "e=>({txt:e.textContent.trim(), img:!!e.querySelector('img')})")
    check("espace · avatar Sonia = initiales (plus de photo)", sonia["txt"] == "SO" and not sonia["img"], str(sonia))
    # retour navigateur ferme le fil
    page.click('[data-conversation="claire"]'); page.wait_for_timeout(500)
    ouvert = page.eval_on_selector("#messageModal", "e=>!e.hidden")
    page.go_back(); page.wait_for_timeout(500)
    ferme = page.eval_on_selector("#messageModal", "e=>e.hidden")
    sur_espace = "espace.html" in page.url
    check("espace · retour navigateur ferme le fil sans quitter la page", ouvert and ferme and sur_espace, page.url[-40:])
    ctx.close()

    # ── HÔTE ──
    ctx = b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("hote: "+str(e)))
    page.goto(f"{BASE}/hote.html", wait_until="networkidle"); page.wait_for_timeout(700)
    # revenus accessibles depuis le tableau mobile
    lien = page.locator(".host-earning-link")
    check("hôte · lien « Voir 6 mois de revenus » sur le Tableau", lien.count() == 1 and lien.first.is_visible())
    lien.first.click(); page.wait_for_timeout(500)
    visible = page.eval_on_selector('[data-host-panel="bookings"]', "e=>!e.hidden")
    corps = page.evaluate("document.querySelector('[data-host-panel=\\'bookings\\']').textContent")
    corps = corps.replace(chr(160), chr(32)).replace(chr(8239), chr(32))
    check("hôte · le lien ouvre la vue Revenus (4 915 € visible)", visible and "4 915" in corps, "panel " + str(visible))
    check("hôte · paiement Inès K. (fini le Karim contradictoire)", "Inès K." in corps and "Karim" not in corps)
    # semaine dashboard : jours passés neutres + légende + wording
    page.goto(f"{BASE}/hote.html", wait_until="networkidle"); page.wait_for_timeout(600)
    passes = page.eval_on_selector_all("#hostCalendar .host-week button.past", "els=>els.map(e=>e.className)")
    check("hôte · jours passés sans couleur d'état résiduelle", passes and all("booked" not in c and "available" not in c for c in passes), str(passes))
    legende = page.eval_on_selector_all(".calendar-legend span", "els=>els.map(e=>e.textContent.trim())")
    check("hôte · légende 3 états", legende == ["Ouvert","Réservé","Fermé"], str(legende))
    corps = page.text_content("#hostCalendar")
    check("hôte · wording neutre « Ouvrir ce jour »", "Appuyer pour ouvrir" not in corps)
    # Emma exclue de « À venir » au chargement
    page.evaluate("()=>document.querySelector('[data-host-view=\"reservations\"]').click()"); page.wait_for_timeout(500)
    visibles = page.eval_on_selector_all("#hostReservationList [data-reservation]", "els=>els.filter(e=>!e.hidden).map(e=>e.dataset.reservation)")
    compteur = page.eval_on_selector('[data-reservation-filter="upcoming"] i', "e=>e.textContent")
    check("hôte · « À venir » n'affiche plus les terminées", "emma" not in visibles and len(visibles) == int(compteur), f"{visibles} vs {compteur}")
    # horaires figés dans la journée
    heure1 = page.eval_on_selector('[data-reservation="karim"] small', "e=>e.textContent")
    page.reload(wait_until="networkidle"); page.wait_for_timeout(700)
    page.evaluate("()=>document.querySelector('[data-host-view=\"reservations\"]').click()"); page.wait_for_timeout(500)
    heure2 = page.eval_on_selector('[data-reservation="karim"] small', "e=>e.textContent")
    check("hôte · horaires démo stables entre deux visites", heure1 == heure2, f"{heure1} vs {heure2}")
    ctx.close()

    # toast au-dessus de la barre d'enregistrement — défaut constaté en desktop
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR")
    page = ctx.new_page()
    page.goto(f"{BASE}/hote.html", wait_until="networkidle"); page.wait_for_timeout(500)
    bas = page.evaluate("getComputedStyle(document.getElementById('hostAppToast')).bottom")
    check("hôte · toast remonté au-dessus de la barre fixe (desktop)", bas == "96px", bas)
    ctx.close()
    b.close()

real = [e for e in errs if "favicon" not in e.lower()]
print("\nerreurs :", real or "aucune")
ko = res.count(False)
print(f"{len(res)-ko}/{len(res)} OK")
sys.exit(1 if ko or real else 0)
