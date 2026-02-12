# Système de Réservation d'Événements en Temps Réel

Une plateforme complète pour réserver des places à des événements (conférences, concerts, ateliers) avec disponibilité en temps réel et notifications.

## Fonctionnalités

### 🔐 Authentification
- Inscription et connexion des utilisateurs
- Rôles : utilisateur et administrateur
- Tokens JWT pour la sécurité

### 📅 Gestion des Événements
- Création, modification et suppression d'événements (admin uniquement)
- Catégories : conférence, concert, atelier, autre
- Gestion de la capacité et des places disponibles
- Recherche et filtrage des événements

### 🎫 Système de Réservation
- Réservation en temps réel
- Gestion automatique de la liste d'attente
- Notifications par email et SMS
- Synchronisation avec Google Calendar

### 🔄 Mises à Jour en Temps Réel
- WebSocket pour les mises à jour instantanées
- Indicateurs de disponibilité en temps réel
- Notifications de confirmation

### 📱 Notifications
- Emails de confirmation avec template HTML
- SMS de confirmation (Twilio)
- Ajout automatique à Google Calendar
- Notifications de liste d'attente

## Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd event-reservation-system
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos configurations :
- `JWT_SECRET` : Clé secrète pour les tokens JWT
- `MONGODB_URI` : Chaîne de connexion MongoDB
- `EMAIL_USER`, `EMAIL_PASS` : Configuration email (Gmail)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` : Configuration Twilio
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` : Configuration Google Calendar API

4. **Démarrer MongoDB**
Assurez-vous que MongoDB est installé et en cours d'exécution.

5. **Démarrer l'application**
```bash
# Développement
npm run dev

# Production
npm start
```

L'application sera disponible sur `http://localhost:3000`

## API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Informations utilisateur

### Événements
- `GET /api/events` - Lister les événements
- `GET /api/events/:id` - Détails d'un événement
- `POST /api/events` - Créer un événement (admin)
- `PUT /api/events/:id` - Modifier un événement (admin)
- `DELETE /api/events/:id` - Supprimer un événement (admin)

### Réservations
- `POST /api/bookings` - Créer une réservation
- `GET /api/bookings` - Mes réservations
- `GET /api/bookings/:id` - Détails d'une réservation
- `PUT /api/bookings/:id/cancel` - Annuler une réservation

## WebSocket Events

### Client → Serveur
- `join-event` : Rejoindre la room d'un événement
- `leave-event` : Quitter la room d'un événement

### Serveur → Client
- `seat-update` : Mise à jour des places disponibles
- `booking-confirmed` : Notification de confirmation

## Structure du Projet

```
├── models/                 # Modèles Mongoose
│   ├── User.js
│   ├── Event.js
│   └── Booking.js
├── routes/                 # Routes Express
│   ├── auth.js
│   ├── events.js
│   └── bookings.js
├── middleware/             # Middlewares
│   └── auth.js
├── services/               # Services externes
│   └── notificationService.js
├── public/                 # Frontend
│   ├── index.html
│   └── app.js
├── server.js               # Serveur principal
├── package.json
└── README.md
```

## Configuration des Services Externes

### Twilio (SMS)
1. Créez un compte Twilio gratuit
2. Récupérez votre Account SID et Auth Token
3. Obtenez un numéro de téléphone Twilio
4. Configurez les variables d'environnement correspondantes

### Google Calendar API
1. Créez un projet dans Google Cloud Console
2. Activez Google Calendar API
3. Créez des identifiants OAuth 2.0
4. Configurez les variables d'environnement

### Email (Gmail)
1. Activez l'authentification en deux facteurs
2. Générez un mot de passe d'application
3. Configurez les variables d'environnement email

## Développement

### Scripts disponibles
- `npm start` : Démarrer en mode production
- `npm run dev` : Démarrer avec nodemon
- `npm test` : Lancer les tests

### Fonctionnalités en développement
- Tests unitaires
- Documentation API avec Swagger
- Interface admin avancée
- Analytics et rapports

## Sécurité

- Tokens JWT avec expiration
- Validation des entrées avec express-validator
- Hachage des mots de passe avec bcryptjs
- Protection CORS
- Rôles et permissions

## Contribuer

1. Fork le projet
2. Créer une branche feature
3. Commit vos changements
4. Push vers la branche
5. Créer une Pull Request

## Licence

MIT License
