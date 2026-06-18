document.addEventListener("DOMContentLoaded", () => {

    const data = JSON.parse(localStorage.getItem("clusters") || "[]");

    if (!Array.isArray(data) || data.length === 0) {
        alert("Aucune donnée !");
        return;
    }

    const map = L.map("map").setView([46.6, 2.5], 6);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    const colors = ["red", "blue", "green", "orange", "purple"];

    function getColor(c) {
        return colors[c % colors.length];
    }

    const bounds = [];

    data.forEach(p => {

        const color = getColor(p.cluster);

        L.circleMarker([p.latitude, p.longitude], {
            radius: 7,
            color,
            fillColor: color,
            fillOpacity: 0.8
        })
        .addTo(map)
        .bindPopup(`ID: ${p.id}<br>Cluster: ${p.cluster}`);

        bounds.push([p.latitude, p.longitude]);
    });

    if (bounds.length) {
        map.fitBounds(bounds);
    }

    const legend = document.getElementById("legend");

    if (legend) {
        legend.innerHTML = "";

        colors.forEach((c, i) => {
            legend.innerHTML += `
                <div><span style="color:${c}">●</span> Cluster ${i}</div>
            `;
        });
    }
});