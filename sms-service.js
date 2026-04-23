// Configuration API
const SMS_API_URL = 'https://ton-backend.com'; // Remplacer par ton URL

// Envoyer SMS bienvenue après inscription
export async function sendWelcomeSms(phone, name, city) {
    try {
        const response = await fetch(`${SMS_API_URL}/api/send-welcome-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, name, city })
        });
        const data = await response.json();
        if (data.success) {
            console.log('✅ SMS bienvenue envoyé');
            return true;
        }
    } catch (error) {
        console.error('Erreur SMS bienvenue:', error);
        return false;
    }
}

// Envoyer notification mission
export async function sendMissionSms(workerPhone, clientName, date, time, address, workerName) {
    try {
        const response = await fetch(`${SMS_API_URL}/api/send-mission-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workerPhone, clientName, date, time, address, workerName })
        });
        return await response.json();
    } catch (error) {
        console.error(error);
        return { success: false };
    }
}

// Envoyer confirmation paiement
export async function sendPaymentSms(phone, amount, workerName, transactionId) {
    try {
        const response = await fetch(`${SMS_API_URL}/api/send-payment-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, amount, workerName, transactionId })
        });
        return await response.json();
    } catch (error) {
        console.error(error);
        return { success: false };
    }
}

// Alerte admin (nouvelle inscription, paiement, etc.)
export async function sendAdminAlert(adminPhone, message) {
    try {
        await fetch(`${SMS_API_URL}/api/admin-alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPhone, message })
        });
    } catch (error) {
        console.error(error);
    }
}
