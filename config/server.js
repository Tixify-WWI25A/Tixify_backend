const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('../routes/authRoutes'));  
app.use('/api/events', require('../routes/eventRoutes'));
app.use('/api/cart', require('../routes/cartRoutes'));
app.use('/api/orders', require('../routes/orderRoutes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Das Tixify Backend läuft auf Port ${PORT}`));