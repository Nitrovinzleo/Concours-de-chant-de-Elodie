class EventReservationApp {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.socket = null;
        this.currentEvents = [];
        
        this.init();
    }

    init() {
        if (this.token) {
            this.showDashboard();
            this.connectSocket();
            this.loadEvents();
        } else {
            this.showAuth();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auth forms
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Search and filter
        document.getElementById('searchInput').addEventListener('input', () => {
            this.loadEvents();
        });

        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.loadEvents();
        });
    }

    showAuth() {
        document.getElementById('authSection').style.display = 'flex';
        document.getElementById('dashboardSection').style.display = 'none';
    }

    showDashboard() {
        console.log('Showing dashboard...');
        const authSection = document.getElementById('authSection');
        const dashboardSection = document.getElementById('dashboardSection');
        const userName = document.getElementById('userName');
        
        console.log('Elements found:', {
            authSection: !!authSection,
            dashboardSection: !!dashboardSection,
            userName: !!userName
        });
        
        if (authSection) {
            authSection.style.display = 'none';
            console.log('Auth section hidden');
        }
        if (dashboardSection) {
            dashboardSection.style.display = 'block';
            console.log('Dashboard section shown, computed style:', window.getComputedStyle(dashboardSection).display);
        }
        if (userName) {
            userName.textContent = this.user.profileData?.firstName || this.user.email;
            console.log('Username set to:', this.user.profileData?.firstName || this.user.email);
        }
        
        // Forcer le reflow
        dashboardSection.offsetHeight;
        
        console.log('Dashboard should be visible now');
        
        // Test visuel simple
        setTimeout(() => {
            dashboardSection.style.backgroundColor = 'red';
            console.log('Background changed to red for testing');
        }, 1000);
    }

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Login successful:', data);
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                
                // Rediriger vers le dashboard
                window.location.href = '/dashboard.html';
            } else {
                this.showNotification(data.message || 'Erreur de connexion', 'error');
            }
        } catch (error) {
            this.showNotification('Erreur de connexion', 'error');
        }
    }

    async register() {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        const phone = document.getElementById('registerPhone').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    profileData: {
                        firstName,
                        lastName,
                        phone
                    }
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                
                // Rediriger vers le dashboard
                window.location.href = '/dashboard.html';
                this.showNotification('Inscription réussie!', 'success');
            } else {
                this.showNotification(data.message || 'Erreur d\'inscription', 'error');
            }
        } catch (error) {
            this.showNotification('Erreur d\'inscription', 'error');
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = {};
        if (this.socket) {
            this.socket.disconnect();
        }
        this.showAuth();
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('seat-update', (data) => {
            this.updateEventSeats(data.eventId, data.availableSeats);
        });

        this.socket.on('booking-confirmed', (data) => {
            if (data.userId === this.user.id) {
                this.showNotification('Votre réservation a été confirmée!', 'success');
                this.loadEvents();
            }
        });
    }

    async loadEvents() {
        console.log('Loading events...');
        const search = document.getElementById('searchInput').value;
        const category = document.getElementById('categoryFilter').value;
        
        let url = '/api/events?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (category) url += `category=${category}&`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('Events response:', data);
            
            if (response.ok) {
                this.currentEvents = data.events;
                this.renderEvents(data.events);
            } else {
                console.error('Error loading events:', data);
                this.showNotification('Erreur lors du chargement des événements', 'error');
            }
        } catch (error) {
            console.error('Network error:', error);
            this.showNotification('Erreur lors du chargement des événements', 'error');
        }
    }

    renderEvents(events) {
        console.log('Rendering events:', events);
        const grid = document.getElementById('eventsGrid');
        
        console.log('Grid element found:', !!grid);
        console.log('Grid innerHTML before:', grid.innerHTML);
        
        if (events.length === 0) {
            grid.innerHTML = '<div class="col-12"><div class="alert alert-info">Aucun événement trouvé</div></div>';
            console.log('No events message set');
            return;
        }

        const html = events.map(event => {
            console.log('Processing event:', event);
            const seatStatus = this.getSeatStatus(event.availableSeats, event.capacity);
            const eventDate = new Date(event.datetime);
            const isFull = event.availableSeats === 0;
            
            return `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card event-card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title">${event.title}</h5>
                                <span class="badge bg-secondary">${this.getCategoryLabel(event.category)}</span>
                            </div>
                            
                            <p class="card-text">
                                <i class="fas fa-map-marker-alt text-muted"></i> ${event.location}<br>
                                <i class="fas fa-clock text-muted"></i> ${eventDate.toLocaleString('fr-FR')}<br>
                                <i class="fas fa-users text-muted"></i> 
                                <span class="seat-indicator ${seatStatus.class}"></span>
                                ${event.availableSeats}/${event.capacity} places disponibles
                            </p>
                            
                            ${event.description ? `<p class="card-text text-muted">${event.description.substring(0, 100)}...</p>` : ''}
                            
                            ${event.price > 0 ? `<p class="card-text"><strong>${event.price}€</strong></p>` : ''}
                            
                            <div class="d-grid gap-2">
                                <button class="btn ${isFull ? 'btn-secondary' : 'btn-primary'}" 
                                        onclick="app.bookEvent('${event._id}')"
                                        ${isFull ? 'disabled' : ''}>
                                    ${isFull ? 'Complet' : 'Réserver'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        grid.innerHTML = html;
        console.log('Grid innerHTML after:', grid.innerHTML);
        console.log('Number of event cards rendered:', events.length);
    }

    getSeatStatus(available, total) {
        const percentage = (available / total) * 100;
        
        if (percentage === 0) {
            return { class: 'seat-full', text: 'Complet' };
        } else if (percentage < 20) {
            return { class: 'seat-limited', text: 'Places limitées' };
        } else {
            return { class: 'seat-available', text: 'Disponible' };
        }
    }

    getCategoryLabel(category) {
                const labels = {
                    'conference': 'Conférence',
                    'concert': 'Concert',
                    'workshop': 'Atelier',
                    'meetup': 'Meetup',
                    'other': 'Autre'
                };
                return labels[category] || category;
            }

    async bookEvent(eventId) {
        if (!this.token) {
            this.showNotification('Veuillez vous connecter pour réserver', 'error');
            return;
        }

        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ eventId })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification(`Réservation confirmée! Code: ${data.confirmation}`, 'success');
                this.loadEvents();
                
                // Join event room for real-time updates
                if (this.socket) {
                    this.socket.emit('join-event', eventId);
                }
            } else {
                this.showNotification(data.message || 'Erreur de réservation', 'error');
            }
        } catch (error) {
            this.showNotification('Erreur de réservation', 'error');
        }
    }

    updateEventSeats(eventId, availableSeats) {
        const event = this.currentEvents.find(e => e._id === eventId);
        if (event) {
            event.availableSeats = availableSeats;
            this.renderEvents(this.currentEvents);
        }
    }

    async showMyBookings() {
        if (!this.token) {
            this.showNotification('Veuillez vous connecter', 'error');
            return;
        }

        try {
            const response = await fetch('/api/bookings', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.renderBookings(data.bookings);
                const modal = new bootstrap.Modal(document.getElementById('bookingsModal'));
                modal.show();
            } else {
                this.showNotification('Erreur lors du chargement des réservations', 'error');
            }
        } catch (error) {
            this.showNotification('Erreur lors du chargement des réservations', 'error');
        }
    }

    renderBookings(bookings) {
        const list = document.getElementById('bookingsList');
        
        if (bookings.length === 0) {
            list.innerHTML = '<div class="alert alert-info">Aucune réservation trouvée</div>';
            return;
        }

        list.innerHTML = bookings.map(booking => {
            const eventDate = new Date(booking.event.datetime);
            const statusClass = booking.status === 'confirmed' ? 'success' : 
                               booking.status === 'waitlist' ? 'warning' : 'secondary';
            
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <h6 class="card-title">${booking.event.title}</h6>
                                <p class="card-text mb-1">
                                    <i class="fas fa-map-marker-alt text-muted"></i> ${booking.event.location}<br>
                                    <i class="fas fa-clock text-muted"></i> ${eventDate.toLocaleString('fr-FR')}<br>
                                    <i class="fas fa-ticket-alt text-muted"></i> Code: <strong>${booking.confirmationCode}</strong>
                                </p>
                            </div>
                            <div class="col-md-4 text-end">
                                <span class="badge bg-${statusClass} mb-2">
                                    ${booking.status === 'confirmed' ? 'Confirmée' : 
                                      booking.status === 'waitlist' ? 'Liste d\'attente' : 'Annulée'}
                                </span><br>
                                ${booking.status === 'confirmed' ? 
                                    `<button class="btn btn-sm btn-outline-danger" onclick="app.cancelBooking('${booking._id}')">
                                        Annuler
                                    </button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async cancelBooking(bookingId) {
        if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation?')) {
            return;
        }

        try {
            const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Réservation annulée avec succès', 'success');
                this.showMyBookings();
                this.loadEvents();
            } else {
                this.showNotification(data.message || 'Erreur d\'annulation', 'error');
            }
        } catch (error) {
            this.showNotification('Erreur d\'annulation', 'error');
        }
    }

    showNotification(message, type = 'info') {
        console.log('Showing notification:', message, type);
        const toast = document.getElementById('notificationToast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.className = `notification-toast toast bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
            
            const toastElement = new bootstrap.Toast(toast);
            toastElement.show();
        } else {
            alert(message); // Fallback si les éléments n'existent pas
        }
    }
}

// Initialize the app
const app = new EventReservationApp();
