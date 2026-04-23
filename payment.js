// Configuration
const COMMISSION_RATE = 0.10; // 10% de commission
let currentTotal = 0;
let discount = 0;

// Récupérer les paramètres de la requête (depuis la page de réservation)
const urlParams = new URLSearchParams(window.location.search);
const workerId = urlParams.get('workerId');
const hours = parseInt(urlParams.get('hours')) || 4;
const hourlyRate = parseInt(urlParams.get('rate')) || 2500;

// Afficher les détails de la commande
document.getElementById('workerName').textContent = urlParams.get('workerName') || 'Marie Claire';
document.getElementById('duration').textContent = `${hours} heure${hours > 1 ? 's' : ''}`;
document.getElementById('hourlyRate').textContent = `${hourlyRate.toLocaleString()} FCFA`;

const subtotal = hours * hourlyRate;
const commission = subtotal * COMMISSION_RATE;
currentTotal = subtotal + commission;

document.getElementById('totalAmount').textContent = `${currentTotal.toLocaleString()} FCFA`;
document.getElementById('commission').textContent = `${commission.toLocaleString()} FCFA`;

// Appliquer code promo
document.getElementById('applyPromoBtn').addEventListener('click', async () => {
    const promoCode = document.getElementById('promoCode').value;
    if (!promoCode) return;
    
    try {
        // Vérifier code promo (appel API)
        const response = await fetch('https://ton-backend.com/api/verify-promo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: promoCode })
        });
        
        const data = await response.json();
        if (data.valid) {
            discount = data.discount;
            const newTotal = currentTotal - (currentTotal * discount / 100);
            document.getElementById('totalAmount').textContent = `${newTotal.toLocaleString()} FCFA`;
            alert(`✅ Code promo appliqué : ${discount}% de réduction !`);
        } else {
            alert('❌ Code promo invalide');
        }
    } catch (error) {
        console.error(error);
        alert('❌ Erreur lors de la vérification du code promo');
    }
});

// Paiement
document.getElementById('payBtn').addEventListener('click', async () => {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    
    // Validation
    if (!phoneNumber || phoneNumber.length !== 9 || !phoneNumber.match(/^[62]\d{8}$/)) {
        alert('❌ Numéro de téléphone invalide. Format: 6XXXXXXXX ou 2XXXXXXXX');
        return;
    }
    
    const fullPhone = `237${phoneNumber}`;
    
    // Vérifier que le numéro correspond au réseau
    if (method === 'orange' && !phoneNumber.startsWith('6')) {
        alert('❌ Orange Money fonctionne avec les numéros commençant par 6');
        return;
    }
    if (method === 'mtn' && !phoneNumber.startsWith('6')) {
        alert('❌ MTN Mobile Money fonctionne avec les numéros commençant par 6');
        return;
    }
    
    // Afficher modal de confirmation
    const modal = document.getElementById('confirmationModal');
    modal.style.display = 'block';
    
    try {
        // Appel API de paiement
        const paymentResponse = await fetch('https://ton-backend.com/api/initiate-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                method: method,
                phone: fullPhone,
                amount: currentTotal - (currentTotal * discount / 100),
                workerId: workerId,
                hours: hours,
                description: `Paiement MenagePro - ${hours}h avec ${urlParams.get('workerName')}`
            })
        });
        
        const paymentData = await paymentResponse.json();
        
        if (paymentData.success) {
            // Attendre la confirmation du paiement
            await checkPaymentStatus(paymentData.transactionId);
        } else {
            throw new Error(paymentData.message);
        }
    } catch (error) {
        console.error(error);
        document.getElementById('modalBody').innerHTML = `
            <div class="error-icon">
                <i class="fas fa-times-circle"></i>
            </div>
            <h3>❌ Paiement échoué</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" class="btn-pay" style="margin-top: 20px;">Réessayer</button>
        `;
    }
});

// Vérifier statut paiement
async function checkPaymentStatus(transactionId) {
    let attempts = 0;
    const maxAttempts = 30; // 30 secondes max
    
    const interval = setInterval(async () => {
        attempts++;
        
        try {
            const statusResponse = await fetch(`https://ton-backend.com/api/payment-status/${transactionId}`);
            const statusData = await statusResponse.json();
            
            if (statusData.status === 'success') {
                clearInterval(interval);
                document.getElementById('modalBody').innerHTML = `
                    <div class="success-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>✅ Paiement réussi !</h3>
                    <p>Votre réservation a été confirmée.</p>
                    <p>Un SMS de confirmation a été envoyé au ${document.getElementById('phoneNumber').value}</p>
                    <button onclick="window.location.href='/' " class="btn-pay" style="margin-top: 20px;">Retour à l'accueil</button>
                `;
                
                // Enregistrer la transaction dans Firestore
                await saveTransaction(transactionId, 'success');
                
            } else if (statusData.status === 'failed') {
                clearInterval(interval);
                document.getElementById('modalBody').innerHTML = `
                    <div class="error-icon">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <h3>❌ Paiement échoué</h3>
                    <p>Transaction annulée ou refusée.</p>
                    <button onclick="location.reload()" class="btn-pay" style="margin-top: 20px;">Réessayer</button>
                `;
                await saveTransaction(transactionId, 'failed');
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                if (statusData.status !== 'success') {
                    document.getElementById('modalBody').innerHTML = `
                        <div class="error-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <h3>⏰ Délai dépassé</h3>
                        <p>Veuillez vérifier le statut de votre paiement dans votre application mobile.</p>
                        <button onclick="location.reload()" class="btn-pay" style="margin-top: 20px;">Fermer</button>
                    `;
                }
            }
        } catch (error) {
            console.error(error);
        }
    }, 1000);
}

// Sauvegarder transaction dans Firestore
async function saveTransaction(transactionId, status) {
    // Code pour sauvegarder dans Firestore (similaire à l'admin)
    console.log(`Transaction ${transactionId} : ${status}`);
}
