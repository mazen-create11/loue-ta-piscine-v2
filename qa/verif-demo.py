"""Vérifie les 5 corrections de la démo Loue ta piscine V2, dans un vrai navigateur."""
from playwright.sync_api import sync_playwright
import json, sys

import os
BASE = os.environ.get("LTP_BASE", "http://127.0.0.1:4188")
OUT = "/private/tmp/claude-501/-Users-chabanmazen/b1c2d72a-ad78-414f-beaf-28ddff67ceb4/scratchpad/verif"
results, errors = [], []

def check(name, ok, detail=""):
    results.append({"test": name, "ok": bool(ok), "detail": detail})
    print(("  OK  " if ok else " FAIL ") + name + ((" — " + detail) if detail else ""))

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    # ---------- 1. Masquage + persistance côté HÔTE ----------
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"hote pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"hote console.{m.type}: {m.text}") if m.type == "error" else None)
    page.goto(f"{BASE}/hote.html", wait_until="networkidle")
    page.evaluate("() => { document.querySelector('[data-host-view=\"messages\"]').click(); }")
    page.wait_for_timeout(400)
    page.click('[data-host-conversation="martin"]')
    page.wait_for_timeout(300)
    page.fill("#hostMessageInput", "Appelle-moi au 06 44 71 28 93 on s'arrange")
    page.press("#hostMessageInput", "Enter")
    page.wait_for_timeout(300)
    before = page.text_content(".host-bubble.outgoing:last-child p")
    check("hôte · le numéro s'affiche d'abord en clair", "06 44 71 28 93" in before, before[:60])
    page.wait_for_timeout(1200)
    after = page.text_content(".host-bubble.outgoing:last-child p")
    page.screenshot(path=f"{OUT}/01-hote-masquage.png", full_page=False)
    check("hôte · le numéro est ensuite masqué", "•" in after and "06 44 71" not in after, after[:60])
    check("hôte · badge cadenas affiché", page.locator(".host-bubble .mask-badge").count() > 0)

    page.reload(wait_until="networkidle")
    page.evaluate("() => { document.querySelector('[data-host-view=\"messages\"]').click(); }")
    page.wait_for_timeout(300)
    page.click('[data-host-conversation="martin"]')
    page.wait_for_timeout(300)
    kept = page.text_content("#hostThreadBody")
    check("hôte · le message survit au rechargement", "•" in kept, "bulles: %d" % page.locator("#hostThreadBody .host-bubble").count())

    # changement de conversation puis retour : le message doit rester
    page.click('[data-host-conversation="karim"]')
    page.wait_for_timeout(200)
    page.click('[data-host-conversation="martin"]')
    page.wait_for_timeout(200)
    check("hôte · le message survit au changement de fil", "•" in page.text_content("#hostThreadBody"))
    ctx.close()

    # ---------- 2. Éditeur hôte -> fiche publique ----------
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"edit pageerror: {e}"))
    page.goto(f"{BASE}/hote.html", wait_until="networkidle")
    page.evaluate("() => { document.querySelector('[data-host-view=\"listing\"]').click(); }")
    page.wait_for_timeout(400)
    page.fill('[data-listing-field="name"]', "La piscine du Grand Cyprès")
    page.fill('[data-listing-field="location"]', "Éguilles")
    page.click("[data-host-save]")
    page.wait_for_timeout(400)
    toast = page.text_content("#hostAppToast")
    check("hôte · le toast annonce la publication", "publique" in toast, toast)
    page.goto(f"{BASE}/fiche.html?id=micocouliers", wait_until="networkidle")
    page.wait_for_timeout(400)
    body = page.text_content("body")
    page.screenshot(path=f"{OUT}/02-fiche-modifiee.png", full_page=False)
    check("fiche · le nouveau titre est visible côté client", "Grand Cyprès" in body)
    check("fiche · la nouvelle ville est visible", "Éguilles" in body)
    ctx.close()

    # ---------- 3. Favoris réels ----------
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"fav pageerror: {e}"))
    page.goto(f"{BASE}/index.html", wait_until="networkidle")
    page.evaluate("() => localStorage.setItem('ltp-v2-favorites', JSON.stringify(['oliviers','margelles']))")
    page.goto(f"{BASE}/espace.html?view=favoris", wait_until="networkidle")
    page.wait_for_timeout(400)
    cards = page.eval_on_selector_all("[data-favorite-card]", "els => els.map(e => e.dataset.favoriteCard)")
    page.screenshot(path=f"{OUT}/03-favoris.png", full_page=False)
    check("espace · les favoris posés sont ceux affichés", cards == ["oliviers", "margelles"], str(cards))
    # retrait persistant
    page.click('[data-favorite-card="oliviers"] [data-remove-favorite]')
    page.wait_for_timeout(200)
    stored = page.evaluate("() => localStorage.getItem('ltp-v2-favorites')")
    check("espace · retirer un favori le retire du stockage", "oliviers" not in stored, stored)
    ctx.close()

    # ---------- 4. Messagerie baigneur ----------
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"guest pageerror: {e}"))
    page.goto(f"{BASE}/espace.html?view=messages", wait_until="networkidle")
    page.click('[data-conversation="lucas"]')
    page.wait_for_timeout(300)
    page.fill("#messageInput", "mon mail c'est bilel.test@gmail.com si besoin")
    page.press("#messageInput", "Enter")
    page.wait_for_timeout(1300)
    guest_after = page.text_content(".bubble.outgoing:last-child p")
    page.screenshot(path=f"{OUT}/04-espace-masquage.png", full_page=False)
    check("baigneur · l'e-mail est masqué", "•" in guest_after and "@gmail" not in guest_after, guest_after[:60])
    page.reload(wait_until="networkidle")
    page.click('[data-conversation="lucas"]')
    page.wait_for_timeout(300)
    check("baigneur · le message survit au rechargement", "•" in page.text_content("#messageThread"))
    ctx.close()

    # ---------- 5. Navigation mobile ----------
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True,
                        has_touch=True, device_scale_factor=3, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"mobile pageerror: {e}"))
    page.goto(f"{BASE}/espace.html", wait_until="networkidle")
    page.wait_for_timeout(300)
    nav = page.locator(".space-mobile-nav")
    labels = page.eval_on_selector_all(".space-mobile-nav span", "els => els.map(e => e.textContent)")
    check("mobile · onglet Réservations présent côté baigneur", "Réservations" in labels, str(labels))
    page.click('.space-mobile-nav [data-space-view="reservations"]')
    page.wait_for_timeout(400)
    visible = page.eval_on_selector('[data-space-panel="reservations"]', "el => !el.hidden")
    page.screenshot(path=f"{OUT}/05-mobile-reservations.png", full_page=False)
    check("mobile · le panneau Réservations s'ouvre au doigt", visible)
    overflow = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check("mobile · pas de débordement horizontal (espace)", overflow <= 1, f"{overflow}px")

    page.goto(f"{BASE}/hote.html", wait_until="networkidle")
    page.wait_for_timeout(300)
    host_labels = page.eval_on_selector_all(".host-mobile-nav span", "els => els.map(e => e.textContent)")
    check("mobile · onglet Messages présent côté hôte", "Messages" in host_labels, str(host_labels))
    page.click('.host-mobile-nav [data-host-view="messages"]')
    page.wait_for_timeout(400)
    page.screenshot(path=f"{OUT}/06-mobile-hote-messages.png", full_page=False)
    host_overflow = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
    check("mobile · pas de débordement horizontal (hôte)", host_overflow <= 1, f"{host_overflow}px")
    ctx.close()

    b.close()

real_errors = [e for e in errors if "favicon" not in e.lower()]
print("\n--- erreurs console/page ---")
print("\n".join(real_errors) if real_errors else "aucune")
failed = [r for r in results if not r["ok"]]
print(f"\n{len(results)-len(failed)}/{len(results)} tests OK")
json.dump({"results": results, "errors": real_errors}, open(f"{OUT}/rapport.json", "w"), ensure_ascii=False, indent=1)
sys.exit(1 if failed else 0)
