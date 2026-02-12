const seatService = require('../services/seatService');

async function initializeAllEvents() {
    try {
        console.log('Initialisation de tous les événements...');
        
        // Initialiser tous les événements avec leurs capacités
        await seatService.initializeEventSeats(1, 20000);  // Concert Lady Gaga
        await seatService.initializeEventSeats(2, 8000);   // Festival K-Pop Night  
        await seatService.initializeEventSeats(3, 1500);   // Showcase Rap FR
        await seatService.initializeEventSeats(4, 200000); // Elodie
        await seatService.initializeEventSeats(5, 5000);   // Tech Conference
        
        console.log('Tous les événements ont été initialisés');
        
        // Ajouter les réservations simulées
        const events = [
            { _id: 1, availableSeats: 15342, capacity: 20000 },    // Concert Lady Gaga : 4658 réservées
            { _id: 2, availableSeats: 1200, capacity: 8000 },      // Festival K-Pop Night : 6800 réservées  
            { _id: 3, availableSeats: 230, capacity: 1500 },       // Showcase Rap FR : 1270 réservées
            { _id: 4, availableSeats: 4, capacity: 200000 },        // Elodie : 199996 réservées
            { _id: 5, availableSeats: 0, capacity: 5000 }           // Tech Conference : 5000 réservées
        ];
        
        for (const event of events) {
            const eventId = event._id.toString();
            const bookedCount = event.capacity - event.availableSeats;
            
            console.log(`Événement ${eventId}: ${event.availableSeats}/${event.capacity} disponibles, ${bookedCount} places à réserver`);
            
            // Réserver aléatoirement les places
            for (let i = 0; i < bookedCount; i++) {
                await seatService.bookSeats(eventId, [`TEMP_SEAT_${i}`], Math.floor(Math.random() * 1000) + 1);
            }
        }
        
        console.log('Réservations simulées ajoutées avec succès !');
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
    }
}

initializeAllEvents();
