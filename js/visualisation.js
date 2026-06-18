const map = L.map('map', { preferCanvas: true }).setView([46.6, 2.5], 6);

L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap France'
}).addTo(map);

const couche = L.layerGroup().addTo(map);

const API = 'php/request.php';
const LIGNES_PAR_PAGE = 14;

let bornes = [];
let pageCourante = 1;
let apiOk = false;
let lignesAffichees = [];

// =====================
// GET
// =====================
async function getData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        console.log('HTTP error:', response.status);
        return null;
    }
    return await response.json();
}

// =====================
// POST JSON
// =====================
async function sendJSON(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        console.log('HTTP error:', response.status);
        return null;
    }

    return await response.json();
}

// =====================
// MAP
// =====================
const COULEUR_POINT = '#4BA037';

function popupHtml(b) {
    const gratuit = b.gratuit ? 'Gratuit' : 'Payant';

    return `
        <div>
            <h5>${b.nom || 'Borne'}</h5>
            <b>Commune :</b> ${b.commune || ''}<br>
            <b>Puissance :</b> ${b.puissance || '?'} kW<br>
            <b>Opérateur :</b> ${b.operateur || ''}<br>
            <b>Accès :</b> ${b.acces || ''} - ${gratuit}
        </div>
    `;
}

function afficherCarte(liste) {
    couche.clearLayers();

    liste.forEach(b => {
        L.circleMarker([b.lat, b.lon], {
            radius: 5,
            stroke: false,
            fillColor: COULEUR_POINT,
            fillOpacity: 0.8
        })
        .bindPopup(popupHtml(b))
        .addTo(couche);
    });

    document.getElementById('compteur').textContent =
        `${liste.length} borne(s) affichée(s)`;
}

// =====================
// TABLE
// =====================
function afficherLignesTableau(lignes) {
    lignesAffichees = lignes;

    const tbody = document.querySelector('#tableau-bornes tbody');
    tbody.innerHTML = '';

    lignes.forEach((b) => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>
                <input type="radio" name="sel-borne" value="${b.id}">
            </td>
            <td>${b.nom || ''}</td>
            <td>${b.commune || ''}</td>
            <td>${b.cp || ''}</td>
            <td>${b.operateur || ''}</td>
            <td>${b.puissance || '?'} kW</td>
            <td>${b.acces || ''}</td>
            <td>${b.gratuit ? 'Oui' : 'Non'}</td>
        `;

        tbody.appendChild(tr);
    });
}

// =====================
// CLUSTER BUTTON (FIX PRINCIPAL)
// =====================
document.getElementById('btn-cluster').addEventListener('click', async (e) => {
    e.preventDefault();

    const selected = document.querySelector('input[name="sel-borne"]:checked');

    if (!selected) {
        alert('Sélectionnez une borne');
        return;
    }

    const ids = [parseInt(selected.value)];

    try {
        const result = await sendJSON(
            'php/request.php?action=predictions_clusters',
            { borne_ids: ids }
        );

        if (!result) {
            alert("Erreur cluster");
            return;
        }

        console.log("Clusters reçus:", result);

        localStorage.setItem("clusters", JSON.stringify(result));

        window.location.href = "cluster.html";

    } catch (err) {
        console.error(err);
        alert("Erreur serveur cluster");
    }
});

// =====================
// INIT
// =====================
async function charger() {
    const stations = await getData(API + '/stations/');

    if (Array.isArray(stations)) {
        apiOk = true;
        bornes = stations;
    } else {
        apiOk = false;
        bornes = window.BORNES || [];
    }

    afficherCarte(bornes);
    chargerPageTableau(1);
}

charger();