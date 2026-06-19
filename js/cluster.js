// Page Clusters : affiche les points de charge colores selon le cluster predit (modele KMeans).
document.addEventListener('DOMContentLoaded', () => {
    const API_CLUSTER = 'php/request.php/predictions/clusters/';

    const map = L.map('map').setView([46.6, 2.5], 6);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const layerClusters = L.layerGroup().addTo(map);

    // Une couleur par cluster (5 clusters au maximum).
    const couleurs = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];

    // Renvoie la couleur associee a un numero de cluster.
    function couleurCluster(cluster) {
        return couleurs[Math.abs(parseInt(cluster, 10)) % couleurs.length];
    }

    // Affiche un message d'etat (chargement, succes, erreur) au-dessus de la carte.
    function setMessage(message, type = 'info') {
        const zone = document.getElementById('message-cluster');
        if (!zone) return;
        zone.className = `alert alert-${type}`;
        zone.textContent = message;
    }

    // Construit la legende (un point colore + le numero de cluster).
    function afficherLegende() {
        const legend = document.getElementById('legend');
        if (!legend) return;

        legend.innerHTML = '';
        couleurs.forEach((couleur, index) => {
            const ligne = document.createElement('div');
            ligne.className = 'legend-line';
            ligne.innerHTML = `<span class="legend-dot" style="background:${couleur}"></span> Cluster ${index}`;
            legend.appendChild(ligne);
        });
    }

    // Contenu de la bulle affichee au clic sur un point.
    function popup(point) {
    return `
        <strong>${point.station || 'Station inconnue'}</strong><br>
        Commune : ${point.commune || 'n.c.'}<br>
        Puissance : ${point.puissance ?? 'n.c.'} kW<br>
        Cluster : <strong>${point.cluster}</strong>
    `;
    }

    // Place tous les points sur la carte puis cadre la vue dessus.
    function afficherPoints(points) {
        layerClusters.clearLayers();
        const bounds = [];

        points.forEach(point => {
            // On accepte les deux noms de champ possibles (latitude/longitude ou lat/lon).
            const lat = parseFloat(point.latitude ?? point.lat);
            const lon = parseFloat(point.longitude ?? point.lon);
            if (Number.isNaN(lat) || Number.isNaN(lon)) return;

            const couleur = couleurCluster(point.cluster);
            L.circleMarker([lat, lon], {
                radius: 6,
                color: couleur,
                fillColor: couleur,
                fillOpacity: 0.85,
                weight: 1
            }).bindPopup(popup(point)).addTo(layerClusters);

            // Pour le cadrage auto, on ne retient que la France metropolitaine : ca evite
            // un dezoom mondial a cause de l'outre-mer ou d'une coordonnee aberrante (0,0).
            if (lat >= 41 && lat <= 51.5 && lon >= -5.5 && lon <= 9.8) {
                bounds.push([lat, lon]);
            }
        });

        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
        }
    }

    // Demande les clusters a l'API (qui appelle le script Python) puis met a jour la carte.
    async function chargerClusters() {
        setMessage('Calcul des clusters en cours...', 'info');

        try {
            const response = await fetch(API_CLUSTER, { method: 'POST' });
            const data = await response.json();

            if (!response.ok || data.status === 'error' || data.erreur) {
                throw new Error(data.message || data.erreur || 'Erreur pendant la prédiction des clusters.');
            }

            const points = data.points || [];
            afficherPoints(points);
            afficherLegende();
            setMessage(`${points.length} point(s) de charge affiché(s) avec leur cluster.`, 'success');
        } catch (error) {
            console.error(error);
            setMessage('Erreur : impossible de récupérer les clusters. Vérifie request.php, cluster.py et le modèle .pkl.', 'danger');
        }
    }

    const bouton = document.getElementById('btn-lancer-cluster');
    if (bouton) {
        bouton.addEventListener('click', chargerClusters);
    }

    // Lancement automatique au chargement de la page.
    chargerClusters();
});
