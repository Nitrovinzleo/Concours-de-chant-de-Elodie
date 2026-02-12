const seatService = require('../services/seatService');

async function fixBookings() {
    try {
        console.log('Correction des réservations...');
        
        // Données réelles des événements
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
            
            console.log(`Événement ${eventId}: ${bookedCount} places à réserver correctement`);
            
            // Récupérer toutes les places disponibles
            const eventSeats = await seatService.getEventSeats(eventId);
            const availableSeats = [];
            
            for (const [seatNumber, seatData] of Object.entries(eventSeats.seats)) {
                if (!seatData.isBooked) {
                    availableSeats.push(seatNumber);
                }
            }
            
            // Réserver aléatoirement le bon nombre de places
            for (let i = 0; i < Math.min(bookedCount, availableSeats.length); i++) {
                const randomIndex = Math.floor(Math.random() * availableSeats.length);
                const seatNumber = availableSeats.splice(randomIndex, 1)[0];
                
                await seatService.bookSeats(eventId, [seatNumber], Math.floor(Math.random() * 1000) + 1);
            }
        }
        
        console.log('Correction terminée avec succès !');
        
    } catch (error) {
        console.error('Erreur lors de la correction:', error);
    }
}

fixBookings();
