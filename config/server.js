const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { typeDefs, resolvers } = require('./graphql'); 
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('../routes/authRoutes'));  
app.use('/api/events', require('../routes/eventRoutes'));
app.use('/api/cart', require('../routes/cartRoutes'));
app.use('/api/orders', require('../routes/orderRoutes'));
app.use('/api/users', require('../routes/userRoutes'));

const geocodeCache = new Map();

app.get('/api/geocode', async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim().length < 3) {
    return res.json([]);
  }

  const cacheKey = query.trim().toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return res.json(geocodeCache.get(cacheKey));
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, {
      headers: {
        'User-Agent': 'TixifyEventApp/1.0 (kontakt@tixify.local)'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Nominatim Drosselung aktiv' });
    }

    const data = await response.json();
    
    geocodeCache.set(cacheKey, data);
    setTimeout(() => geocodeCache.delete(cacheKey), 3600000);

    res.json(data);
  } catch (err) {
    console.error('Geocode Fehler:', err);
    res.status(500).json({ error: 'Fehler bei der Adresssuche' });
  }
});

async function startServer() {
  const apollo = new ApolloServer({
    typeDefs,
    resolvers
  });

  await apollo.start();

  app.post('/graphql', async (req, res) => {
    try {
      const response = await apollo.executeOperation({
        query: req.body.query,
        variables: req.body.variables,
      });

      res.json(response.body.singleResult);
    } catch (err) {
      res.status(500).json({ errors: [{ message: err.message }] });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Das Tixify Backend läuft auf Port ${PORT}`));
}

startServer();