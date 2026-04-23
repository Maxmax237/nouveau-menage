const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();
app.use(express.json());

// Configuration Orange Money (à obtenir auprès d'Orange Cameroun)
const ORANGE_CONFIG = {
    merchantId: 'VOTRE_MERCHANT_ID',
    apiKey: 'VOTRE_API_KEY',
    apiSecret: 'VOTRE_API_SECRET',
    baseUrl: 'https://api.orange.com/orange-money-webpay/cm/v1'
};

// Configuration MTN Mobile Money
const MTN_CONFIG = {
    userId: 'VOTRE_USER_ID',
    apiKey: 'VOTRE_API_KEY',
    baseUrl: 'https://sandbox.mtn.cm/momo-api/v1'
};

// Initier paiement Orange Money
app.post('/api/initiate-payment', async (req, res) => {
    const { method, phone, amount, description } = req.body;
    
    try {
        if (method === 'orange') {
            // Obtenir token Orange
            const tokenResponse = await axios.post(`${ORANGE_CONFIG.baseUrl}/token`, {
                grant_type: 'client_credentials'
            }, {
                auth: {
                    username: ORANGE_CONFIG.apiKey,
                    password: ORANGE_CONFIG.apiSecret
                }
            });
            
            const token = tokenResponse.data.access_token;
            
            // Initier paiement
            const paymentResponse = await axios.post(`${ORANGE_CONFIG.baseUrl}/webpayment`, {
                merchant_key: ORANGE_CONFIG.merchantId,
                amount: amount,
                phone_number: phone,
                description: description,
                order_id: generateOrderId(),
                return_url: 'https://menagepro.cm/payment/callback',
                cancel_url: 'https://menagepro.cm/payment/cancel'
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            res.json({
                success: true,
                transactionId: paymentResponse.data.pay_token,
                message: 'Paiement initié, veuillez vérifier votre téléphone'
            });
            
        } else if (method === 'mtn') {
            // MTN Mobile Money
            const apiUser = await axios.post(`${MTN_CONFIG.baseUrl}/v1_0/apiuser`, {
                providerCallbackHost: 'https://menagepro.cm/mtn/callback'
            });
            
            const tokenResponse = await axios.post(`${MTN_CONFIG.baseUrl}/collection/token/`, {}, {
                auth: {
                    username: MTN_CONFIG.userId,
                    password: MTN_CONFIG.apiKey
                }
            });
            
            const paymentResponse = await axios.post(`${MTN_CONFIG.baseUrl}/collection/v1_0/requesttopay`, {
                amount: amount,
                currency: 'EUR',
                externalId: generateOrderId(),
                payer: {
                    partyIdType: 'MSISDN',
                    partyId: phone
                },
                payerMessage: description,
                payeeNote: 'Paiement MenagePro'
            }, {
                headers: {
                    'Authorization': `Bearer ${tokenResponse.data.access_token}`,
                    'X-Reference-Id': apiUser.data.apiKey
                }
            });
            
            res.json({
                success: true,
                transactionId: paymentResponse.data.referenceId,
                message: 'Paiement initié'
            });
        }
    } catch (error) {
        console.error(error);
        res.json({
            success: false,
            message: 'Erreur lors du paiement'
        });
    }
});

// Vérifier statut paiement
app.get('/api/payment-status/:transactionId', async (req, res) => {
    const { transactionId } = req.params;
    
    // Logique pour vérifier statut auprès d'Orange/MTN
    // Retourner { status: 'success' } ou 'failed' ou 'pending'
    
    res.json({ status: 'success' }); // Exemple
});

// Générer ID unique
function generateOrderId() {
    return `MENAGEPRO_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

app.listen(3000, () => {
    console.log('API paiement démarrée sur port 3000');
});
