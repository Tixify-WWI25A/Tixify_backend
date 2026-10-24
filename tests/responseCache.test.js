// Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft.
// Mit KI erweitert (KI-Log Nr. 11): Tests für LRU-Verhalten und evictions.
const { ResponseCache } = require('../src/services/responseCache');

describe('ResponseCache', () => {
  const entry = (n) => ({ status: 200, contentType: 'application/json', body: Buffer.from(String(n)) });

  test('speichert und liefert Einträge, zählt Treffer und Fehlschläge', () => {
    const cache = new ResponseCache();
    expect(cache.get('a')).toBeNull();
    cache.set('a', entry(1));
    expect(cache.get('a').body.toString()).toBe('1');
    expect(cache.stats()).toEqual({ entries: 1, hits: 1, misses: 1, evictions: 0 });
  });

  test('wirft bei Überfüllung den ältesten Eintrag hinaus', () => {
    const cache = new ResponseCache({ maxEntries: 2 });
    cache.set('a', entry(1));
    cache.set('b', entry(2));
    cache.set('c', entry(3));
    expect(cache.get('a')).toBeNull();
    expect(cache.get('c')).not.toBeNull();
  });

  test('LRU: ein zwischendurch gelesener Eintrag bleibt, der am längsten unbenutzte fliegt raus', () => {
    const cache = new ResponseCache({ maxEntries: 2 });
    cache.set('a', entry(1));
    cache.set('b', entry(2));
    cache.get('a');            // a wird benutzt → b ist jetzt der am längsten unbenutzte
    cache.set('c', entry(3));  // Überlauf
    expect(cache.get('a')).not.toBeNull();
    expect(cache.get('b')).toBeNull();
    expect(cache.get('c')).not.toBeNull();
    expect(cache.stats().evictions).toBe(1);
  });

  test('abgelaufene Einträge werden nicht mehr geliefert', () => {
    jest.useFakeTimers();
    const cache = new ResponseCache({ ttlMs: 1000 });
    cache.set('a', entry(1));
    jest.advanceTimersByTime(1001);
    expect(cache.get('a')).toBeNull();
    expect(cache.stats().entries).toBe(0);
    jest.useRealTimers();
  });

  test('clear leert alles', () => {
    const cache = new ResponseCache();
    cache.set('a', entry(1));
    cache.clear();
    expect(cache.get('a')).toBeNull();
  });
});
