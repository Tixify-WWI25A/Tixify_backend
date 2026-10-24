// Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft.
// Wird vor jeder Testdatei geladen (jest.setupFiles). Feste Test-Werte, nie echte Geheimnisse.
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';
process.env.CATALOG_URL = process.env.CATALOG_URL || 'http://127.0.0.1:1';
process.env.ORDERS_URL = process.env.ORDERS_URL || 'http://127.0.0.1:1';
// Ohne Redis soll die Registrierung im Test nicht 2 s auf die Queue warten
process.env.EVENT_PUBLISH_TIMEOUT_MS = process.env.EVENT_PUBLISH_TIMEOUT_MS || '300';
