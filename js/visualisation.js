
const map = L.map('map', { preferCanvas: true }).setView([46.6, 2.5], 6);
L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap France'
}).addTo(map);

const couche = L.layerGroup().addTo(map);

const API = 'php/request.php';
const LIGNES_PAR_PAGE = 14;
let bornes = [];
let lignesFiltrees = [];   
let pageCourante = 1;

// GET : recupere des donnees JSON depuis le serveur.
async function getData(url) {
    const response = await fetch(url);
    if (response.ok) return await response.json();
    console.log('HTTP error: ' + response.status);
}

// POST : envoie des donnees
async function sendData(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data
    });
    if (!response.ok) console.log('HTTP error: ' + response.status);
}

// Couleur des points.
const COULEUR_POINT = '#4BA037';

// Categorie puissance, utilisee par le filtre "Puissance".
function categorie(p) {
    if (p > 50) return 'rapide';
    if (p >= 22) return 'accel';
    return 'normal';
}

function popupHtml(b) {
    const gratuit = b.gratuit ? '<span style="color:#4BA037;">Gratuit</span>' : 'Payant';
    return `<div class="popup-borne">
        <h6>${b.nom || 'Borne'}</h6>
        <div class="ligne"><i class="fa-solid fa-location-dot"></i> ${b.commune || ''} ${b.cp || ''}</div>
        <div class="ligne"><i class="fa-solid fa-bolt"></i> ${b.puissance || '?'} kW</div>
        <div class="ligne"><i class="fa-solid fa-charging-station"></i> ${b.operateur || ''}</div>
        <div class="ligne"><i class="fa-solid fa-door-open"></i> ${b.acces || ''} - ${gratuit}</div>
        <div class="ligne"><i class="fa-solid fa-wheelchair"></i> ${b.pmr || 'n.c.'}</div>
    </div>`;
}

// Affichage sur la CARTE
function afficherCarte(liste) {
    couche.clearLayers();
    liste.forEach(b => {
        L.circleMarker([b.lat, b.lon], {
            radius: 5, stroke: false, fillColor: COULEUR_POINT, fillOpacity: 0.8
        }).bindPopup(popupHtml(b)).addTo(couche);
    });
    document.getElementById('compteur').textContent =
        liste.length.toLocaleString('fr-FR') + (liste.length > 1 ? ' bornes affichées' : ' borne affichée');
}

// Affichage dans le TABLEAU avec pagination
function afficherTableau(liste) {
    lignesFiltrees = liste;
    pageCourante = 1;
    rendreTableau();
}

