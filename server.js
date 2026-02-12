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
  seatMap: {
    rows: 20,
    seatsPerRow: 50,
    seatCategories: [
      {
        name: 'Orchestre',
        price: 150,
        rows: [1, 2, 3, 4, 5],
        color: '#FFD700'
      },
      {
        name: 'Catégorie 1',
        price: 120,
        rows: [6, 7, 8, 9, 10],
        color: '#C0C0C0'
      },
      {
        name: 'Catégorie 2',
        price: 89,
        rows: [11, 12, 13, 14, 15],
        color: '#CD7F32'
      },
      {
        name: 'Balcon',
        price: 55,
        rows: [16, 17, 18, 19, 20],
        color: '#87CEEB'
      }
    ]
  },
  bookedSeats: [
    { seatNumber: 'A1', user: 1, bookingDate: new Date() },
    { seatNumber: 'A2', user: 1, bookingDate: new Date() },
    { seatNumber: 'B5', user: 1, bookingDate: new Date() },
    { seatNumber: 'C10', user: 1, bookingDate: new Date() },
    { seatNumber: 'D15', user: 1, bookingDate: new Date() },
    { seatNumber: 'E8', user: 1, bookingDate: new Date() },
    { seatNumber: 'F12', user: 1, bookingDate: new Date() },
    { seatNumber: 'G3', user: 1, bookingDate: new Date() },
    { seatNumber: 'H7', user: 1, bookingDate: new Date() },
    { seatNumber: 'I9', user: 1, bookingDate: new Date() }
  ],
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
  seatMap: {
    rows: 15,
    seatsPerRow: 40,
    seatCategories: [
      {
        name: 'VIP',
        price: 120,
        rows: [1, 2, 3],
        color: '#FFD700'
      },
      {
        name: 'Standard',
        price: 55,
        rows: [4, 5, 6, 7, 8, 9, 10],
        color: '#28a745'
      },
      {
        name: 'Debout',
        price: 35,
        rows: [11, 12, 13, 14, 15],
        color: '#87CEEB'
      }
    ]
  },
  bookedSeats: [
    { seatNumber: 'A1', user: 1, bookingDate: new Date() },
    { seatNumber: 'A2', user: 1, bookingDate: new Date() },
    { seatNumber: 'B3', user: 1, bookingDate: new Date() },
    { seatNumber: 'C5', user: 1, bookingDate: new Date() },
    { seatNumber: 'D7', user: 1, bookingDate: new Date() }
  ],
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
  seatMap: {
    rows: 12,
    seatsPerRow: 30,
    seatCategories: [
      {
        name: 'Orchestre',
        price: 45,
        rows: [1, 2, 3, 4],
        color: '#FFD700'
      },
      {
        name: 'Standard',
        price: 30,
        rows: [5, 6, 7, 8, 9],
        color: '#28a745'
      },
      {
        name: 'Balcon',
        price: 20,
        rows: [10, 11, 12],
        color: '#87CEEB'
      }
    ]
  },
  bookedSeats: [
    { seatNumber: 'A5', user: 1, bookingDate: new Date() },
    { seatNumber: 'B8', user: 1, bookingDate: new Date() },
    { seatNumber: 'C12', user: 1, bookingDate: new Date() }
  ],
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
  availableSeats: 0,
  description: 'Concours de chant',
  category: 'meetup',
  price: 10,
  seatMap: {
    rows: 8,
    seatsPerRow: 25,
    seatCategories: [
      {
        name: 'Premier rang',
        price: 15,
        rows: [1, 2],
        color: '#FFD700'
      },
      {
        name: 'Standard',
        price: 10,
        rows: [3, 4, 5, 6],
        color: '#28a745'
      },
      {
        name: 'Arrière',
        price: 8,
        rows: [7, 8],
        color: '#87CEEB'
      }
    ]
  },
  bookedSeats: [
    { seatNumber: 'A1', user: 1, bookingDate: new Date() },
    { seatNumber: 'A2', user: 1, bookingDate: new Date() },
    { seatNumber: 'A3', user: 1, bookingDate: new Date() },
    { seatNumber: 'A4', user: 1, bookingDate: new Date() },
    { seatNumber: 'A5', user: 1, bookingDate: new Date() },
    { seatNumber: 'A6', user: 1, bookingDate: new Date() },
    { seatNumber: 'A7', user: 1, bookingDate: new Date() },
    { seatNumber: 'A8', user: 1, bookingDate: new Date() },
    { seatNumber: 'A9', user: 1, bookingDate: new Date() },
    { seatNumber: 'A10', user: 1, bookingDate: new Date() },
    { seatNumber: 'A11', user: 1, bookingDate: new Date() },
    { seatNumber: 'A12', user: 1, bookingDate: new Date() },
    { seatNumber: 'A13', user: 1, bookingDate: new Date() },
    { seatNumber: 'A14', user: 1, bookingDate: new Date() },
    { seatNumber: 'A15', user: 1, bookingDate: new Date() },
    { seatNumber: 'A16', user: 1, bookingDate: new Date() },
    { seatNumber: 'A17', user: 1, bookingDate: new Date() },
    { seatNumber: 'A18', user: 1, bookingDate: new Date() },
    { seatNumber: 'A19', user: 1, bookingDate: new Date() },
    { seatNumber: 'A20', user: 1, bookingDate: new Date() },
    { seatNumber: 'A21', user: 1, bookingDate: new Date() },
    { seatNumber: 'A22', user: 1, bookingDate: new Date() },
    { seatNumber: 'A23', user: 1, bookingDate: new Date() },
    { seatNumber: 'A24', user: 1, bookingDate: new Date() },
    { seatNumber: 'A25', user: 1, bookingDate: new Date() },
    { seatNumber: 'B1', user: 1, bookingDate: new Date() },
    { seatNumber: 'B2', user: 1, bookingDate: new Date() },
    { seatNumber: 'B3', user: 1, bookingDate: new Date() },
    { seatNumber: 'B4', user: 1, bookingDate: new Date() },
    { seatNumber: 'B5', user: 1, bookingDate: new Date() },
    { seatNumber: 'B6', user: 1, bookingDate: new Date() },
    { seatNumber: 'B7', user: 1, bookingDate: new Date() },
    { seatNumber: 'B8', user: 1, bookingDate: new Date() },
    { seatNumber: 'B9', user: 1, bookingDate: new Date() },
    { seatNumber: 'B10', user: 1, bookingDate: new Date() },
    { seatNumber: 'B11', user: 1, bookingDate: new Date() },
    { seatNumber: 'B12', user: 1, bookingDate: new Date() },
    { seatNumber: 'B13', user: 1, bookingDate: new Date() },
    { seatNumber: 'B14', user: 1, bookingDate: new Date() },
    { seatNumber: 'B15', user: 1, bookingDate: new Date() },
    { seatNumber: 'B16', user: 1, bookingDate: new Date() },
    { seatNumber: 'B17', user: 1, bookingDate: new Date() },
    { seatNumber: 'B18', user: 1, bookingDate: new Date() },
    { seatNumber: 'B19', user: 1, bookingDate: new Date() },
    { seatNumber: 'B20', user: 1, bookingDate: new Date() },
    { seatNumber: 'B21', user: 1, bookingDate: new Date() },
    { seatNumber: 'B22', user: 1, bookingDate: new Date() },
    { seatNumber: 'B23', user: 1, bookingDate: new Date() },
    { seatNumber: 'B24', user: 1, bookingDate: new Date() },
    { seatNumber: 'B25', user: 1, bookingDate: new Date() },
    { seatNumber: 'C1', user: 1, bookingDate: new Date() },
    { seatNumber: 'C2', user: 1, bookingDate: new Date() },
    { seatNumber: 'C3', user: 1, bookingDate: new Date() },
    { seatNumber: 'C4', user: 1, bookingDate: new Date() },
    { seatNumber: 'C5', user: 1, bookingDate: new Date() },
    { seatNumber: 'C6', user: 1, bookingDate: new Date() },
    { seatNumber: 'C7', user: 1, bookingDate: new Date() },
    { seatNumber: 'C8', user: 1, bookingDate: new Date() },
    { seatNumber: 'C9', user: 1, bookingDate: new Date() },
    { seatNumber: 'C10', user: 1, bookingDate: new Date() },
    { seatNumber: 'C11', user: 1, bookingDate: new Date() },
    { seatNumber: 'C12', user: 1, bookingDate: new Date() },
    { seatNumber: 'C13', user: 1, bookingDate: new Date() },
    { seatNumber: 'C14', user: 1, bookingDate: new Date() },
    { seatNumber: 'C15', user: 1, bookingDate: new Date() },
    { seatNumber: 'C16', user: 1, bookingDate: new Date() },
    { seatNumber: 'C17', user: 1, bookingDate: new Date() },
    { seatNumber: 'C18', user: 1, bookingDate: new Date() },
    { seatNumber: 'C19', user: 1, bookingDate: new Date() },
    { seatNumber: 'C20', user: 1, bookingDate: new Date() },
    { seatNumber: 'C21', user: 1, bookingDate: new Date() },
    { seatNumber: 'C22', user: 1, bookingDate: new Date() },
    { seatNumber: 'C23', user: 1, bookingDate: new Date() },
    { seatNumber: 'C24', user: 1, bookingDate: new Date() },
    { seatNumber: 'C25', user: 1, bookingDate: new Date() },
    { seatNumber: 'D1', user: 1, bookingDate: new Date() },
    { seatNumber: 'D2', user: 1, bookingDate: new Date() },
    { seatNumber: 'D3', user: 1, bookingDate: new Date() },
    { seatNumber: 'D4', user: 1, bookingDate: new Date() },
    { seatNumber: 'D5', user: 1, bookingDate: new Date() },
    { seatNumber: 'D6', user: 1, bookingDate: new Date() },
    { seatNumber: 'D7', user: 1, bookingDate: new Date() },
    { seatNumber: 'D8', user: 1, bookingDate: new Date() },
    { seatNumber: 'D9', user: 1, bookingDate: new Date() },
    { seatNumber: 'D10', user: 1, bookingDate: new Date() },
    { seatNumber: 'D11', user: 1, bookingDate: new Date() },
    { seatNumber: 'D12', user: 1, bookingDate: new Date() },
    { seatNumber: 'D13', user: 1, bookingDate: new Date() },
    { seatNumber: 'D14', user: 1, bookingDate: new Date() },
    { seatNumber: 'D15', user: 1, bookingDate: new Date() },
    { seatNumber: 'D16', user: 1, bookingDate: new Date() },
    { seatNumber: 'D17', user: 1, bookingDate: new Date() },
    { seatNumber: 'D18', user: 1, bookingDate: new Date() },
    { seatNumber: 'D19', user: 1, bookingDate: new Date() },
    { seatNumber: 'D20', user: 1, bookingDate: new Date() },
    { seatNumber: 'D21', user: 1, bookingDate: new Date() },
    { seatNumber: 'D22', user: 1, bookingDate: new Date() },
    { seatNumber: 'D23', user: 1, bookingDate: new Date() },
    { seatNumber: 'D24', user: 1, bookingDate: new Date() },
    { seatNumber: 'D25', user: 1, bookingDate: new Date() },
    { seatNumber: 'E1', user: 1, bookingDate: new Date() },
    { seatNumber: 'E2', user: 1, bookingDate: new Date() },
    { seatNumber: 'E3', user: 1, bookingDate: new Date() },
    { seatNumber: 'E4', user: 1, bookingDate: new Date() },
    { seatNumber: 'E5', user: 1, bookingDate: new Date() },
    { seatNumber: 'E6', user: 1, bookingDate: new Date() },
    { seatNumber: 'E7', user: 1, bookingDate: new Date() },
    { seatNumber: 'E8', user: 1, bookingDate: new Date() },
    { seatNumber: 'E9', user: 1, bookingDate: new Date() },
    { seatNumber: 'E10', user: 1, bookingDate: new Date() },
    { seatNumber: 'E11', user: 1, bookingDate: new Date() },
    { seatNumber: 'E12', user: 1, bookingDate: new Date() },
    { seatNumber: 'E13', user: 1, bookingDate: new Date() },
    { seatNumber: 'E14', user: 1, bookingDate: new Date() },
    { seatNumber: 'E15', user: 1, bookingDate: new Date() },
    { seatNumber: 'E16', user: 1, bookingDate: new Date() },
    { seatNumber: 'E17', user: 1, bookingDate: new Date() },
    { seatNumber: 'E18', user: 1, bookingDate: new Date() },
    { seatNumber: 'E19', user: 1, bookingDate: new Date() },
    { seatNumber: 'E20', user: 1, bookingDate: new Date() },
    { seatNumber: 'E21', user: 1, bookingDate: new Date() },
    { seatNumber: 'E22', user: 1, bookingDate: new Date() },
    { seatNumber: 'E23', user: 1, bookingDate: new Date() },
    { seatNumber: 'E24', user: 1, bookingDate: new Date() },
    { seatNumber: 'E25', user: 1, bookingDate: new Date() },
    { seatNumber: 'F1', user: 1, bookingDate: new Date() },
    { seatNumber: 'F2', user: 1, bookingDate: new Date() },
    { seatNumber: 'F3', user: 1, bookingDate: new Date() },
    { seatNumber: 'F4', user: 1, bookingDate: new Date() },
    { seatNumber: 'F5', user: 1, bookingDate: new Date() },
    { seatNumber: 'F6', user: 1, bookingDate: new Date() },
    { seatNumber: 'F7', user: 1, bookingDate: new Date() },
    { seatNumber: 'F8', user: 1, bookingDate: new Date() },
    { seatNumber: 'F9', user: 1, bookingDate: new Date() },
    { seatNumber: 'F10', user: 1, bookingDate: new Date() },
    { seatNumber: 'F11', user: 1, bookingDate: new Date() },
    { seatNumber: 'F12', user: 1, bookingDate: new Date() },
    { seatNumber: 'F13', user: 1, bookingDate: new Date() },
    { seatNumber: 'F14', user: 1, bookingDate: new Date() },
    { seatNumber: 'F15', user: 1, bookingDate: new Date() },
    { seatNumber: 'F16', user: 1, bookingDate: new Date() },
    { seatNumber: 'F17', user: 1, bookingDate: new Date() },
    { seatNumber: 'F18', user: 1, bookingDate: new Date() },
    { seatNumber: 'F19', user: 1, bookingDate: new Date() },
    { seatNumber: 'F20', user: 1, bookingDate: new Date() },
    { seatNumber: 'F21', user: 1, bookingDate: new Date() },
    { seatNumber: 'F22', user: 1, bookingDate: new Date() },
    { seatNumber: 'F23', user: 1, bookingDate: new Date() },
    { seatNumber: 'F24', user: 1, bookingDate: new Date() },
    { seatNumber: 'F25', user: 1, bookingDate: new Date() },
    { seatNumber: 'G1', user: 1, bookingDate: new Date() },
    { seatNumber: 'G2', user: 1, bookingDate: new Date() },
    { seatNumber: 'G3', user: 1, bookingDate: new Date() },
    { seatNumber: 'G4', user: 1, bookingDate: new Date() },
    { seatNumber: 'G5', user: 1, bookingDate: new Date() },
    { seatNumber: 'G6', user: 1, bookingDate: new Date() },
    { seatNumber: 'G7', user: 1, bookingDate: new Date() },
    { seatNumber: 'G8', user: 1, bookingDate: new Date() },
    { seatNumber: 'G9', user: 1, bookingDate: new Date() },
    { seatNumber: 'G10', user: 1, bookingDate: new Date() },
    { seatNumber: 'G11', user: 1, bookingDate: new Date() },
    { seatNumber: 'G12', user: 1, bookingDate: new Date() },
    { seatNumber: 'G13', user: 1, bookingDate: new Date() },
    { seatNumber: 'G14', user: 1, bookingDate: new Date() },
    { seatNumber: 'G15', user: 1, bookingDate: new Date() },
    { seatNumber: 'G16', user: 1, bookingDate: new Date() },
    { seatNumber: 'G17', user: 1, bookingDate: new Date() },
    { seatNumber: 'G18', user: 1, bookingDate: new Date() },
    { seatNumber: 'G19', user: 1, bookingDate: new Date() },
    { seatNumber: 'G20', user: 1, bookingDate: new Date() },
    { seatNumber: 'G21', user: 1, bookingDate: new Date() },
    { seatNumber: 'G22', user: 1, bookingDate: new Date() },
    { seatNumber: 'G23', user: 1, bookingDate: new Date() },
    { seatNumber: 'G24', user: 1, bookingDate: new Date() },
    { seatNumber: 'G25', user: 1, bookingDate: new Date() },
    { seatNumber: 'H1', user: 1, bookingDate: new Date() },
    { seatNumber: 'H2', user: 1, bookingDate: new Date() },
    { seatNumber: 'H3', user: 1, bookingDate: new Date() },
    { seatNumber: 'H4', user: 1, bookingDate: new Date() },
    { seatNumber: 'H5', user: 1, bookingDate: new Date() },
    { seatNumber: 'H6', user: 1, bookingDate: new Date() },
    { seatNumber: 'H7', user: 1, bookingDate: new Date() },
    { seatNumber: 'H8', user: 1, bookingDate: new Date() },
    { seatNumber: 'H9', user: 1, bookingDate: new Date() },
    { seatNumber: 'H10', user: 1, bookingDate: new Date() },
    { seatNumber: 'H11', user: 1, bookingDate: new Date() },
    { seatNumber: 'H12', user: 1, bookingDate: new Date() },
    { seatNumber: 'H13', user: 1, bookingDate: new Date() },
    { seatNumber: 'H14', user: 1, bookingDate: new Date() },
    { seatNumber: 'H15', user: 1, bookingDate: new Date() },
    { seatNumber: 'H16', user: 1, bookingDate: new Date() },
    { seatNumber: 'H17', user: 1, bookingDate: new Date() },
    { seatNumber: 'H18', user: 1, bookingDate: new Date() },
    { seatNumber: 'H19', user: 1, bookingDate: new Date() },
    { seatNumber: 'H20', user: 1, bookingDate: new Date() },
    { seatNumber: 'H21', user: 1, bookingDate: new Date() },
    { seatNumber: 'H22', user: 1, bookingDate: new Date() },
    { seatNumber: 'H23', user: 1, bookingDate: new Date() },
    { seatNumber: 'H24', user: 1, bookingDate: new Date() },
    { seatNumber: 'H25', user: 1, bookingDate: new Date() }
  ],
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  console.error('Stack trace:', err.stack);
  res.status(500).json({ 
    message: 'Server error', 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin account: admin@events.com / admin123`);
});
