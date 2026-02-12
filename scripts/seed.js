const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Event = require('../models/Event');
const User = require('../models/User');

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/event-reservation', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('Connected to MongoDB');

  try {
    // Vider la base de données
    await Event.deleteMany({});
    await User.deleteMany({});

    // Créer un admin par défaut
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = new User({
      email: 'admin@events.com',
      password: adminPassword,
      role: 'admin',
      profileData: { 
        firstName: 'Admin', 
        lastName: 'System' 
      }
    });
    await admin.save();

    // Créer des événements de test
    const events = [
      {
        title: 'Concert de Jazz',
        description: 'Une soirée jazz exceptionnelle avec les meilleurs artistes',
        location: 'Salle Pleyel',
        datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours from now
        capacity: 100,
        availableSeats: 75,
        price: 45,
        category: 'concert',
        createdBy: admin._id
      },
      {
        title: 'Conférence Tech',
        description: 'Les dernières tendances technologiques et l\'innovation',
        location: 'Palais des Congrès',
        datetime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        capacity: 200,
        availableSeats: 150,
        price: 25,
        category: 'conference',
        createdBy: admin._id
      },
      {
        title: 'Festival de Musique',
        description: '3 jours de musique en plein air avec 50 artistes',
        location: 'Parc de la Villette',
        datetime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        capacity: 5000,
        availableSeats: 5000,
        price: 89,
        category: 'concert',
        createdBy: admin._id
      },
      {
        title: 'Atelier de Cuisine',
        description: 'Apprenez à cuisiner comme un chef professionnel',
        location: 'Culinary Studio',
        datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        capacity: 20,
        availableSeats: 8,
        price: 65,
        category: 'workshop',
        createdBy: admin._id
      },
      {
        title: 'Meetup Développeurs',
        description: 'Rencontre et networking entre développeurs',
        location: 'Tech Hub',
        datetime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        capacity: 50,
        availableSeats: 0, // Événement complet pour tester la liste d'attente
        price: 0,
        category: 'meetup',
        createdBy: admin._id
      }
    ];

    await Event.insertMany(events);
    console.log('Database seeded successfully!');
    console.log('Admin account: admin@events.com / admin123');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});
