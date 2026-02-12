const fs = require('fs').promises;
const path = require('path');

async function syncBookingsWithSeats() {
    try {
        // Charger les données de places
        const seatsDataPath = path.join(__dirname, '../data/seats.json');
        const seatsData = JSON.parse(await fs.readFile(seatsDataPath, 'utf8'));
        
        // Charger les données de réservations depuis le server.js
        // Simuler les réservations existantes basées sur availableSeats
        const events = [
            { _id: 1, availableSeats: 15342, capacity: 20000 },    // Concert Lady Gaga
            { _id: 2, availableSeats: 1200, capacity: 8000 },      // Festival K-Pop Night
            { _id: 3, availableSeats: 230, capacity: 1500 },       // Showcase Rap FR
            { _id: 4, availableSeats: 4, capacity: 200000 },        // Elodie
            { _id: 5, availableSeats: 0, capacity: 5000 }           // Tech Conference
        ];
        
        for (const event of events) {
            const eventId = event._id.toString();
            
            if (!seatsData.events[eventId]) {
                console.log(`Événement ${eventId} non trouvé dans seats.json`);
                continue;
            }
            
            const eventSeats = seatsData.events[eventId].seats;
            const totalSeats = Object.keys(eventSeats).length;
            const bookedCount = totalSeats - event.availableSeats;
            
            console.log(`Événement ${eventId}: ${event.availableSeats}/${event.capacity} disponibles, ${bookedCount} places à réserver`);
            
            // Réserver aléatoirement le nombre de places nécessaires
            const seatNumbers = Object.keys(eventSeats);
            const bookedSeats = [];
            
            for (let i = 0; i < bookedCount; i++) {
                const randomIndex = Math.floor(Math.random() * seatNumbers.length);
                const seatNumber = seatNumbers.splice(randomIndex, 1)[0];
                bookedSeats.push(seatNumber);
            }
            
            // Marquer les places comme réservées
            for (const seatNumber of bookedSeats) {
                if (eventSeats[seatNumber]) {
                    eventSeats[seatNumber].isBooked = true;
                    eventSeats[seatNumber].bookedBy = Math.floor(Math.random() * 1000) + 1; // ID utilisateur aléatoire
                    eventSeats[seatNumber].bookingDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(); // Date aléatoire dans la dernière semaine
                }
            }
            
            seatsData.events[eventId].lastUpdated = new Date().toISOString();
        }
        
        // Sauvegarder le fichier mis à jour
        await fs.writeFile(seatsDataPath, JSON.stringify(seatsData, null, 2));
        console.log('Synchronisation terminée !');
        
    } catch (error) {
        console.error('Erreur lors de la synchronisation:', error);
    }
}

syncBookingsWithSeats();
