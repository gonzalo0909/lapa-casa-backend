const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Backend Lapa Casa activo 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
