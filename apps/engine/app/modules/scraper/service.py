"""Lógica pura del scraper con Playwright. Extrae leads públicos de un directorio.

Corre en la máquina del usuario (nunca en un servidor central). Respeta `robots.txt`
y hace una sola petición por fuente (regla §7 de AGENTS.md): no rastrea ni pagina.
"""
import asyncio
import urllib.robotparser
from collections.abc import Callable
from typing import Any
from urllib.parse import urlparse

from playwright.async_api import async_playwright

from app.core.supabase import insert_lead
from .schemas import Lead, ScrapeResult

_UA = "UltrathingBot/1.0"

# JS que corre en el DOM ya renderizado: agrupa por el contenedor que rodea a cada
# contacto (mailto:/tel:) y arma un lead con nombre/email/teléfono/web. Si la página
# no expone contactos por enlace, barre el texto entero como respaldo.
_EXTRACT_JS = r"""
() => {
  const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
  const SOCIAL = /(facebook|instagram|twitter|x\.com|linkedin|youtube|tiktok|t\.me|wa\.me|whatsapp)/i;

  const anchors = Array.from(
    document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]')
  );
  const seen = new Set();
  const containers = [];
  for (const a of anchors) {
    let el = a;
    for (let i = 0; i < 4 && el.parentElement; i++) {
      const p = el.parentElement;
      if (p.matches('li, tr, article, .card, .item, .result, .listing')) { el = p; break; }
      el = p;
    }
    if (seen.has(el)) continue;
    seen.add(el);
    containers.push(el);
  }

  const grab = (root) => {
    const text = root.innerText || '';
    const mail = root.querySelector('a[href^="mailto:"]');
    const tel = root.querySelector('a[href^="tel:"]');
    const email = mail
      ? mail.getAttribute('href').replace('mailto:', '').split('?')[0].trim()
      : (text.match(EMAIL_RE) || [null])[0];
    const phone = tel
      ? tel.getAttribute('href').replace('tel:', '').trim()
      : (text.match(PHONE_RE) || [null])[0];
    let name = null;
    const h = root.querySelector('h1,h2,h3,h4,h5,strong,b');
    if (h && h.innerText.trim()) name = h.innerText.trim();
    let website = null;
    for (const link of root.querySelectorAll('a[href^="http"]')) {
      if (!SOCIAL.test(link.href)) { website = link.href; break; }
    }
    return { name, email, phone, website };
  };

  const leads = [];
  for (const c of containers) {
    const lead = grab(c);
    if (lead.email || lead.phone) leads.push(lead);
  }

  if (leads.length === 0) {
    const body = document.body.innerText || '';
    const emails = [...new Set(body.match(new RegExp(EMAIL_RE, 'g')) || [])];
    for (const email of emails) leads.push({ name: null, email, phone: null, website: null });
  }
  return leads;
}
"""


def _allowed(url: str) -> bool:
    """Respeta robots.txt (regla §7 de AGENTS.md). Si no hay robots accesible, permite."""
    parsed = urlparse(url)
    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(f"{parsed.scheme}://{parsed.netloc}/robots.txt")
    try:
        rp.read()
    except Exception:  # noqa: BLE001 — sin robots legible no bloqueamos
        return True
    return rp.can_fetch(_UA, url)


def _dedupe(raw: list[dict[str, Any]]) -> list[Lead]:
    seen: set[tuple[str | None, str | None]] = set()
    leads: list[Lead] = []
    for item in raw:
        email = (item.get("email") or "").strip() or None
        phone = (item.get("phone") or "").strip() or None
        key = (email, phone)
        if key == (None, None) or key in seen:
            continue
        seen.add(key)
        leads.append(
            Lead(
                name=(item.get("name") or None),
                email=email,
                phone=phone,
                website=(item.get("website") or None),
            )
        )
    return leads


def _persist(token: str, user_id: str, source: str, leads: list[Lead]) -> None:
    for lead in leads:
        insert_lead(
            token,
            user_id,
            source,
            lead.name,
            lead.phone,
            lead.email,
            {"website": lead.website} if lead.website else {},
        )


async def scrape(
    url: str,
    report: Callable[[float], None],
    user_id: str | None = None,
    token: str | None = None,
) -> dict[str, Any]:
    """Renderiza la fuente con Playwright y extrae leads. Persiste cada uno si hay usuario."""
    report(5)
    if not await asyncio.to_thread(_allowed, url):
        raise ValueError("robots.txt de la fuente no permite extraer esta URL.")

    report(15)
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        try:
            page = await browser.new_page(user_agent=_UA)
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            report(50)
            raw = await page.evaluate(_EXTRACT_JS)
        finally:
            await browser.close()

    report(75)
    leads = _dedupe(raw)
    if user_id and token:
        await asyncio.to_thread(_persist, token, user_id, url, leads)

    report(100)
    return ScrapeResult(source=url, count=len(leads), leads=leads).model_dump()
