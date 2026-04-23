import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase config (la même)
const firebaseConfig = {
    apiKey: "TA_CLE_API",
    authDomain: "TON_PROJET.firebaseapp.com",
    projectId: "TON_PROJET_ID",
    storageBucket: "TON_PROJET.appspot.com",
    messagingSenderId: "TON_SENDER_ID",
    appId: "TON_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let map;
let markers = [];
let workersList = [];
let userLocation = null;

// Initialiser la carte
window.initMap = async () => {
    // Position par défaut : Douala
    const defaultLocation = { lat: 4.051056, lng: 9.7678687 };
    
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 12,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });
    
    // Autocomplete pour la recherche
    const input = document.getElementById('searchInput');
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);
    
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
            userLocation = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            };
            map.setCenter(userLocation);
            map.setZoom(13);
            loadNearbyWorkers();
        }
    });
    
    // Charger toutes les femmes de ménage
    await loadWorkers();
    
    // Géolocalisation utilisateur
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(userLocation);
                map.setZoom(13);
                
                // Ajouter marqueur position utilisateur
                new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    icon: {
                        url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                        scaledSize: new google.maps.Size(40, 40)
                    },
                    title: "Votre position"
                });
                
                loadNearbyWorkers();
            },
            () => {
                console.log("Géolocalisation refusée");
                loadNearbyWorkers();
            }
        );
    }
    
    document.getElementById('searchBtn').addEventListener('click', () => {
        if (userLocation) {
            loadNearbyWorkers();
        } else {
            alert('Veuillez entrer une adresse ou activer la géolocalisation');
        }
    });
};

// Charger les femmes de ménage depuis Firestore
async function loadWorkers() {
    const querySnapshot = await getDocs(collection(db, "women"));
    workersList = [];
    querySnapshot.forEach((doc) => {
        const worker = doc.data();
        if (worker.status === 'active') {
            workersList.push({
                id: doc.id,
                ...worker
            });
        }
    });
}

// Calculer distance (formule Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Charger femmes à proximité
async function loadNearbyWorkers() {
    if (!userLocation) {
        alert('Veuillez d\'abord définir votre position');
        return;
    }
    
    // Nettoyer anciens marqueurs
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    // Calculer distances
    const workersWithDistance = workersList.map(worker => {
        // Simulation de coordonnées (à remplacer par vraies coordonnées stockées en base)
        // Idéalement, stocker lat/lng lors de l'inscription
        const workerLat = worker.lat || (userLocation.lat + (Math.random() - 0.5) * 0.1);
        const workerLng = worker.lng || (userLocation.lng + (Math.random() - 0.5) * 0.1);
        
        const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            workerLat, workerLng
        );
        
        return { ...worker, distance, lat: workerLat, lng: workerLng };
    });
    
    // Trier par distance
    const sorted = workersWithDistance.sort((a, b) => a.distance - b.distance);
    const nearby = sorted.filter(w => w.distance <= 10); // Dans 10 km
    
    // Mettre à jour stats
    document.getElementById('nearbyCount').textContent = nearby.length;
    const avgDistance = nearby.reduce((sum, w) => sum + w.distance, 0) / nearby.length;
    document.getElementById('avgDistance').textContent = avgDistance.toFixed(1);
    
    // Afficher résultats
    displayResults(nearby);
    
    // Ajouter marqueurs sur la carte
    nearby.forEach(worker => {
        const marker = new google.maps.Marker({
            position: { lat: worker.lat, lng: worker.lng },
            map: map,
            title: worker.fullName,
            icon: {
                url: worker.photoUrl || "https://cdn-icons-png.flaticon.com/512/1995/1995572.png",
                scaledSize: new google.maps.Size(40, 40)
            }
        });
        
        // Info window
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 10px;">
                    <strong>${worker.fullName}</strong><br>
                    📍 ${worker.distance.toFixed(1)} km<br>
                    ⭐ ${worker.experience || 0} ans d'expérience<br>
                    <button onclick="bookWorker('${worker.id}')" style="margin-top: 5px; padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Réserver
                    </button>
                </div>
            `
        });
        
        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });
        
        markers.push(marker);
    });
}

// Afficher liste des résultats
function displayResults(workers) {
    const container = document.getElementById('resultsContainer');
    
    if (workers.length === 0) {
        container.innerHTML = '<div class="worker-card">Aucune femme de ménage trouvée à proximité</div>';
        return;
    }
    
    container.innerHTML = workers.map(worker => `
        <div class="worker-card" onclick="bookWorker('${worker.id}')">
            <div class="worker-info">
                <img src="${worker.photoUrl || 'https://via.placeholder.com/60'}" class="worker-avatar" onerror="this.src='https://via.placeholder.com/60'">
                <div class="worker-details">
                    <div class="worker-name">${worker.fullName}</div>
                    <div class="worker-distance">
                        <span class="distance-badge">📍 ${worker.distance.toFixed(1)} km</span>
                    </div>
                    <div class="worker-rating">
                        ${'⭐'.repeat(Math.min(5, Math.floor(worker.experience / 2) || 3))}
                        (${worker.experience || 0} ans exp.)
                    </div>
                    <div>📞 ${worker.phone}</div>
                    <button class="book-btn">📅 Réserver</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Réserver une femme
window.bookWorker = (workerId) => {
    const worker = workersList.find(w => w.id === workerId);
    if (!worker) return;
    
    document.getElementById('bookingWorkerId').value = workerId;
    document.getElementById('bookingWorkerName').value = worker.fullName;
    
    // Date min = aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bookingDate').min = today;
    
    document.getElementById('bookingModal').style.display = 'block';
};

// Soumettre réservation
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bookingData = {
        workerId: document.getElementById('bookingWorkerId').value,
        workerName: document.getElementById('bookingWorkerName').value,
        date: document.getElementById('bookingDate').value,
        time: document.getElementById('bookingTime').value,
        hours: parseInt(document.getElementById('bookingHours').value),
        address: document.getElementById('bookingAddress').value,
        instructions: document.getElementById('bookingInstructions').value,
        clientPhone: localStorage.getItem('userPhone') || '690001122' // À récupérer dynamiquement
    };
    
    // Calculer montant (tarif horaire moyen 2500 FCFA)
    const amount = bookingData.hours * 2500;
    
    // Rediriger vers paiement
    window.location.href = `payment.html?workerId=${bookingData.workerId}&workerName=${encodeURIComponent(bookingData.workerName)}&hours=${bookingData.hours}&rate=2500`;
    
    // Envoyer SMS notification à la femme de ménage
    await fetch('https://ton-backend.com/api/send-mission-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            workerPhone: '690001122', // À récupérer
            clientName: 'Client',
            date: bookingData.date,
            time: bookingData.time,
            address: bookingData.address,
            workerName: bookingData.workerName
        })
    });
});
