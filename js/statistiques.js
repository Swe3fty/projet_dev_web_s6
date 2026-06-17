'use strict';

let instanceChartPuissances = null;
let instanceChartOperateurs = null;
let instanceChartImplantation = null;
requestDepartements();

/* Requête pour la listes de départements*/
async function requestDepartements(){
    const url = 'php/request.php/communes/departements';

    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            displayDepartementsSelect(data);
        } else {
            console.log('HTTP error : ' + response.status);

        }
    } catch (error) {
        console.log('Fetch error : ', error);
    }
}

/*Département en dur et leur nom*/
const NOMS_DEPARTEMENTS = {
    '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence',
    '05': 'Hautes-Alpes', '06': 'Alpes-Maritimes', '07': 'Ardèche', '08': 'Ardennes',
    '09': 'Ariège', '10': 'Aube', '11': 'Aude', '12': 'Aveyron',
    '13': 'Bouches-du-Rhône', '14': 'Calvados', '15': 'Cantal', '16': 'Charente',
    '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze', '20': 'Corse',
    '21': "Côte-d'Or", '22': "Côtes-d'Armor", '23': 'Creuse', '24': 'Dordogne',
    '25': 'Doubs', '26': 'Drôme', '27': 'Eure', '28': 'Eure-et-Loir',
    '29': 'Finistère', '30': 'Gard', '31': 'Haute-Garonne', '32': 'Gers',
    '33': 'Gironde', '34': 'Hérault', '35': 'Ille-et-Vilaine', '36': 'Indre',
    '37': 'Indre-et-Loire', '38': 'Isère', '39': 'Jura', '40': 'Landes',
    '41': 'Loir-et-Cher', '42': 'Loire', '43': 'Haute-Loire', '44': 'Loire-Atlantique',
    '45': 'Loiret', '46': 'Lot', '47': 'Lot-et-Garonne', '48': 'Lozère',
    '49': 'Maine-et-Loire', '50': 'Manche', '51': 'Marne', '52': 'Haute-Marne',
    '53': 'Mayenne', '54': 'Meurthe-et-Moselle', '55': 'Meuse', '56': 'Morbihan',
    '57': 'Moselle', '58': 'Nièvre', '59': 'Nord', '60': 'Oise',
    '61': 'Orne', '62': 'Pas-de-Calais', '63': 'Puy-de-Dôme', '64': 'Pyrénées-Atlantiques',
    '65': 'Hautes-Pyrénées', '66': 'Pyrénées-Orientales', '67': 'Bas-Rhin', '68': 'Haut-Rhin',
    '69': 'Rhône', '70': 'Haute-Saône', '71': 'Saône-et-Loire', '72': 'Sarthe',
    '73': 'Savoie', '74': 'Haute-Savoie', '75': 'Paris', '76': 'Seine-Maritime',
    '77': 'Seine-et-Marne', '78': 'Yvelines', '79': 'Deux-Sèvres', '80': 'Somme',
    '81': 'Tarn', '82': 'Tarn-et-Garonne', '83': 'Var', '84': 'Vaucluse',
    '85': 'Vendée', '86': 'Vienne', '87': 'Haute-Vienne', '88': 'Vosges',
    '89': 'Yonne', '90': 'Territoire de Belfort', '91': 'Essonne', '92': 'Hauts-de-Seine',
    '93': 'Seine-Saint-Denis', '94': 'Val-de-Marne', '95': "Val-d'Oise",
    '97': 'Outre-mer'
};

/*Affichage des départements dans le select*/
function displayDepartementsSelect(data) {
    const select = document.getElementById('departements-select');

    data.forEach(dept => {
        const numero = dept.numero_departement;
        const option = document.createElement('option');
        option.value = numero;
        option.textContent = NOMS_DEPARTEMENTS[numero]
            ? `${numero} - ${NOMS_DEPARTEMENTS[numero]}`
            : numero;
        select.appendChild(option);
    });
}


/*On récupère le département sélectionné et on fait la requête pour les statistiques*/
document.getElementById('departements-select').addEventListener('change', (event) => {
    const departement = event.target.value;
    requestStatistiques(departement);
});

