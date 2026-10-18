// Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft.
// von uns erweitert: Least recently used-Verhalten in get(), Zähler für Rauswürfe (evictions).
/**
 * Zwischenspeicher im gateway (BFF) für öffentliche Event-Abfragen – eine HashMap mit Ablaufzeit.
 *
 * Warum: Die Startseite jedes Besuchers fragt GET /api/events ab. Ohne Cache geht jede dieser
 * Anfragen bis zur Datenbank. Mit Cache beantwortet das gateway sie 30 Sekunden lang selbst.
 *
 * Damit niemand veraltete Daten sieht, wird der Cache sofort geleert, sobald ein Event
 * geändert wird (jede erfolgreiche schreibende Anfrage an den catalog).
 * Nicht gecacht werden Antworten mit Login-Token: Die könnten nutzerspezifisch sein.
 *
 * Verdrängung: LRU (least recently used). Eine Map hält die Einfügereihenfolge; wer gelesen
 * oder neu gespeichert wird, rückt ans Ende. Vorne steht damit immer der am längsten nicht
 * benutzte Eintrag – der fliegt raus, wenn mehr als maxEntries gespeichert sind.
 */
class ResponseCache {
  constructor({ ttlMs = 30000, maxEntries = 200 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.entries = new Map(); // Schlüssel: URL inkl. Query; Reihenfolge: am längsten unbenutzt zuerst
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry || Date.now() > entry.expires) {
      if (entry) this.entries.delete(key);
      this.misses++;
      return null;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.hits++;
    return entry;
  }

  set(key, { status, contentType, body }) {
    this.entries.delete(key);
    this.entries.set(key, { status, contentType, body, expires: Date.now() + this.ttlMs });
    if (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value);
      this.evictions++;
    }
  }

  clear() {
    this.entries.clear();
  }

  stats() {
    return { entries: this.entries.size, hits: this.hits, misses: this.misses, evictions: this.evictions };
  }
}

module.exports = { ResponseCache };