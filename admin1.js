import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuration Firebase (remplace par TES identifiants)
const firebaseConfig = {
    apiKey: "TA_CLE_API",
    authDomain: "TON_PROJET.firebaseapp.com",
    projectId: "TON_PROJET_ID",
    storageBucket: "TON_PROJET.appspot.com",
    messagingSenderId: "TON_SENDER_ID",
    appId: "TON_APP_ID"
};

// Initialisation
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables globales
let allWomen = [];
let filteredWomen = [];
let currentPage = 1;
const itemsPerPage = 10;

// Éléments DOM
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const cityFilter = document.getElementById('cityFilter');
const statusFilter = document.getElementById('statusFilter');
const exportBtn = document.getElementById('exportCsvBtn');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const totalWomenSpan = document.getElementById('totalWomen');
const totalCitiesSpan = document.getElementById('totalCities');
const newThisWeekSpan = document.getElementById('newThisWeek');
const userEmailSpan = document.getElementById('userEmail');

// Modal
const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.querySelector('.close');
const cancelBtn = document.querySelector('.btn-cancel');

// Vérifier authentification
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        userEmailSpan.textContent = user.email;
        loadWomenRealtime();
    }
});

// Déconnexion
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
});

// Chargement en temps réel avec Firestore
function loadWomenRealtime() {
    const q = query(collection(db, "women"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        allWomen = [];
        snapshot.forEach((doc) => {
            allWomen.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Mettre à jour les filtres
        updateCityFilter();
        applyFilters();
        updateStats();
    }, (error) => {
        console.error("Erreur chargement:", error);
        tableBody.innerHTML = '<tr><td colspan="9" class="loading-row">❌ Erreur chargement données</td></tr>';
    });
}

// Mettre à jour le filtre des villes
function updateCityFilter() {
    const cities = [...new Set(allWomen.map(w => w.city).filter(c => c))];
    cityFilter.innerHTML = '<option value="">Toutes les villes</option>';
    cities.forEach(city => {
        cityFilter.innerHTML += `<option value="${city}">${city}</option>`;
    });
}

// Appliquer tous les filtres
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCity = cityFilter.value;
    const selectedStatus = statusFilter.value;
    
    filteredWomen = allWomen.filter(women => {
        const matchSearch = !searchTerm || 
            women.fullName?.toLowerCase().includes(searchTerm) ||
            women.phone?.includes(searchTerm) ||
            women.city?.toLowerCase().includes(searchTerm);
        
        const matchCity = !selectedCity || women.city === selectedCity;
        const matchStatus = !selectedStatus || women.status === selectedStatus;
        
        return matchSearch && matchCity && matchStatus;
    });
    
    currentPage = 1;
    renderTable();
}

// Rendre le tableau avec pagination
function renderTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageWomen = filteredWomen.slice(start, end);
    const totalPages = Math.ceil(filteredWomen.length / itemsPerPage);
    
    if (filteredWomen.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="loading-row">📭 Aucune inscrite trouvée</td></tr>';
    } else {
        tableBody.innerHTML = pageWomen.map(women => `
            <tr>
                <td class="photo-cell">
                    <img src="${women.photoUrl || 'https://via.placeholder.com/40'}" alt="photo" onerror="this.src='https://via.placeholder.com/40'">
                </td>
                <td><strong>${escapeHtml(women.fullName || '')}</strong></td>
                <td>${women.age || '-'} ans</td>
                <td>${women.phone || '-'}</td>
                <td>${women.city || '-'}</td>
                <td>${women.experience || 0} an(s)</td>
                <td>
                    <span class="status-badge status-${women.status === 'active' ? 'active' : 'inactive'}">
                        ${women.status === 'active' ? '✅ Active' : '⛔ Inactive'}
                    </span>
                </td>
                <td>${formatDate(women.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="editWomen('${women.id}')">✏️ Modifier</button>
                        <button class="btn-delete" onclick="deleteWomen('${women.id}')">🗑️ Supprimer</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    // Mise à jour pagination
    pageInfo.textContent = `Page ${currentPage} / ${totalPages || 1}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Fonctions globales pour les boutons d'action
window.editWomen = async (id) => {
    const women = allWomen.find(w => w.id === id);
    if (!women) return;
    
    document.getElementById('editId').value = women.id;
    document.getElementById('editName').value = women.fullName || '';
    document.getElementById('editAge').value = women.age || '';
    document.getElementById('editPhone').value = women.phone || '';
    document.getElementById('editCity').value = women.city || '';
    document.getElementById('editExperience').value = women.experience || 0;
    document.getElementById('editStatus').value = women.status || 'active';
    
    modal.style.display = 'block';
};

window.deleteWomen = async (id) => {
    if (confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette inscrite ?')) {
        try {
            await deleteDoc(doc(db, "women", id));
            showNotification('✅ Inscrite supprimée avec succès', 'success');
        } catch (error) {
            console.error(error);
            showNotification('❌ Erreur lors de la suppression', 'error');
        }
    }
};

// Sauvegarder modification
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const updatedData = {
        fullName: document.getElementById('editName').value,
        age: parseInt(document.getElementById('editAge').value),
        phone: document.getElementById('editPhone').value,
        city: document.getElementById('editCity').value,
        experience: parseFloat(document.getElementById('editExperience').value),
        status: document.getElementById('editStatus').value,
        updatedAt: new Date().toISOString()
    };
    
    try {
        await updateDoc(doc(db, "women", id), updatedData);
        showNotification('✅ Modification enregistrée', 'success');
        modal.style.display = 'none';
    } catch (error) {
        console.error(error);
        showNotification('❌ Erreur lors de la modification', 'error');
    }
});

// Fermer modal
closeModal.onclick = () => modal.style.display = 'none';
cancelBtn.onclick = () => modal.style.display = 'none';
window.onclick = (event) => {
    if (event.target === modal) modal.style.display = 'none';
};

// Exporter CSV
exportBtn.addEventListener('click', () => {
    const headers = ['Nom complet', 'Âge', 'Téléphone', 'Ville', 'Expérience', 'Statut', "Date d'inscription"];
    const rows = filteredWomen.map(w => [
        w.fullName,
        w.age,
        w.phone,
        w.city,
        w.experience,
        w.status === 'active' ? 'Active' : 'Inactive',
        formatDate(w.createdAt)
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `menagepro_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('📥 Export CSV réussi', 'success');
});

// Rafraîchir
refreshBtn.addEventListener('click', () => {
    applyFilters();
    showNotification('🔄 Données rafraîchies', 'info');
});

// Écouteurs de filtres
searchInput.addEventListener('input', applyFilters);
cityFilter.addEventListener('change', applyFilters);
statusFilter.addEventListener('change', applyFilters);

// Pagination
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredWomen.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
});

// Mettre à jour les statistiques
function updateStats() {
    totalWomenSpan.textContent = allWomen.length;
    
    const cities = new Set(allWomen.map(w => w.city).filter(c => c));
    totalCitiesSpan.textContent = cities.size;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = allWomen.filter(w => {
        if (!w.createdAt) return false;
        const createdDate = new Date(w.createdAt);
        return createdDate >= oneWeekAgo;
    }).length;
    newThisWeekSpan.textContent = newThisWeek;
}

// Utilitaires
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Ajout du style d'animation pour les notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
