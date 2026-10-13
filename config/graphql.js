const db = require('./db');

const typeDefs = `#graphql
  type Event {
    event_id: ID!
    title: String!
    category: String
    location: String
    event_date: String
    price: Float!
    event_stock: Int!
    logo_url: String
    description: String
    latitude: Float
    longitude: Float
  }

  type Query {
    events: [Event]
    event(id: ID!): Event
  }

  type Mutation {
    updateStock(eventId: ID!, stock: Int!): Event
  }
`;

const resolvers = {
  Query: {
    events: async () => {
      const res = await db.query('SELECT * FROM events ORDER BY event_id ASC');
      return res.rows.map(row => ({
        ...row,
        price: parseFloat(row.price),
        latitude: row.latitude !== null && row.latitude !== undefined ? parseFloat(row.latitude) : null,
        longitude: row.longitude !== null && row.longitude !== undefined ? parseFloat(row.longitude) : null
      }));
    },
    event: async (_, { id }) => {
      const res = await db.query('SELECT * FROM events WHERE event_id = $1', [id]);
      if (!res.rows[0]) return null;
      return {
        ...res.rows[0],
        price: parseFloat(res.rows[0].price),
        latitude: res.rows[0].latitude !== null && res.rows[0].latitude !== undefined ? parseFloat(res.rows[0].latitude) : null,
        longitude: res.rows[0].longitude !== null && res.rows[0].longitude !== undefined ? parseFloat(res.rows[0].longitude) : null
      };
    }
  },
  Mutation: {
    updateStock: async (_, { eventId, stock }) => {
      const res = await db.query(
        'UPDATE events SET event_stock = $1 WHERE event_id = $2 RETURNING *',
        [stock, eventId]
      );
      if (!res.rows[0]) throw new Error('Event nicht gefunden');
      return {
        ...res.rows[0],
        price: parseFloat(res.rows[0].price),
        latitude: res.rows[0].latitude !== null && res.rows[0].latitude !== undefined ? parseFloat(res.rows[0].latitude) : null,
        longitude: res.rows[0].longitude !== null && res.rows[0].longitude !== undefined ? parseFloat(res.rows[0].longitude) : null
      };
    }
  }
};

module.exports = { typeDefs, resolvers };