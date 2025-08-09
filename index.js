const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares básicos
app.use(cors({ origin: true }));   // en prod: lista blanca de orígenes
app.use(express.json());

// Ping
app.get('/', (req, res) => {
  res.send('Backend Lapa Casa activo 🚀');
});

// Health (para verificar que está vivo)
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'lapa-casa-backend', ts: Date.now() });
});

// Eventos (fallback simple; el front lo usa)
app.get('/events', async (req, res) => {
  const from = String(req.query.from || '').slice(0,10);
  const to   = String(req.query.to   || '').slice(0,10);

  const start = new Date(from || new Date().toISOString().slice(0,10));
  const out = [];
  for (let i=0; i<3; i++){
    const d = new Date(start); d.setDate(d.getDate()+i);
    const ds = d.toISOString().slice(0,10);
    out.push(
      { date: ds, title: 'Samba en Lapa – Arcos', where: 'Lapa', time: '20:00' },
      { date: ds, title: 'Trilha Morro dos Dois Irmãos', where: 'Vidigal', time: '07:30' }
    );
  }
  res.json(out.slice(0,6));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