/*Requête pour les statistiques du département sélectionné*/
async function requestStatistiques(departement) {
    console.log('Département sélectionné :', departement);
    const url = `php/request.php/statistiques/?departement=${departement}`;
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            console.log(data);
            displayStatistiques(data);
            afficherGraphiques(data);
        } else {
            console.log('HTTP error : ' + response.status);
        }
    } catch (error) {
        console.log('Fetch error : ', error);
    }
}

// Fonction pour afficher les statistiques dans les div correspondantes
function displayStatistiques(data){
    document.getElementById('total-stations').innerHTML = "<h1>" + data.totaux['nb_stations'] + "</h1>" + " Stations";
    document.getElementById('nb-pdc').innerHTML = "<h1>" + data.totaux['nb_points_de_charge'] + "</h1>" + "Points de charge";
    document.getElementById('puissance-moy').innerHTML = "<h1>" + Math.round(data.totaux['puissance_moyenne']) + "</h1>" + "Puissance Moyenne";
    document.getElementById('nb-op').innerHTML = "<h1>" + data.totaux['nb_operateurs'] + "</h1>" + "Opérateurs";

}


function afficherGraphiques(stats) {
    if (instanceChartPuissances) instanceChartPuissances.destroy();
    if (instanceChartOperateurs) instanceChartOperateurs.destroy();
    if (instanceChartImplantation) instanceChartImplantation.destroy();

    // ==========================================
    // 1. Répartition des puissances
    // ==========================================
    const labelsPuissances = stats.repartition_puissances.map(item => item.tranche);
    const dataPuissances = stats.repartition_puissances.map(item => item.nb);

    instanceChartPuissances = new Chart(document.getElementById('chartPuissances'), {
        type: 'doughnut', 
        data: {
            labels: labelsPuissances,
            datasets: [{
                data: dataPuissances,
                backgroundColor: ['#333333', '#10b981', '#0D2233', '#4BA037', '#8b5cf6'],
            }]
        },
        options: {
            cutout: '65%', 
            // layout: { padding: 20 } a été supprimé ici
            plugins: { 
                title: { 
                    display: true, 
                    text: 'Répartition puissances nominales',
                    font: {
                        family: "'Montserrat', sans-serif", 
                        size: 24, 
                        weight: 'bold'
                    }, 
                    padding: { top: 10, bottom: 20 } // Ajout du padding identique aux autres
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let total = context.dataset.data.reduce((acc, val) => acc + Number(val), 0);
                            let valeur = Number(context.raw);
                            let pourcentage = ((valeur / total) * 100).toFixed(1) + '%';
                            return ` ${context.label} : ${pourcentage} (${valeur} bornes)`;
                        }
                    }
                }
            }
        }
    });

    // ==========================================
    // 2. Top 5 des Opérateurs
    // ==========================================
    const labelsOperateurs = stats.top_operateurs.map(item => item.nom_operateur);
    const dataOperateurs = stats.top_operateurs.map(item => Number(item.nb));

    instanceChartOperateurs = new Chart(document.getElementById('chartOperateurs'), {
        type: 'bar', 
        data: {
            labels: labelsOperateurs,
            datasets: [{
                label: 'Nombre de stations',
                data: dataOperateurs,
                backgroundColor: '#0D2233'
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: { 
                title: { 
                    display: true, 
                    text: 'Top 5 des Opérateurs',
                    font: {
                        family: "'Montserrat', sans-serif", 
                        size: 24, 
                        weight: 'bold'
                    }, 
                    padding: { top: 10, bottom: 20 }                  
                } 
            }
        }
    });

    // ==========================================
    // 3. Type d'implantation
    // ==========================================
    const labelsImplantation = stats.par_implantation.map(item => item.implantation_station);
    const dataImplantation = stats.par_implantation.map(item => Number(item.nb));

    instanceChartImplantation = new Chart(document.getElementById('chartImplantation'), {
        type: 'bar', 
        data: {
            labels: labelsImplantation,
            datasets: [{
                label: 'Nombre de stations',
                data: dataImplantation,
                backgroundColor: ['#4BA037', '#0D2233', '#E5E5E5', '#6366f1'] 
            }]
        },
        options: {
            plugins: { 
                title: { 
                    display: true, 
                    text: "Type d'implantation",
                    font: {
                        family: "'Montserrat', sans-serif", 
                        size: 24, 
                        weight: 'bold'
                    },
                    padding: { top: 10, bottom: 20 }   
                },
                legend: { display: false }
            }
        }
    });
}