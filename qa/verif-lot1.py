"""Vérifie le lot 1 : hero, contraste profil, persona, prototype, [hidden], scroll-margin, favoris."""
from playwright.sync_api import sync_playwright
import os, sys

BASE = os.environ.get("LTP_BASE", "http://127.0.0.1:4174")
OUT = "/private/tmp/claude-501/-Users-chabanmazen/b1c2d72a-ad78-414f-beaf-28ddff67ceb4/scratchpad/verif"
res, errs = [], []

def check(n, ok, d=""):
    res.append(ok); print(("  OK  " if ok else " FAIL ") + n + ((" — " + d) if d else ""))

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

    # 1 — hero
    page.goto(f"{BASE}/index.html", wait_until="networkidle"); page.wait_for_timeout(600)
    fit = page.eval_on_selector(".hero-photo>img", "e => getComputedStyle(e).objectFit")
    check("hero · image en cover", fit == "cover", fit)
    box = page.eval_on_selector(".hero-photo", "e => {const r=e.getBoundingClientRect(); const i=e.querySelector('img').getBoundingClientRect(); return {cw:Math.round(r.width),ch:Math.round(r.height),iw:Math.round(i.width),ih:Math.round(i.height)}}")
    check("hero · l'image remplit le cadre", abs(box["cw"]-box["iw"]) <= 2 and abs(box["ch"]-box["ih"]) <= 2, str(box))
    page.locator(".hero-photo").screenshot(path=f"{OUT}/40-hero.png")

    # 2 — prototype
    for n in ["index", "fiche", "confirmation"]:
        page.goto(f"{BASE}/{n}.html", wait_until="networkidle"); page.wait_for_timeout(250)
        check(f"{n} · plus de mention « Prototype »", "Prototype" not in page.text_content("body"))

    # 3 — scroll-margin explorer
    page.goto(f"{BASE}/index.html", wait_until="networkidle"); page.wait_for_timeout(400)
    sm = page.eval_on_selector("#explorer", "e => getComputedStyle(e).scrollMarginTop")
    check("accueil · marge d'ancre sur #explorer", sm not in ("0px", ""), sm)
    page.evaluate("() => document.querySelector('[data-moment]')?.click()")
    page.wait_for_timeout(900)
    pos = page.eval_on_selector("#explorer", "e => Math.round(e.getBoundingClientRect().top)")
    head = page.eval_on_selector(".site-header", "e => Math.round(e.getBoundingClientRect().bottom)")
    check("accueil · les filtres restent sous l'en-tête", pos >= head - 4, f"filtres à {pos}px, en-tête à {head}px")
    page.screenshot(path=f"{OUT}/41-filtres.png")

    # 4 — contraste du profil hôte
    page.goto(f"{BASE}/hote.html", wait_until="networkidle"); page.wait_for_timeout(500)
    col = page.eval_on_selector(".host-profile b", "e => {const s=getComputedStyle(e); return {c:s.color, bg:getComputedStyle(e.closest('.host-profile')).backgroundColor}}")
    def lum(rgb):
        v = [int(x)/255 for x in rgb[rgb.find('(')+1:rgb.find(')')].split(',')[:3]]
        v = [c/12.92 if c <= .03928 else ((c+.055)/1.055)**2.4 for c in v]
        return .2126*v[0]+.7152*v[1]+.0722*v[2]
    ratio = (max(lum(col["c"]), lum(col["bg"]))+.05)/(min(lum(col["c"]), lum(col["bg"]))+.05)
    check("hôte · « Claire » lisible dans l'en-tête", ratio >= 4.5, f"contraste {ratio:.1f}:1")
    page.locator(".host-profile").screenshot(path=f"{OUT}/42-profil-hote.png")

    # 5 — [hidden] respecté
    page.goto(f"{BASE}/espace.html?view=messages", wait_until="networkidle"); page.wait_for_timeout(400)
    page.click('[data-conversation="mia"]'); page.wait_for_timeout(400)
    ctx_shown = page.eval_on_selector("#bookingContext", "e => e.hidden ? getComputedStyle(e).display : 'visible'")
    check("espace · pas de réservation collée dans le fil de Maz", ctx_shown == "none", ctx_shown)
    page.screenshot(path=f"{OUT}/43-conv-maz.png")

    # 6 — persona
    page.goto(f"{BASE}/espace.html?view=account", wait_until="networkidle"); page.wait_for_timeout(500)
    txt = page.text_content("body")
    check("espace · plus de données du prestataire", "Mazen" not in txt and "mazen@" not in txt)
    check("espace · persona neutre en place", "Julie" in txt)

    # 7 — favoris : aller-retour ne détruit rien
    page.goto(f"{BASE}/espace.html?view=favoris", wait_until="networkidle"); page.wait_for_timeout(500)
    n0 = page.locator("[data-favorite-card]").count()
    ids0 = page.eval_on_selector_all("[data-favorite-card]", "els=>els.map(e=>e.dataset.favoriteCard)")
    check("favoris · trois cartes par défaut", n0 == 3, str(ids0))
    coherent = page.eval_on_selector_all("[data-favorite-card]",
        "els=>els.every(e=>{const t=e.querySelector('h2').textContent.toLowerCase(); const id=e.dataset.favoriteCard; return t.includes(id.slice(0,6));})")
    check("favoris · le titre correspond à l'annonce ouverte", coherent, str(ids0))
    page.click('[data-favorite-card="verger"] [data-remove-favorite]'); page.wait_for_timeout(300)
    page.reload(wait_until="networkidle"); page.wait_for_timeout(500)
    ids1 = page.eval_on_selector_all("[data-favorite-card]", "els=>els.map(e=>e.dataset.favoriteCard)")
    check("favoris · retirer une carte n'efface pas les autres", len(ids1) == 2 and "verger" not in ids1, str(ids1))
    pools = page.eval_on_selector_all("[data-compare-pool]", "els=>els.map(e=>e.textContent)")
    check("favoris · le comparateur suit la collection", len(pools) == 2, str(pools))
    page.screenshot(path=f"{OUT}/44-favoris.png")
    ctx.close(); b.close()

real = [e for e in errs if "favicon" not in e.lower()]
print("\nerreurs :", real or "aucune")
ko = res.count(False)
print(f"{len(res)-ko}/{len(res)} OK")
sys.exit(1 if ko or real else 0)
