const express = require('express');
const app = express();

app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));  
app.use('/api/events', require('./routes/eventRoutes')); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Das Tixify Backend läuft auf Port ${PORT}`));