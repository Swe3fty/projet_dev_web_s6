'use strict';

// Petit script de test : recupere la liste des departements depuis l'API et l'affiche en console.
requestStationsMap();

async function requestStationsMap() {
    const url = 'php/request.php/communes/departements/';
    
    try {
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            console.log(data); 
            
        } else {
            console.log('HTTP error : ' + response.status);
        }
    } catch (error) {
        console.log('Fetch error : ', error);
    }
}

