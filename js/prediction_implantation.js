// Page Prediction implantation : recupere l'ID de borne dans l'URL, interroge l'IA
// (Random Forest via l'API PHP) et affiche le type d'implantation predit + les probabilites.
document.addEventListener('DOMContentLoaded', async () => {
    // L'ID de la borne est passe dans l'URL (ex : prediction.html?id=123).
    const urlParams = new URLSearchParams(window.location.search);
    const idPdc = urlParams.get('id');

    // Sans ID on ne peut rien predire : retour a la page de visualisation.
    if (!idPdc) {
        window.location.href = 'visualisation.html';
        return;
    }

    try {
        // Envoi de l'ID a l'API qui lance la prediction cote serveur.
        const response = await fetch('php/request.php/predictions/implantation/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: idPdc })
        });

        const textResponse = await response.text();
        console.log("Réponse brute du serveur :", textResponse);

        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (e) {
            console.error("Erreur de format JSON:", textResponse);
            return;
        }

        // Si une erreur est renvoyée par le serveur (PHP ou IA)
        if (data.erreur || data.status === 'error') {
            document.getElementById('pdc-adresse').textContent = "Données indisponibles pour cette borne.";
            return;
        }

        // Affichage des informations de la borne
        document.getElementById('pdc-adresse').textContent = data.commune
            ? data.commune.charAt(0).toUpperCase() + data.commune.slice(1)
            : 'Commune non disponible';

        document.getElementById('pdc-infos').textContent =
            `ID : ${data.id ?? idPdc} · Puissance : ${data.puissance ?? '?'} kW · Opérateur : ${data.operateur ?? 'Inconnu'}`;

        // Affichage de la prédiction IA (Random Forest)
        const encadreResultat = document.getElementById('implantation-predite');
        if (encadreResultat) {
            encadreResultat.textContent = data.implantation_predite ?? 'Non disponible';
        }

        // Génération de la liste des probabilités
        const zoneDetails = document.getElementById('zone-probabilites');
        if (zoneDetails && data.probabilites) {
            let htmlProbas = "<ul class='list-group mt-3'>";
            for (const [classe, proba] of Object.entries(data.probabilites)) {
                const pourcentage = (proba * 100).toFixed(2);
                htmlProbas += `
                    <li class='list-group-item d-flex justify-content-between align-items-center'>
                        ${classe}
                        <span class='badge bg-primary rounded-pill'>${pourcentage}%</span>
                    </li>`;
            }
            htmlProbas += "</ul>";
            zoneDetails.innerHTML = htmlProbas;
        }

    } catch (error) {
        console.error('Erreur réseau ou exécution :', error);
        document.getElementById('pdc-adresse').textContent = "Erreur de connexion au serveur.";
    }
});