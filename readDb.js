const pool = require('./config/db'); 

const readDatabase = async () => {
  try {
    console.log('Lese Daten aus allen Tabellen aus...\n');

    const tables = ['users', 'events', 'carts', 'cart_items', 'orders', 'tickets'];

    for (const table of tables) {
      const result = await pool.query(`SELECT * FROM ${table}`);
      console.log(`=== TABELLE: ${table.toUpperCase()} (${result.rows.length} Einträge) ===`);
      console.table(result.rows);
      console.log('\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('Fehler beim Auslesen der Datenbank:', error);
    process.exit(1);
  }
};

readDatabase();