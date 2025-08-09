const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();

// Middlewares
app.use(cors({ origin: true }));
app.use(express.json());

// Ping
app.get('/', (req, res) => {
  res.send('Backend Lapa Casa activo 🚀');
});

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'lapa-casa-backend', ts: Date.now() });
});

// Eventos (fallback simple)
app.get('/events', async (req, res) => {
  const from = String(req.query.from || '').slice(0,10);
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

// ===== Stripe Checkout (TEST) =====
const stripe = process.env.STRIPE_SK ? new Stripe(process.env.STRIPE_SK) : null;

app.post('/payments/stripe/session', async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ error: 'stripe_not_configured' });

    const order = req.body?.order || {};
    const amountBRL = Math.max(100, Math.round((order.total || 0) * 100)); // min R$1,00

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      currency: 'brl',
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: { name: 'Reserva Lapa Casa Hostel' },
          unit_amount: amountBRL,
        },
        quantity: 1,
      }],
      metadata: { email: order.email || '', nights: String(order.nights || 1) },
      success_url: 'https://lapa-casa-backend.onrender.com/?paid=1',
      cancel_url: 'https://lapa-casa-backend.onrender.com/?cancel=1',
    });

    res.json({ id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'stripe_session_error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
