const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

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

// Base de données en mémoire pour les tests
let users = [];
let events = [];
let bookings = [];
let nextUserId = 1;
let nextEventId = 1;
let nextBookingId = 1;

// Créer un admin par défaut
users.push({
  _id: nextUserId++,
  email: 'admin@events.com',
  password: '$2a$12$Mvv7emPnaw9gZjK1hcmITeSzUxw3tXgZCg0J8p3VTi0e2PARYw7A2', // password: admin123
  role: 'admin',
  profileData: { firstName: 'Admin', lastName: 'System' }
});

// Ajouter des événements de démonstration plus intéressants

events.push({
  _id: nextEventId++,
  title: 'Concert de Lady Gaga',
  location: 'Paris, Accor Arena',
  datetime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  capacity: 20000,
  availableSeats: 15342,
  description: 'Lady Gaga en live avec ses plus grands hits et un show spectaculaire',
  category: 'concert',
  price: 89,
  createdBy: 1,
  createdAt: new Date(),
  updatedAt: new Date()
});

events.push({
  _id: nextEventId++,
  title: 'Festival K-Pop Night',
  location: 'Paris, Zénith',
  datetime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  capacity: 8000,
  availableSeats: 1200,
  description: 'Soirée spéciale K-Pop avec reprises BTS, BLACKPINK, Stray Kids et DJs invités',
  category: 'concert',
  price: 55,
  createdBy: 1,
  createdAt: new Date(),
  updatedAt: new Date()
});

events.push({
  _id: nextEventId++,
  title: 'Showcase Rap FR',
  location: 'Paris, La Cigale',
  datetime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
  capacity: 1500,
  availableSeats: 230,
  description: 'Concert avec plusieurs artistes rap français émergents',
  category: 'concert',
  price: 30,
  createdBy: 1,
  createdAt: new Date(),
  updatedAt: new Date()
});

events.push({
  _id: nextEventId++,
  title: 'Concours de chant de Elodie ',
  location: 'Paris, Station F',
  datetime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
  capacity: 300,
  availableSeats: 300,
  description: 'Concours de chant',
  category: 'meetup',
  price: 10,
  createdBy: 1,
  createdAt: new Date(),
  updatedAt: new Date()
});


const authRoutes = require('./routes/auth-memory');
const eventRoutes = require('./routes/events-memory');
const bookingRoutes = require('./routes/bookings-memory');

// Passer les données en mémoire aux routes
app.use((req, res, next) => {
  req.db = { users, events, bookings, nextUserId, nextEventId, nextBookingId };
  next();
});

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

  socket.on('leave-event', (eventId) => {
    socket.leave(`event-${eventId}`);
    console.log(`User ${socket.id} left event ${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

global.io = io;

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin account: admin@events.com / admin123`);
});
