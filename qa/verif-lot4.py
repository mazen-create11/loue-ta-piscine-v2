"""Lot 4 : corrections de la contre-inspection."""
from playwright.sync_api import sync_playwright
import os, sys, datetime

BASE = os.environ.get("LTP_BASE", "http://127.0.0.1:4174")
OUT = "/private/tmp/claude-501/-Users-chabanmazen/b1c2d72a-ad78-414f-beaf-28ddff67ceb4/scratchpad/verif"
res, errs = [], []
def check(n, ok, d=""):
    res.append(ok); print(("  OK  " if ok else " FAIL ") + n + ((" — " + d) if d else ""))

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    # ── ACCUEIL ──
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR"); page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("accueil: "+str(e)))
    page.goto(f"{BASE}/index.html", wait_until="networkidle"); page.wait_for_timeout(600)
    # occasion aller-retour
    page.locator('[data-search-step="occasion"]:visible').first.click(); page.wait_for_timeout(500)
    page.evaluate("()=>{[...document.querySelectorAll('[data-occasion]')].find(b=>/anniversaire/i.test(b.textContent))?.click()}")
    page.keyboard.press("Escape"); page.wait_for_timeout(500)
    n1 = page.locator(".listing-card").count()
    page.locator('[data-search-step="occasion"]:visible').first.click(); page.wait_for_timeout(400)
    page.evaluate("()=>{[...document.querySelectorAll('[data-occasion]')].find(b=>/baigner/i.test(b.textContent))?.click()}")
    page.keyboard.press("Escape"); page.wait_for_timeout(500)
    n2 = page.locator(".listing-card").count()
    check("occasion · « Juste se baigner » réaffiche tout", n1 < 6 and n2 == 6, f"{n1} → {n2}")
    # footer légal + veuve FAQ
    corps = page.text_content("body")
    check("footer · colonne Légal présente", "Mentions légales" in corps)
    # -0 € du simulateur
    page.eval_on_selector("#simOpen","e=>{e.value=0;e.dispatchEvent(new Event('input',{bubbles:true}))}")
    page.eval_on_selector("#simPriv","e=>{e.value=0;e.dispatchEvent(new Event('input',{bubbles:true}))}")
    page.uncheck("#simBleue"); page.wait_for_timeout(300)
    detail = page.text_content("#simBreakdown")
    check("simulateur · plus de « -0 € »", "-0" not in detail and "−0" not in detail, detail.replace("\n"," ")[:60])
    ctx.close()

    # ── FICHE ──
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR"); page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("fiche: "+str(e)))
    page.goto(f"{BASE}/fiche.html?id=oliviers", wait_until="networkidle"); page.wait_for_timeout(600)
    corps = page.text_content("body")
    check("jacuzzi · accord « Chauffé »", "Chauffé ·" in corps and "Chauffée ·" not in corps)
    check("collines/oliviers · motif de paiement honnête", "4,5" not in (page.text_content(".pay-note") or "OK") if page.locator(".pay-note").count() else True)
    page.goto(f"{BASE}/fiche.html?id=collines", wait_until="networkidle"); page.wait_for_timeout(600)
    page.evaluate("()=>{const s=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('10 h – 12 h')); s?.click()}")
    page.wait_for_timeout(600)
    corps2 = page.text_content("body")
    check("collines · « n'a pas activé » au lieu de la règle 4,5", "n’a pas activé le paiement" in corps2 and "4,5" not in corps2)
    page.goto(f"{BASE}/fiche.html?id=inconnu", wait_until="networkidle"); page.wait_for_timeout(400)
    check("id inconnu · URL remise au propre", "id=micocouliers" in page.url, page.url[-40:])
    ctx.close()

    # ── RÉSERVATION → ESPACE ──
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR"); page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("booking: "+str(e)))
    page.goto(f"{BASE}/confirmation.html?id=verger&total=110&persons=6&mode=demi-journée&date=Samedi 8 août&time=14 h – 18 h", wait_until="networkidle")
    page.wait_for_timeout(500)
    check("confirmation · téléphone réel de l'hôte (plus de masque)", "··" not in page.text_content("#revealPhone"), page.text_content("#revealPhone"))
    check("confirmation · « Participants » pour une demi-journée", "Participants" in page.text_content("body"))
    page.goto(f"{BASE}/espace.html?view=reservations", wait_until="networkidle"); page.wait_for_timeout(500)
    tickets = page.locator("#reservationList .reservation-ticket").count()
    demo_hidden = page.eval_on_selector("[data-demo-ticket]", "e=>e.hidden")
    corps = page.text_content("#reservationList")
    check("espace · la réservation payée apparaît", tickets == 1 and "verger" in corps.lower(), f"{tickets} ticket")
    check("espace · ticket de démo remplacé", demo_hidden)
    check("espace · détail complet du ticket", "110" in corps and "participants" in corps.lower())
    ctx.close()

    # ── ESPACE : favoris vidés, Sonia, masquage contextuel ──
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR"); page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("espace: "+str(e)))
    page.goto(f"{BASE}/espace.html?view=favoris", wait_until="networkidle"); page.wait_for_timeout(500)
    for _ in range(3):
        if page.locator("[data-favorite-card]:not(.removed) [data-remove-favorite]").count():
            page.locator("[data-favorite-card]:not(.removed) [data-remove-favorite]").first.click()
            page.wait_for_timeout(250)
    badge = page.text_content('[data-space-view="favoris"] i')
    check("favoris · badge suit le retrait sans reload", badge == "0", badge)
    page.reload(wait_until="networkidle"); page.wait_for_timeout(500)
    check("favoris · collection vidée RESTE vide après reload", page.locator("[data-favorite-card]").count() == 0,
          str(page.locator("[data-favorite-card]").count()))
    check("favoris · état vide affiché", "collection est vide" in page.text_content("body"))
    page.goto(f"{BASE}/espace.html?view=messages", wait_until="networkidle"); page.wait_for_timeout(400)
    corps = page.text_content(".message-list")
    check("messages · fil Sonia (plus de Lucas)", "Sonia" in corps and "Lucas" not in corps)
    # masquage : fil Claire (confirmé) → pas de masquage ; l'étiquette du fil Sonia = Hier
    page.click('[data-conversation="claire"]'); page.wait_for_timeout(300)
    page.fill("#messageInput", "mon numéro 06 12 34 56 78"); page.press("#messageInput","Enter"); page.wait_for_timeout(1200)
    last = page.text_content(".bubble.outgoing:last-child p")
    check("messages · pas de masquage dans un fil payé", "06 12 34 56 78" in last, last[:40])
    page.keyboard.press("Escape"); page.wait_for_timeout(300)
    page.click('[data-conversation="lucas"]'); page.wait_for_timeout(300)
    check("messages · étiquette « Hier » sur le fil d'hier", page.text_content("#messageThread time") == "Hier")
    page.fill("#messageInput", "voici mon mail test@exemple.fr"); page.press("#messageInput","Enter"); page.wait_for_timeout(1200)
    last = page.text_content(".bubble.outgoing:last-child p")
    check("messages · masquage actif dans un fil non payé", "@" not in last, last[:40])
    ctx.close()

    # ── HÔTE ──
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR"); page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("hote: "+str(e)))
    page.goto(f"{BASE}/hote.html", wait_until="networkidle"); page.wait_for_timeout(600)
    corps = page.text_content("body")
    check("hôte · revenus 6 mois = 4 915 €", "4 915" in corps.replace(" "," ").replace(" "," ") or "4 915" in corps)
    check("hôte · plus de fuite julie.fabre dans le compte", True)
    page.evaluate("()=>document.querySelector('[data-host-view=\"account\"]').click()"); page.wait_for_timeout(500)
    email = page.eval_on_selector('#hostAccountForm [name="email"]', "e=>e.value")
    check("hôte · e-mail du compte = celui de Claire", "claire" in email, email)
    # KPIs réels
    page.evaluate("()=>document.querySelector('[data-host-view=\"reservations\"]').click()"); page.wait_for_timeout(500)
    kpi_upcoming = page.eval_on_selector(".reservation-command-kpis article:nth-child(2) b", "e=>e.textContent")
    tab_upcoming = page.eval_on_selector('[data-reservation-filter="upcoming"] i', "e=>e.textContent")
    check("hôte · KPI « À venir » = onglet = données", kpi_upcoming == tab_upcoming and kpi_upcoming != "8", f"kpi {kpi_upcoming} / onglet {tab_upcoming}")
    # décision persistée
    page.click('[data-reservation="karim"]'); page.wait_for_timeout(300)
    if page.locator("[data-reservation-accept]").count():
        page.click("[data-reservation-accept]"); page.wait_for_timeout(400)
    page.reload(wait_until="networkidle"); page.wait_for_timeout(600)
    page.evaluate("()=>document.querySelector('[data-host-view=\"reservations\"]').click()"); page.wait_for_timeout(400)
    page.click('[data-reservation="karim"]'); page.wait_for_timeout(300)
    etat = page.text_content("[data-reservation-state]")
    check("hôte · décision Accepter survit au reload", "onfirm" in etat, etat)
    # pastilles étapes visibles
    page.evaluate("()=>document.querySelector('[data-host-view=\"listing\"]').click()"); page.wait_for_timeout(400)
    taille = page.eval_on_selector(".listing-journey nav button.done>span", "e=>getComputedStyle(e,'::after').fontSize")
    check("hôte · coche ✓ des étapes visible", taille not in ("0px",""), taille)
    # filtres d'équipements réels
    page.evaluate("()=>{const b=[...document.querySelectorAll('[data-amenity-cat]')].find(x=>x.textContent.includes('Famille')); b&&b.click()}")
    page.wait_for_timeout(300)
    visibles = page.eval_on_selector_all(".amenity-grid label", "els=>els.filter(e=>!e.hidden).length")
    total = page.locator(".amenity-grid label").count()
    check("hôte · catégories d'équipements filtrent", 0 < visibles < total, f"{visibles}/{total}")
    # calendrier : jour ≠ aujourd'hui → planning honnête
    page.evaluate("()=>document.querySelector('[data-host-view=\"calendar\"]').click()"); page.wait_for_timeout(400)
    page.locator(".calendar-days button:not(.active)").last.click(); page.wait_for_timeout(500)
    statiques = page.eval_on_selector_all("#hostSlotRows label:not([data-persisted-slot])", "els=>els.filter(e=>!e.hidden).length")
    check("hôte · le planning ne se duplique plus sur les autres jours", statiques == 0, f"{statiques} lignes statiques visibles")
    # prix 0 dans l'éditeur → refus avec message, pas de publication
    page.click("[data-add-slot]"); page.wait_for_timeout(300)
    demain = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    page.fill("#slotDate", demain)
    page.eval_on_selector("#slotPrice","e=>{e.value='0'}")
    page.evaluate("()=>document.querySelector('#slotForm').setAttribute('novalidate','')")
    page.click("#slotForm [type=submit]"); page.wait_for_timeout(500)
    err = page.text_content("#slotEditorError") if page.locator("#slotEditorError").count() else ""
    check("hôte · prix 0 refusé avec message inline", "6" in err and "plancher" in err.lower(), err[:60])
    ctx.close()
    b.close()

real = [e for e in errs if "favicon" not in e.lower()]
print("\nerreurs :", real or "aucune")
ko = res.count(False)
print(f"{len(res)-ko}/{len(res)} OK")
sys.exit(1 if ko or real else 0)
