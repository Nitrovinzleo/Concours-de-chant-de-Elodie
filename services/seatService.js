const fs = require('fs').promises;
const path = require('path');

class SeatService {
    constructor() {
        this.seatsFile = path.join(__dirname, '../data/seats.json');
        this.seatsData = null;
    }

    async loadSeats() {
        try {
            const data = await fs.readFile(this.seatsFile, 'utf8');
            this.seatsData = JSON.parse(data);
        } catch (error) {
            // Si le fichier n'existe pas, le créer avec une structure vide
            this.seatsData = { events: {} };
            await this.saveSeats();
        }
    }

    async saveSeats() {
        try {
            await fs.writeFile(this.seatsFile, JSON.stringify(this.seatsData, null, 2));
        } catch (error) {
            console.error('Error saving seats data:', error);
        }
    }

    async initializeEventSeats(eventId, capacity = 96) {
        if (!this.seatsData) {
            await this.loadSeats();
        }

        if (!this.seatsData.events[eventId]) {
            console.log(`Initialisation des places pour l'événement ${eventId} avec capacité ${capacity}`);
            const seats = this.generateSeatLayout(capacity);
            this.seatsData.events[eventId] = {
                capacity: capacity,
                seats: seats,
                lastUpdated: new Date().toISOString()
            };
            await this.saveSeats();
        }

        return this.seatsData.events[eventId];
    }

    generateSeatLayout(capacity) {
        const seats = {};
        
        // Calculer le nombre de rangées nécessaires (12 places par rangée)
        const seatsPerRow = 12;
        const rowsNeeded = Math.ceil(capacity / seatsPerRow);
        
        // Générer les rangées A-Z si nécessaire
        for (let row = 1; row <= rowsNeeded; row++) {
          // Si on dépasse Z (26), continuer avec AA, AB, etc.
          let rowLabel;
          if (row <= 26) {
            rowLabel = String.fromCharCode(64 + row);
          } else {
            // Pour les rangées au-delà de Z : AA, AB, AC...
            const firstLetter = String.fromCharCode(64 + Math.floor((row - 1) / 26));
            const secondLetter = String.fromCharCode(64 + ((row - 1) % 26) + 1);
            rowLabel = firstLetter + secondLetter;
          }
          
          // Générer les places pour cette rangée
          const seatsInThisRow = Math.min(seatsPerRow, capacity - (row - 1) * seatsPerRow);
          
          for (let seat = 1; seat <= seatsInThisRow; seat++) {
            const seatNumber = `${rowLabel}${seat}`;
            seats[seatNumber] = {
              number: seatNumber,
              row: rowLabel,
              position: seat,
              isBooked: false,
              bookedBy: null,
              bookingDate: null,
              price: this.getSeatPrice(row, rowsNeeded)
            };
          }
        }

        return seats;
    }

    getSeatPrice(row, totalRows) {
    // Prix basé sur la position relative : plus proche de la scène = plus cher
    // Les premières rangées sont les plus chères
    const priceRanges = [
      { maxRow: Math.ceil(totalRows * 0.1), price: 120 },  // 10% premiers : très cher
      { maxRow: Math.ceil(totalRows * 0.25), price: 100 }, // 25% premiers : cher
      { maxRow: Math.ceil(totalRows * 0.5), price: 80 },   // 50% premiers : moyen-cher
      { maxRow: Math.ceil(totalRows * 0.75), price: 60 },  // 75% premiers : moyen
      { maxRow: totalRows, price: 40 }                     // reste : économique
    ];

    for (const range of priceRanges) {
      if (row <= range.maxRow) {
        return range.price;
      }
    }
    
    return 40; // Prix par défaut
  }

    async getEventSeats(eventId) {
        if (!this.seatsData) {
            await this.loadSeats();
        }

        if (!this.seatsData.events[eventId]) {
            await this.initializeEventSeats(eventId);
        }

        return this.seatsData.events[eventId];
    }

    async bookSeats(eventId, seatNumbers, userId) {
        if (!this.seatsData) {
            await this.loadSeats();
        }

        if (!this.seatsData.events[eventId]) {
            await this.initializeEventSeats(eventId);
        }

        const eventSeats = this.seatsData.events[eventId];
        const bookedSeats = [];
        const errors = [];

        for (const seatNumber of seatNumbers) {
            if (!eventSeats.seats[seatNumber]) {
                errors.push(`Place ${seatNumber} n'existe pas`);
                continue;
            }

            if (eventSeats.seats[seatNumber].isBooked) {
                errors.push(`Place ${seatNumber} déjà réservée par un autre utilisateur`);
                continue;
            }

            // Réserver la place
            eventSeats.seats[seatNumber].isBooked = true;
            eventSeats.seats[seatNumber].bookedBy = userId;
            eventSeats.seats[seatNumber].bookingDate = new Date().toISOString();
            
            bookedSeats.push(seatNumber);
        }

        if (bookedSeats.length > 0) {
            eventSeats.lastUpdated = new Date().toISOString();
            await this.saveSeats();
        }

        return {
            success: bookedSeats.length === seatNumbers.length,
            bookedSeats: bookedSeats,
            errors: errors
        };
    }

    async releaseSeats(eventId, seatNumbers) {
        if (!this.seatsData) {
            await this.loadSeats();
        }

        if (!this.seatsData.events[eventId]) {
            return { success: false, errors: [`Événement ${eventId} non trouvé`] };
        }

        const eventSeats = this.seatsData.events[eventId];
        const releasedSeats = [];
        const errors = [];

        for (const seatNumber of seatNumbers) {
            if (!eventSeats.seats[seatNumber]) {
                errors.push(`Place ${seatNumber} n'existe pas`);
                continue;
            }

            if (!eventSeats.seats[seatNumber].isBooked) {
                errors.push(`Place ${seatNumber} n'est pas réservée`);
                continue;
            }

            // Libérer la place
            eventSeats.seats[seatNumber].isBooked = false;
            eventSeats.seats[seatNumber].bookedBy = null;
            eventSeats.seats[seatNumber].bookingDate = null;
            
            releasedSeats.push(seatNumber);
        }

        if (releasedSeats.length > 0) {
            eventSeats.lastUpdated = new Date().toISOString();
            await this.saveSeats();
        }

        return {
            success: releasedSeats.length === seatNumbers.length,
            releasedSeats: releasedSeats,
            errors: errors
        };
    }

    async getBookedSeats(eventId) {
        const eventSeats = await this.getEventSeats(eventId);
        const bookedSeats = [];

        for (const [seatNumber, seatData] of Object.entries(eventSeats.seats)) {
            if (seatData.isBooked) {
                bookedSeats.push(seatNumber);
            }
        }

        return bookedSeats;
    }

    async getAvailableSeats(eventId) {
        const eventSeats = await this.getEventSeats(eventId);
        const availableSeats = [];

        for (const [seatNumber, seatData] of Object.entries(eventSeats.seats)) {
            if (!seatData.isBooked) {
                availableSeats.push(seatNumber);
            }
        }

        return availableSeats;
    }

    async getSeatInfo(eventId, seatNumber) {
        const eventSeats = await this.getEventSeats(eventId);
        return eventSeats.seats[seatNumber] || null;
    }
}

module.exports = new SeatService();
