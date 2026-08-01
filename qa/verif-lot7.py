"""Lot 7 : les 5 manques du 8,3 → 9 (re-notation DA)."""
from playwright.sync_api import sync_playwright
import os, sys

BASE = os.environ.get("LTP_BASE", "http://127.0.0.1:4196")
res, errs = [], []
def check(n, ok, d=""):
    res.append(ok); print(("  OK  " if ok else " FAIL ") + n + ((" — " + d) if d else ""))

def non_reveles_en_vue(page, vh):
    return page.evaluate("""(vh)=>[...document.querySelectorAll('.experience-reveal:not(.is-visible)')].map(el=>{
      const r=el.getBoundingClientRect();
      return (r.top<vh && r.bottom>0) ? el.className.split(' ').slice(0,2).join('.') : null;
    }).filter(Boolean)""", vh)

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    # ── REVEALS : protocole du DA (End direct, sauts de 15 %) ──
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("reveal: "+str(e)))
    page.goto(f"{BASE}/index.html", wait_until="networkidle"); page.wait_for_timeout(800)
    page.keyboard.press("End"); page.wait_for_timeout(1300)
    en_vue = non_reveles_en_vue(page, 900)
    au_dessus = page.evaluate("""()=>[...document.querySelectorAll('.experience-reveal:not(.is-visible)')].filter(el=>el.getBoundingClientRect().bottom<0).length""")
    check("reveal · End direct : rien d'invisible en viewport", not en_vue, str(en_vue))
    check("reveal · End direct : les sections sautées sont révélées (captures pleine page saines)", au_dessus == 0, f"{au_dessus} restantes au-dessus")
    page.evaluate("window.scrollTo(0,0)"); page.wait_for_timeout(300)
    H = page.evaluate("document.body.scrollHeight")
    rate = []
    for pct in range(15, 100, 15):
        page.evaluate(f"window.scrollTo(0, {H}*{pct}/100)"); page.wait_for_timeout(1200)
        rate += non_reveles_en_vue(page, 900)
    check("reveal · sauts de 15 % : plus de bande morte (le cas 45 % du DA)", not rate, str(rate[:4]))
    ctx.close()

    # mobile : End direct sur les 4 pages à reveals
    ctx = b.new_context(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("reveal-m: "+str(e)))
    for url in ["/index.html", "/fiche.html?id=micocouliers", "/espace.html", "/hote.html"]:
        page.goto(BASE+url, wait_until="networkidle"); page.wait_for_timeout(700)
        page.keyboard.press("End"); page.wait_for_timeout(1200)
        en_vue = non_reveles_en_vue(page, 844)
        au_dessus = page.evaluate("""()=>[...document.querySelectorAll('.experience-reveal:not(.is-visible)')].filter(el=>el.getBoundingClientRect().bottom<0).length""")
        check(f"reveal mobile · {url.split('?')[0]} : End sans trou", not en_vue and au_dessus == 0, f"vue {en_vue} · dessus {au_dessus}")
    ctx.close()

    # ── CŒUR DE FICHE : pop + réarmement ──
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("coeur: "+str(e)))
    page.goto(f"{BASE}/fiche.html?id=micocouliers", wait_until="networkidle"); page.wait_for_timeout(700)
    page.click("#ficheFavorite"); page.wait_for_timeout(120)
    pop1 = page.eval_on_selector("#ficheFavorite", "e=>e.classList.contains('pop')")
    page.wait_for_timeout(600)
    purge = page.eval_on_selector("#ficheFavorite", "e=>!e.classList.contains('pop')")
    page.click("#ficheFavorite"); page.wait_for_timeout(150)  # retrait : pas de pop
    pop_retrait = page.eval_on_selector("#ficheFavorite", "e=>e.classList.contains('pop')")
    page.click("#ficheFavorite"); page.wait_for_timeout(120)  # re-ajout : pop de nouveau
    pop2 = page.eval_on_selector("#ficheFavorite", "e=>e.classList.contains('pop')")
    check("fiche · le cœur d'en-tête joue son pop à l'ajout", pop1 and purge and pop2, f"pop1 {pop1} purge {purge} pop2 {pop2}")
    check("fiche · pas de pop au retrait", not pop_retrait)
    # avatar hôte : squircle + 2 initiales
    av = page.eval_on_selector(".host-avatar", "e=>({txt:e.textContent.trim(), br:getComputedStyle(e).borderRadius})")
    check("fiche · avatar hôte squircle 2 initiales", av["txt"] == "CL" and "50%" not in av["br"], str(av))
    ctx.close()

    # ── AVATAR DU FIL ESPACE + CAPACITÉ + CITATION ──
    ctx = b.new_context(viewport={"width":1440,"height":900}, locale="fr-FR")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errs.append("divers: "+str(e)))
    page.goto(f"{BASE}/espace.html?view=messages", wait_until="networkidle"); page.wait_for_timeout(500)
    page.click('[data-conversation="claire"]'); page.wait_for_timeout(400)
    br = page.eval_on_selector(".conversation-person>span", "e=>getComputedStyle(e).borderRadius")
    check("espace · avatar du fil en squircle (unifié)", "50%" not in br, br)
    page.goto(f"{BASE}/hote.html?view=listing", wait_until="networkidle"); page.wait_for_timeout(600)
    corps = page.text_content("body")
    check("hôte · capacité sans contradiction (12 · 15 en journée)", "15 en journée" in corps)
    page.goto(f"{BASE}/index.html", wait_until="networkidle"); page.wait_for_timeout(500)
    quote = page.locator(".host-quote")
    check("accueil · citation d'hôte posée sous le CTA", quote.count() == 1 and "portillon" in quote.first.text_content())
    ctx.close()
    b.close()

real = [e for e in errs if "favicon" not in e.lower()]
print("\nerreurs :", real or "aucune")
ko = res.count(False)
print(f"{len(res)-ko}/{len(res)} OK")
sys.exit(1 if ko or real else 0)
