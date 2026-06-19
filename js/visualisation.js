// Page Visualisation : carte Leaflet, filtres, tableau pagine et ajout/edition de bornes.
// Dialogue avec l'API PHP (php/request.php) ; en cas d'absence de serveur, repli local.

const map = L.map('map', { preferCanvas: true }).setView([46.6, 2.5], 6);
L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap France'
}).addTo(map);

const couche = L.layerGroup().addTo(map);

const API = 'php/request.php';
const LIGNES_PAR_PAGE = 14;
let bornes = [];        // toutes les stations (pour la carte + repli local du tableau)
let pageCourante = 1;
let apiOk = false;      // vrai si l'API PHP repond (sinon repli sur data/bornes.js)
let lignesAffichees = [];   // points de charge de la page de tableau actuellement affichee

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

// Construit le contenu HTML de la bulle affichee au clic sur un point de la carte.
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
    // Le compteur sous le filtre est mis a jour par rendrePagination (total cote serveur).
}

// Construit les lignes du tableau a partir d'une liste de points de charge.
function afficherLignesTableau(lignes) {
    lignesAffichees = lignes;
    const tbody = document.querySelector('#tableau-bornes tbody');
    tbody.innerHTML = '';
    lignes.forEach((b, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input class="form-check-input" type="radio" name="sel-borne" value="${b.id || ''}"></td>
            <td>${b.station || b.nom || ''}</td>
            <td>${b.commune || ''}</td>
            <td>${b.cp || ''}</td>
            <td>${b.operateur || ''}</td>
            <td>${b.puissance != null ? b.puissance + ' kW' : '?'}</td>
            <td>${b.acces || ''}</td>
            <td>${b.gratuit ? 'Oui' : 'Non'}</td>
            <td>
                <div class="dropdown">
                    <button class="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><button class="dropdown-item" data-action="modifier" data-index="${i}"><i class="fa-solid fa-pen"></i> Modifier</button></li>
                        <li><button class="dropdown-item text-danger" data-action="supprimer" data-index="${i}"><i class="fa-solid fa-trash"></i> Supprimer</button></li>
                    </ul>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

// Renvoie les valeurs courantes des trois filtres (commune, operateur, puissance).
function filtresActuels() {
    return {
        commune: document.getElementById('rech-commune').value.trim(),
        operateur: document.getElementById('filtre-operateur').value,
        puissance: document.getElementById('filtre-puissance').value
    };
}

// Charge UNE page du tableau en appliquant les filtres cote serveur.
async function chargerPageTableau(page) {
    if (page < 1) page = 1;
    pageCourante = page;
    const offset = (page - 1) * LIGNES_PAR_PAGE;

    let total = 0;
    let lignes = [];
    if (apiOk) {
        // On passe les filtres au serveur : le tableau ne montre que les bornes correspondantes.
        const f = filtresActuels();
        const params = new URLSearchParams({
            limit: LIGNES_PAR_PAGE,
            offset: offset,
            commune: f.commune,
            operateur: f.operateur,
            puissance: f.puissance
        });
        const reponse = await getData(API + '/points-charge/?' + params.toString());
        if (reponse) {
            total = reponse.total;
            lignes = reponse.lignes;
        }
    } else {
        // Pas de serveur : on retombe sur les stations locales (vue dégradée).
        total = bornes.length;
        lignes = bornes.slice(offset, offset + LIGNES_PAR_PAGE);
    }

    afficherLignesTableau(lignes);
    rendrePagination(total);
}

// Boutons Precedent / Suivant + total. Chaque clic recharge la page voulue.
function rendrePagination(total) {
    const nbPages = Math.max(1, Math.ceil(total / LIGNES_PAR_PAGE));
    if (pageCourante > nbPages) pageCourante = nbPages;

    const pag = document.getElementById('pagination');
    pag.innerHTML = '';

    const bouton = (texte, page, actif) => {
        const b = document.createElement('button');
        b.className = 'btn btn-sm btn-outline-secondary';
        b.textContent = texte;
        b.disabled = !actif;
        b.addEventListener('click', () => chargerPageTableau(page));
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

    // Compteur sous le filtre : total des bornes correspondant au filtre.
    // Pilote ici (et non dans afficherCarte) pour qu'il se mette a jour apres une suppression.
    document.getElementById('compteur').textContent =
        total.toLocaleString('fr-FR') + (total > 1 ? ' bornes affichées' : ' borne affichée');
}

// Clic sur un item du menu "..." d'une ligne (un seul ecouteur pour tout le tableau).
document.querySelector('#tableau-bornes tbody').addEventListener('click', function (e) {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    const borne = lignesAffichees[item.dataset.index];
    if (!borne) return;
    if (item.dataset.action === 'modifier') {
        modifier(borne);
    } else if (item.dataset.action === 'supprimer') {
        supprimer(borne);
    }
});

// Supprime un point de charge (DELETE points-charge) puis rafraichit le tableau.
async function supprimer(borne) {
    if (!confirm('Supprimer ce point de charge ?')) return;
    if (apiOk && borne.id) {
        await fetch(API + '/points-charge/?id_pdc_itinerance=' + encodeURIComponent(borne.id), { method: 'DELETE' });
    } else {
        // Repli local : on enleve la ligne de la liste en memoire.
        bornes = bornes.filter(b => b !== borne);
        afficherCarte(bornes);
    }
    chargerPageTableau(pageCourante);
}

// Ouvre le modal d'edition pre-rempli avec le point de charge.
function modifier(borne) {
    const f = document.getElementById('form-edit');
    f.id.value = borne.id || '';
    f.puissance.value = borne.puissance ?? '';
    f.acces.value = borne.acces || '';
    f.pmr.value = borne.pmr || '';
    f.tarification.value = borne.tarification || '';
    f.gratuit.checked = Boolean(borne.gratuit);
    new bootstrap.Modal(document.getElementById('modalEdit')).show();
}

// Recharge differee du tableau : evite de requeter le serveur a chaque frappe clavier.
let timerTableau = null;
function planifierRechargeTableau() {
    clearTimeout(timerTableau);
    timerTableau = setTimeout(() => chargerPageTableau(1), 300);
}

// Filtre : la CARTE est filtree cote client (immediat), le TABLEAU cote serveur.
function filtrer() {
    const f = filtresActuels();
    const q = f.commune.toLowerCase();
    const res = bornes.filter(b => {
        if (q && !((b.commune || '').toLowerCase().includes(q) || (b.nom || '').toLowerCase().includes(q))) return false;
        if (f.operateur && b.operateur !== f.operateur) return false;
        if (f.puissance && categorie(b.puissance) !== f.puissance) return false;
        return true;
    });
    afficherCarte(res);              // carte : immediat (cote client)
    planifierRechargeTableau();      // tableau : page 1 filtree (cote serveur, anti-rebond)
}

// Remplit la liste des operateurs et l'autocompletion des communes a partir des bornes chargees.
// On reconstruit tout a chaque appel (pas d'ajout en double), pour prendre en compte les nouvelles bornes.
function remplirControles() {
    const ops = [...new Set(bornes.map(b => b.operateur).filter(Boolean))].sort();
    const selOp = document.getElementById('filtre-operateur');
    const choixOp = selOp.value;                    // on memorise l'operateur selectionne
    selOp.innerHTML = '<option value="">Tous</option>';
    ops.forEach(o => { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; selOp.appendChild(opt); });
    selOp.value = choixOp;                           // on restaure le choix courant

    const communes = [...new Set(bornes.map(b => b.commune).filter(Boolean))].sort();
    const dl = document.getElementById('liste-communes');
    dl.innerHTML = '';
    communes.slice(0, 2000).forEach(c => { const opt = document.createElement('option'); opt.value = c; dl.appendChild(opt); });
}

['rech-commune', 'filtre-operateur', 'filtre-puissance'].forEach(id =>
    document.getElementById(id).addEventListener('input', filtrer));

// Bouton "Prédire les clusters" : pas besoin de sélectionner une borne.
document.getElementById('btn-cluster').addEventListener('click', function (e) {
    e.preventDefault();
    window.location.href = 'cluster.html';
});

// Ajout d'une borne : cree une station + un point de charge (POST), affichage immediat.
document.getElementById('form-ajout').addEventListener('submit', function (e) {
    e.preventDefault();
    const f = e.target;
    const b = {
        nom: f.nom.value, commune: f.commune.value, operateur: f.operateur.value,
        lat: parseFloat(f.lat.value), lon: parseFloat(f.lon.value),
        puissance: parseFloat(f.puissance.value) || 0, acces: f.acces.value, gratuit: false, nb_pdc: 1
    };
    // Envoi a l'API (POST en x-www-form-urlencoded, cf. cours).
    sendData(API + '/points-charge/', new URLSearchParams({
        nom: b.nom, commune: b.commune, operateur: b.operateur,
        lat: b.lat, lon: b.lon, puissance: b.puissance, acces: b.acces
    }).toString());

    bornes.push(b);
    remplirControles();                 // maj de l'autocompletion (nouvelle commune / operateur)
    filtrer();                          // maj de la carte
    chargerPageTableau(pageCourante);   // maj du tableau
    map.setView([b.lat, b.lon], 13);
    bootstrap.Modal.getInstance(document.getElementById('modalAjout')).hide();
    f.reset();
});

// Modification d'un point de charge (PUT points-charge?id_pdc_itinerance=...).
document.getElementById('form-edit').addEventListener('submit', async function (e) {
    e.preventDefault();
    const f = e.target;
    if (apiOk && f.id.value) {
        await fetch(API + '/points-charge/?id_pdc_itinerance=' + encodeURIComponent(f.id.value), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                puissance: f.puissance.value || null,   // vide -> NULL (colonne DECIMAL)
                acces: f.acces.value,
                pmr: f.pmr.value,
                tarification: f.tarification.value,
                gratuit: f.gratuit.checked ? 1 : 0
            })
        });
    }
    bootstrap.Modal.getInstance(document.getElementById('modalEdit')).hide();
    chargerPageTableau(pageCourante);
});

// Chargement initial :
// - la CARTE a besoin de toutes les stations -> un seul appel (ou data/bornes.js en local) ;
// - le TABLEAU ne charge ensuite qu'une page a la fois (cote serveur).
async function charger() {
    let stations;
    try {
        stations = await getData(API + '/stations/');
    } catch (e) {
        console.warn('API injoignable, donnees locales utilisees.', e);
    }

    if (Array.isArray(stations)) {
        apiOk = true;
        bornes = stations;
    } else {
        apiOk = false;                  // pas de serveur -> repli local
        bornes = window.BORNES || [];
    }

    remplirControles();
    afficherCarte(bornes);              // carte : toutes les bornes
    chargerPageTableau(1);              // tableau : 1re page
}

// Bouton "Prédire l'implantation" : on envoie vers prediction.html avec la borne sélectionnée.
document.getElementById('btn-implantation').addEventListener('click', function (e) {
    e.preventDefault(); // Empêche le lien HTML classique de s'exécuter
    
    // On cherche le bouton radio qui est coché
    const choix = document.querySelector('input[name="sel-borne"]:checked');
    
    if (!choix) {
        alert('Sélectionnez une borne dans le tableau (bouton radio) avant de prédire.');
        return;
    }
    
    // On redirige vers la bonne page en ajoutant l'ID à la fin de l'URL
    window.location.href = 'prediction.html?id=' + encodeURIComponent(choix.value);
});

document.getElementById('btn-puissance').addEventListener('click', function (e) {
    e.preventDefault(); 
    
    const choix = document.querySelector('input[name="sel-borne"]:checked');
    
    if (!choix) {
        alert('Sélectionnez une borne dans le tableau (bouton radio) avant de prédire.');
        return;
    }
    
    // On redirige vers la page puissance.html en passant l'ID dans l'URL
    window.location.href = 'puissance.html?id=' + encodeURIComponent(choix.value);
});

charger();
