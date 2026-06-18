document.addEventListener("DOMContentLoaded", () => {

    const data = JSON.parse(localStorage.getItem("clusters"));

    if (!data || data.length === 0) {
        alert("Aucune donnée !");
        return;
    }

    // =========================
    // CARTE
    // =========================
    const map = L.map("map").setView([46.6, 2.5], 6);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    // =========================
    // COULEURS FIXES (5 clusters)
    // =========================
    const colors = [
        "red",
        "blue",
        "green",
        "orange",
        "purple"
    ];

    function getColor(cluster) {
        return colors[cluster % 5];
    }

    // =========================
    // MARKERS
    // =========================
    let bounds = [];

    console.log("Clusters reçus :", [...new Set(data.map(p => p.cluster))]);

    data.forEach(point => {

        const color = getColor(point.cluster);

        console.log("DEBUG point :", point.id, point.cluster);

        L.circleMarker([point.latitude, point.longitude], {
            radius: 7,
            color: color,
            fillColor: color,
            fillOpacity: 0.8
        })
        .addTo(map)
        .bindPopup(`
            <div style="font-family: Arial; min-width: 200px;">
                <h4 style="margin:0; color:${color};">🔌 Borne</h4>
                <hr>
                <b>ID :</b> ${point.id}<br>
                <b>Cluster :</b> ${point.cluster}<br>
                <b>Latitude :</b> ${point.latitude.toFixed(5)}<br>
                <b>Longitude :</b> ${point.longitude.toFixed(5)}
            </div>
        `);

        bounds.push([point.latitude, point.longitude]);
    });

    if (bounds.length > 0) {
        map.fitBounds(bounds);
    }

    // =========================
    // LÉGENDE (FORCÉE À 5 CLUSTERS)
    // =========================
    const legend = document.getElementById("legend");

    if (legend) {

        legend.innerHTML = "";

        for (let i = 0; i < 5; i++) {

            legend.innerHTML += `
                <div>
                    <span style="color:${colors[i]}; font-size:18px;">●</span>
                    Cluster ${i}
                </div>
            `;
        }
    }

});