const express = require('express');
const twilio = require('twilio');
const admin = require('firebase-admin');
const app = express();
app.use(express.json());

// Configuration Twilio (inscris-toi sur https://www.twilio.com)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER; // Ex: +19734567890
const client = twilio(accountSid, authToken);

// Initialiser Firebase Admin (pour lire les données)
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Envoyer SMS après inscription
app.post('/api/send-welcome-sms', async (req, res) => {
    const { phone, name, city } = req.body;
    
    try {
        const message = await client.messages.create({
            body: `🎉 Bienvenue ${name} sur MenagePro ! 
Votre inscription a été enregistrée avec succès.
Nous vous contacterons dès qu'une offre correspond à votre profil dans ${city}.
Merci de faire partie de notre réseau !`,
            from: twilioPhone,
            to: `+237${phone}`
        });
        
        // Sauvegarder dans Firestore
        await db.collection('sms_logs').add({
            phone: phone,
            type: 'welcome',
            status: 'sent',
            messageId: message.sid,
            sentAt: new Date().toISOString()
        });
        
        res.json({ success: true, messageId: message.sid });
    } catch (error) {
        console.error('Erreur SMS:', error);
        res.json({ success: false, error: error.message });
    }
});

// Envoyer SMS pour nouvelle mission
app.post('/api/send-mission-sms', async (req, res) => {
    const { workerPhone, clientName, date, time, address, workerName } = req.body;
    
    try {
        const message = await client.messages.create({
            body: `🧹 Nouvelle mission MenagePro !
Client: ${clientName}
Date: ${date}
Heure: ${time}
Adresse: ${address}

À confirmer dans l'application.`,
            from: twilioPhone,
            to: `+237${workerPhone}`
        });
        
        await db.collection('sms_logs').add({
            phone: workerPhone,
            type: 'new_mission',
            status: 'sent',
            messageId: message.sid,
            sentAt: new Date().toISOString()
        });
        
        res.json({ success: true, messageId: message.sid });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Envoyer SMS de confirmation paiement
app.post('/api/send-payment-sms', async (req, res) => {
    const { phone, amount, workerName, transactionId } = req.body;
    
    try {
        const message = await client.messages.create({
            body: `✅ Paiement confirmé MenagePro
Montant: ${amount} FCFA
Prestataire: ${workerName}
Transaction: ${transactionId}

Merci pour votre confiance !`,
            from: twilioPhone,
            to: `+237${phone}`
        });
        
        res.json({ success: true, messageId: message.sid });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Envoyer alerte admin (WhatsApp ou SMS)
app.post('/api/admin-alert', async (req, res) => {
    const { adminPhone, message: alertMessage } = req.body;
    
    try {
        const message = await client.messages.create({
            body: `🔔 ALERTE MenagePro: ${alertMessage}`,
            from: twilioPhone,
            to: `+237${adminPhone}`
        });
        
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false });
    }
});

app.listen(3001, () => {
    console.log('API SMS démarrée sur port 3001');
});
