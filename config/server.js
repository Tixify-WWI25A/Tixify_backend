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