const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { google } = require('googleapis');
const Booking = require('../models/Booking');

class NotificationService {
  constructor() {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      this.googleCalendar = google.calendar({
        version: 'v3',
        auth: new google.auth.JWT(
          process.env.GOOGLE_CLIENT_EMAIL,
          null,
          process.env.GOOGLE_PRIVATE_KEY,
          ['https://www.googleapis.com/auth/calendar']
        )
      });
    }
  }

  async sendBookingConfirmation(booking) {
    try {
      await this.sendEmailConfirmation(booking);
      await this.sendSMSConfirmation(booking);
      await this.addToGoogleCalendar(booking);
    } catch (error) {
      console.error('Notification service error:', error);
      throw error;
    }
  }

  async sendEmailConfirmation(booking) {
    if (!this.emailTransporter) {
      console.log('Email service not configured');
      return;
    }
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: booking.user.email,
      subject: `Confirmation de réservation - ${booking.event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Confirmation de réservation</h2>
          <p>Bonjour ${booking.user.profileData?.firstName || 'Cher client'},</p>
          <p>Votre réservation a été confirmée avec succès!</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Détails de l'événement</h3>
            <p><strong>Titre:</strong> ${booking.event.title}</p>
            <p><strong>Lieu:</strong> ${booking.event.location}</p>
            <p><strong>Date:</strong> ${new Date(booking.event.datetime).toLocaleString('fr-FR')}</p>
            <p><strong>Nombre de places:</strong> ${booking.numberOfSeats}</p>
            <p><strong>Code de confirmation:</strong> <span style="background-color: #007bff; color: white; padding: 5px 10px; border-radius: 3px;">${booking.confirmationCode}</span></p>
          </div>
          
          <p>Veuillez présenter ce code de confirmation à l'entrée.</p>
          <p>Merci de votre confiance!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">Ceci est un email automatique. Merci de ne pas répondre.</p>
        </div>
      `
    };

    await this.emailTransporter.sendMail(mailOptions);
    
    await Booking.findByIdAndUpdate(booking._id, {
      'notifications.email.sent': true,
      'notifications.email.sentAt': new Date()
    });
  }

  async sendSMSConfirmation(booking) {
    if (!this.twilioClient || !booking.user.profileData?.phone) {
      console.log('SMS service not configured or no phone number provided');
      return;
    }

    const message = await this.twilioClient.messages.create({
      body: `Confirmation réservation ${booking.event.title} - Code: ${booking.confirmationCode} - ${new Date(booking.event.datetime).toLocaleString('fr-FR')}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: booking.user.profileData.phone
    });

    await Booking.findByIdAndUpdate(booking._id, {
      'notifications.sms.sent': true,
      'notifications.sms.sentAt': new Date()
    });

    return message;
  }

  async addToGoogleCalendar(booking) {
    if (!this.googleCalendar) {
      console.log('Google Calendar service not configured');
      return;
    }
    const event = {
      summary: `Réservation: ${booking.event.title}`,
      location: booking.event.location,
      description: `Code de confirmation: ${booking.confirmationCode}`,
      start: {
        dateTime: booking.event.datetime,
        timeZone: 'Europe/Paris'
      },
      end: {
        dateTime: new Date(new Date(booking.event.datetime).getTime() + 2 * 60 * 60 * 1000),
        timeZone: 'Europe/Paris'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 }
        ]
      }
    };

    try {
      const response = await this.googleCalendar.events.insert({
        calendarId: 'primary',
        resource: event
      });
      return response;
    } catch (error) {
      console.error('Google Calendar error:', error);
    }
  }

  async sendWaitlistConfirmation(booking) {
    if (!this.emailTransporter) {
      console.log('Email service not configured');
      return;
    }
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: booking.user.email,
      subject: `Place disponible - ${booking.event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Bonne nouvelle!</h2>
          <p>Bonjour ${booking.user.profileData?.firstName || 'Cher client'},</p>
          <p>Une place est disponible pour l'événement que vous attendiez:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Détails de l'événement</h3>
            <p><strong>Titre:</strong> ${booking.event.title}</p>
            <p><strong>Lieu:</strong> ${booking.event.location}</p>
            <p><strong>Date:</strong> ${new Date(booking.event.datetime).toLocaleString('fr-FR')}</p>
            <p><strong>Nombre de places:</strong> ${booking.numberOfSeats}</p>
            <p><strong>Code de confirmation:</strong> <span style="background-color: #28a745; color: white; padding: 5px 10px; border-radius: 3px;">${booking.confirmationCode}</span></p>
          </div>
          
          <p>Votre réservation est maintenant confirmée!</p>
          <p>Merci de votre patience!</p>
        </div>
      `
    };

    await this.emailTransporter.sendMail(mailOptions);
  }
}

module.exports = new NotificationService();
