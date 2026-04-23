// Dans ta page d'inscription existante
import { sendWelcomeSms, sendAdminAlert } from './sms-service.js';

async function inscriptionFemme(data) {
    try {
        // 1. Sauvegarder dans Firestore
        const docRef = await addDoc(collection(db, "women"), {
            fullName: data.nom,
            age: data.age,
            phone: data.telephone,
            city: data.ville,
            status: "active",
            createdAt: new Date().toISOString()
        });
        
        // 2. Envoyer SMS de bienvenue à la femme
        await sendWelcomeSms(data.telephone, data.nom, data.ville);
        
        // 3. Alerter l'admin par SMS
        await sendAdminAlert('692030989', `Nouvelle inscription: ${data.nom} (${data.ville})`);
        
        alert('✅ Inscription réussie ! Un SMS de confirmation vous a été envoyé.');
        
    } catch (error) {
        console.error(error);
        alert('❌ Erreur lors de l\'inscription');
    }
}
