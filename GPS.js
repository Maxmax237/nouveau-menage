// Géolocaliser la femme de ménage lors de l'inscription
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Stocker dans Firestore
        await updateDoc(doc(db, "women", docRef.id), {
            lat: lat,
            lng: lng
        });
    });
}
