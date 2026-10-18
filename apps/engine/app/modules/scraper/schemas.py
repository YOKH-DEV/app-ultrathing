"""Contratos del módulo scraper."""
from pydantic import BaseModel


class StartScrape(BaseModel):
    url: str


class Lead(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None


class ScrapeResult(BaseModel):
    source: str
    count: int
    leads: list[Lead]
