"""Non-régression du parcours principal après le passage des scripts en modules."""
from playwright.sync_api import sync_playwright
import os, sys

BASE = os.environ.get("LTP_BASE", "http://127.0.0.1:4189")
OUT = "/private/tmp/claude-501/-Users-chabanmazen/b1c2d72a-ad78-414f-beaf-28ddff67ceb4/scratchpad/verif"
results, errors = [], []

def check(name, ok, detail=""):
    results.append(ok)
    print(("  OK  " if ok else " FAIL ") + name + ((" — " + detail) if detail else ""))

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None)

    # --- Accueil : données chargées, grille remplie, recherche vivante ---
    page.goto(f"{BASE}/index.html", wait_until="networkidle")
    page.wait_for_timeout(500)
    cards = page.locator("[data-listing-card], .place-card, article a[href*='fiche.html']").count()
    check("accueil · la grille d'annonces est remplie", cards > 0, f"{cards} éléments")
    has_data = page.evaluate("() => Boolean(window.LTP && window.LTP.listings && window.LTP.listings.length)")
    check("accueil · window.LTP est disponible", has_data)
    page.screenshot(path=f"{OUT}/10-accueil.png", full_page=False)

    # --- Fiche : calendrier, prix, réservation ---
    page.goto(f"{BASE}/fiche.html?id=micocouliers", wait_until="networkidle")
    page.wait_for_timeout(500)
    body = page.text_content("body")
    check("fiche · le nom de l'annonce est rendu", "Micocouliers" in body or "piscine" in body.lower())
    check("fiche · des créneaux sont proposés", page.locator("[data-slot], .slot, .day-slot").count() > 0,
          str(page.locator("[data-slot], .slot, .day-slot").count()) + " créneaux")
    check("fiche · un total est affiché", "€" in body)
    page.screenshot(path=f"{OUT}/11-fiche.png", full_page=False)

    # --- Confirmation : le script inline (module) lit bien window.LTP ---
    page.goto(f"{BASE}/confirmation.html?id=micocouliers&total=68&persons=4", wait_until="networkidle")
    page.wait_for_timeout(500)
    confirm = page.text_content("body")
    check("confirmation · la page est rendue sans page blanche", len(confirm.strip()) > 200, f"{len(confirm)} car.")
    check("confirmation · le total passé en paramètre est affiché", "68" in confirm)
    check("confirmation · les coordonnées de l'hôte sont débloquées", "44 71" in confirm or "Claire" in confirm)
    page.screenshot(path=f"{OUT}/12-confirmation.png", full_page=False)

    # --- Espace : les 4 vues s'ouvrent ---
    page.goto(f"{BASE}/espace.html", wait_until="networkidle")
    page.wait_for_timeout(400)
    for view in ["favoris", "messages", "reservations", "account"]:
        page.evaluate(f"() => document.querySelector('[data-space-view=\"{view}\"]').click()")
        page.wait_for_timeout(200)
        shown = page.eval_on_selector(f'[data-space-panel="{view}"]', "el => !el.hidden")
        check(f"espace · la vue {view} s'ouvre", shown)

    # --- Hôte : les 7 vues s'ouvrent ---
    page.goto(f"{BASE}/hote.html", wait_until="networkidle")
    page.wait_for_timeout(400)
    for view in ["dashboard", "listing", "calendar", "reservations", "bookings", "messages", "account"]:
        page.evaluate(f"() => document.querySelector('[data-host-view=\"{view}\"]').click()")
        page.wait_for_timeout(200)
        shown = page.eval_on_selector(f'[data-host-panel="{view}"]', "el => !el.hidden")
        check(f"hôte · la vue {view} s'ouvre", shown)
    page.screenshot(path=f"{OUT}/13-hote-dashboard.png", full_page=False)

    # --- Pas de débordement horizontal sur les 5 pages, desktop ---
    for name in ["index", "fiche", "espace", "hote", "confirmation"]:
        page.goto(f"{BASE}/{name}.html", wait_until="networkidle")
        page.wait_for_timeout(250)
        over = page.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(f"{name} · aucun débordement horizontal", over <= 1, f"{over}px")
    ctx.close()
    b.close()

real = [e for e in errors if "favicon" not in e.lower()]
print("\n--- erreurs ---")
print("\n".join(real) if real else "aucune")
ko = results.count(False)
print(f"\n{len(results)-ko}/{len(results)} tests OK")
sys.exit(1 if ko or real else 0)
