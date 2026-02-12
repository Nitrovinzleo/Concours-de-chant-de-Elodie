const seatService = require('../services/seatService');

async function resetEventsForTesting() {
    try {
        console.log('Réinitialisation des événements pour les tests...');
        
        // Nouvelles capacités réduites pour les tests
        const testEvents = [
            { _id: 1, capacity: 50, title: 'Concert Test' },      // Petit événement
            { _id: 2, capacity: 20, title: 'Festival Test' },     // Très petit événement
            { _id: 3, capacity: 30, title: 'Showcase Test' },    // Petit événement
            { _id: 4, capacity: 15, title: 'Elodie Test' },      // Mini événement
            { _id: 5, capacity: 10, title: 'Conference Test' }   // Très petit événement
        ];
        
        for (const event of testEvents) {
            const eventId = event._id.toString();
            
            console.log(`Réinitialisation de l'événement ${eventId} (${event.title}) avec capacité ${event.capacity}`);
            
            // Réinitialiser complètement l'événement
            await seatService.initializeEventSeats(eventId, event.capacity);
            
            // Libérer toutes les places (aucune réservation)
            const eventSeats = await seatService.getEventSeats(eventId);
            const allSeats = Object.keys(eventSeats.seats);
            
            // S'assurer que toutes les places sont libres
            for (const seatNumber of allSeats) {
                if (eventSeats.seats[seatNumber].isBooked) {
                    // Libérer la place
                    await seatService.releaseSeats(eventId, [seatNumber]);
                }
            }
        }
        
        console.log('Réinitialisation terminée !');
        console.log('Tous les événements ont des capacités réduites et aucune place réservée');
        
    } catch (error) {
        console.error('Erreur lors de la réinitialisation:', error);
    }
}

resetEventsForTesting();
