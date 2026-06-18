// 1. Récupération de l'ID qui est dans l'URL (ex: puissance.html?id=123)
const paramsRecherche = new URLSearchParams(window.location.search);
const idBorne = paramsRecherche.get('id');

// 2. Si on a bien un ID, on déclenche automatiquement la prédiction
if (idBorne) {
    requestPredictionPuissance(idBorne);
} else {
    console.error("Aucun ID de borne n'a été trouvé dans l'URL.");
}

// 3. La fonction qui contacte le PHP en POST
async function requestPredictionPuissance(idPdc) {
    const url = `php/request.php/predictions/puissance`;

    try {
        const response = await fetch(url, {
            method: 'POST', // On utilise bien POST comme défini dans ton PHP
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: idPdc }) // L'ID est envoyé dans le corps de la requête
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Résultat de l'IA :", data);
            afficherResultatPrediction(data.prediction_puissance);
        } else {
            console.error('Erreur API :', data.erreur);
        }
    } catch (error) {
        console.error('Erreur réseau ou exécution :', error);
    }
}

function afficherResultatPrediction(prediction) {
    const conteneur = document.getElementById('div-prediction-resultat');
    
    if (conteneur) {
        // On rend la boîte visible
        conteneur.style.display = 'block';

        // Petit "nettoyage" du texte pour faire plus propre
        let textePropre = prediction;
        if (prediction === "1_normale" || prediction.includes("normal")) {
            textePropre = "Normale (< 22 kW)";
        } else if (prediction === "2_acceleree" || prediction.includes("acceleree")) {
            textePropre = "Accélérée (22-50 kW)";
        } else if (prediction === "3_rapide" || prediction.includes("rapide")) {
            textePropre = "Rapide (> 50 kW)";
        }

        // On injecte le HTML avec l'icône éclair
        conteneur.innerHTML = `
            <h3 style="color: #4BA037; margin-bottom: 0;">
                <i class="fa-solid fa-bolt" style="color: #ffc107;"></i> 
                Puissance recommandée : <strong>${textePropre}</strong>
            </h3>
            <p class="text-muted mt-2 mb-0" style="font-size: 14px;">Basé sur l'analyse de l'environnement de la station.</p>
        `;
    } else {
        console.warn("Attention : La div 'div-prediction-resultat' n'a pas été trouvée dans le HTML.");
    }
}