function rendreTableau() {
    const total = lignesFiltrees.length;
    const nbPages = Math.max(1, Math.ceil(total / LIGNES_PAR_PAGE));
    if (pageCourante > nbPages) pageCourante = nbPages;

    const debut = (pageCourante - 1) * LIGNES_PAR_PAGE;
    const page = lignesFiltrees.slice(debut, debut + LIGNES_PAR_PAGE);

    const tbody = document.querySelector('#tableau-bornes tbody');
    tbody.innerHTML = '';
    page.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input class="form-check-input" type="radio" name="sel-borne" value="${b.id || b.nom || ''}"></td>
            <td>${b.nom || ''}</td>
            <td>${b.commune || ''}</td>
            <td>${b.cp || ''}</td>
            <td>${b.operateur || ''}</td>
            <td>${b.puissance != null ? b.puissance + ' kW' : '?'}</td>
            <td>${b.nb_pdc || 1}</td>
            <td>${b.acces || ''}</td>`;
        tbody.appendChild(tr);
    });

    rendrePagination(nbPages, total);
}

// Boutons Precedent / Suivant + indication de page
function rendrePagination(nbPages, total) {
    const pag = document.getElementById('pagination');
    pag.innerHTML = '';

    const bouton = (texte, page, actif) => {
        const b = document.createElement('button');
        b.className = 'btn btn-sm btn-outline-secondary';
        b.textContent = texte;
        b.disabled = !actif;
        b.addEventListener('click', () => { pageCourante = page; rendreTableau(); });
        return b;
    };

    pag.appendChild(bouton('« Précédent', pageCourante - 1, pageCourante > 1));
    const pos = document.createElement('span');
    pos.style.fontSize = '14px';
    pos.textContent = `Page ${pageCourante} / ${nbPages}`;
    pag.appendChild(pos);
    pag.appendChild(bouton('Suivant »', pageCourante + 1, pageCourante < nbPages));

    document.getElementById('note-tableau').textContent =
        `${total.toLocaleString('fr-FR')} résultat${total > 1 ? 's' : ''}`;
}

// Filtre commun a la carte et au tableau
function filtrer() {
    const q = document.getElementById('rech-commune').value.trim().toLowerCase();
    const op = document.getElementById('filtre-operateur').value;
    const pu = document.getElementById('filtre-puissance').value;
    const res = bornes.filter(b => {
        if (q && !((b.commune || '').toLowerCase().includes(q) || (b.nom || '').toLowerCase().includes(q))) return false;
        if (op && b.operateur !== op) return false;
        if (pu && categorie(b.puissance) !== pu) return false;
        return true;
    });
    afficherCarte(res);
    afficherTableau(res);
}

function remplirControles() {
    const ops = [...new Set(bornes.map(b => b.operateur).filter(Boolean))].sort();
    const selOp = document.getElementById('filtre-operateur');
    ops.forEach(o => { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; selOp.appendChild(opt); });
    const communes = [...new Set(bornes.map(b => b.commune).filter(Boolean))].sort();
    const dl = document.getElementById('liste-communes');
    communes.slice(0, 2000).forEach(c => { const opt = document.createElement('option'); opt.value = c; dl.appendChild(opt); });
}

['rech-commune', 'filtre-operateur', 'filtre-puissance'].forEach(id =>
    document.getElementById(id).addEventListener('input', filtrer));

// Bouton "Predire les clusters" : on envoie vers cluster.html avec la borne selectionnee.
document.getElementById('btn-cluster').addEventListener('click', function (e) {
    e.preventDefault();
    const choix = document.querySelector('input[name="sel-borne"]:checked');
    if (!choix) {
        alert('Sélectionnez une borne dans le tableau (bouton radio) avant de prédire.');
        return;
    }
    window.location.href = 'cluster.html?id=' + encodeURIComponent(choix.value);
});

// Ajout d'une borne : envoi a l'API (POST) + affichage immediat.
document.getElementById('form-ajout').addEventListener('submit', function (e) {
    e.preventDefault();
    const f = e.target;
    const b = {
        nom: f.nom.value, commune: f.commune.value, operateur: f.operateur.value,
        lat: parseFloat(f.lat.value), lon: parseFloat(f.lon.value),
        puissance: parseFloat(f.puissance.value) || 0, acces: f.acces.value, gratuit: false, nb_pdc: 1
    };
    // Envoi a l'API (POST en x-www-form-urlencoded
    sendData(API + '/points-charge/', new URLSearchParams({
        nom: b.nom, commune: b.commune, operateur: b.operateur,
        lat: b.lat, lon: b.lon, puissance: b.puissance, acces: b.acces
    }).toString());

    bornes.push(b);
    filtrer();
    map.setView([b.lat, b.lon], 13);
    bootstrap.Modal.getInstance(document.getElementById('modalAjout')).hide();
    f.reset();
});

function demarrer(data) {
    bornes = Array.isArray(data) ? data : [];
    remplirControles();
    filtrer();
}

// Chargement : on tente l'API (getData, cf. cours) ; si echec (ouverture en
// local sans serveur), on bascule sur les donnees statiques data/bornes.js.
async function charger() {
    let data;
    try {
        data = await getData(API + '/stations/');
    } catch (e) {
        console.warn('API injoignable, donnees locales utilisees.', e);
    }
    demarrer(data || window.BORNES || []);
}
charger();
