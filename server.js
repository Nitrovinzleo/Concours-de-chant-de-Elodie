const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Données en mémoire pour les tests
let users = [];
let events = [];
let bookings = [];
let nextUserId = 1;
let nextEventId = 1;
let nextBookingId = 1;

// Créer un admin par défaut
async function initializeData() {
  const adminPassword = await bcrypt.hash('admin123', 12);
  users.push({
    _id: nextUserId++,
    email: 'admin@events.com',
    password: adminPassword,
    role: 'admin',
    profileData: { firstName: 'Admin', lastName: 'System' }
  });

  // Créer des événements de démonstration avec capacités réduites pour les tests
  events.push({
    _id: nextEventId++,
    title: 'Concert Test',
    location: 'Paris, Salle P',
    datetime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    capacity: 50,
    availableSeats: 50,
    description: 'Petit concert de test avec 50 places',
    category: 'concert',
    price: 25,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  events.push({
    _id: nextEventId++,
    title: 'Festival Test',
    location: 'Paris, Petit Zénith',
    datetime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    capacity: 20,
    availableSeats: 20,
    description: 'Mini festival de test avec 20 places',
    category: 'concert',
    price: 15,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  events.push({
    _id: nextEventId++,
    title: 'Showcase Test',
    location: 'Paris, La Cigale',
    datetime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    capacity: 30,
    availableSeats: 30,
    description: 'Showcase de test avec 30 places',
    category: 'concert',
    price: 20,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  events.push({
    _id: nextEventId++,
    title: 'Elodie Test',
    location: 'Paris, Station F',
    datetime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    capacity: 15,
    availableSeats: 15,
    description: 'Concert test d\'Elodie avec 15 places',
    category: 'concert',
    price: 10,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  events.push({
    _id: nextEventId++,
    title: 'Conference Test',
    location: 'Paris, Palais des Congrès',
    datetime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    capacity: 10,
    availableSeats: 10,
    description: 'Petite conférence de test avec 10 places',
    category: 'conference',
    price: 50,
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Données initialisées avec succès!');
}

// Middleware pour passer les données aux routes
app.use((req, res, next) => {
  req.db = { users, events, bookings, nextUserId, nextEventId, nextBookingId };
  req.io = io;
  next();
});

const authRoutes = require('./routes/auth-memory');
const eventRoutes = require('./routes/events-memory');
const bookingRoutes = require('./routes/bookings-memory');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-event', (eventId) => {
    socket.join(`event-${eventId}`);
    console.log(`User ${socket.id} joined event ${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3002;

// Initialiser les données puis démarrer le serveur
initializeData().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Admin account: admin@events.com / admin123`);
  });
}).catch(err => {
  console.error('Error initializing data:', err);
});
