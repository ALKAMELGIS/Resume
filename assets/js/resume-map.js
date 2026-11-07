/* Resume "Map" tab — plots each past employer on an interactive
   Leaflet map (OpenStreetMap tiles), grouped by city so multiple
   companies in the same place share one marker/popup. Initialized
   lazily on first view of the tab, since a Leaflet map can't size
   itself correctly inside a hidden ([hidden]) panel. */
(function () {
  "use strict";

  function init() {
    var mapEl = document.getElementById("res-map");
    var dataEl = document.getElementById("res-map-data");
    var mapTabBtn = document.querySelector('.res-tab[data-tab="map"]');
    if (!mapEl || !dataEl || !mapTabBtn || typeof L === "undefined") return;

    var locations;
    try {
      locations = JSON.parse(dataEl.textContent);
    } catch (e) {
      return;
    }

    var map = null;

    function buildPopupHtml(loc) {
      var items = loc.companies
        .map(function (c) {
          return "<li>" + c + "</li>";
        })
        .join("");
      return (
        '<div class="res-map-popup-title">' + loc.place + "</div>" +
        '<ul class="res-map-popup-list">' + items + "</ul>"
      );
    }

    function createMap() {
      map = L.map(mapEl, { scrollWheelZoom: false, attributionControl: false });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      var markerIcon = L.divIcon({
        className: "res-map-marker",
        html:
          '<span style="display:block;width:14px;height:14px;border-radius:50%;' +
          'background:#e2a948;border:2px solid #1c1c1c;box-shadow:0 2px 6px rgba(28,28,28,0.35);"></span>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -8],
      });

      var bounds = [];
      locations.forEach(function (loc) {
        var marker = L.marker([loc.lat, loc.lng], { icon: markerIcon }).addTo(map);
        marker.bindPopup(buildPopupHtml(loc));
        bounds.push([loc.lat, loc.lng]);
      });

      if (bounds.length === 1) {
        map.setView(bounds[0], 6);
      } else {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    mapTabBtn.addEventListener("click", function () {
      setTimeout(function () {
        if (!map) {
          createMap();
        } else {
          map.invalidateSize();
        }
      }, 60);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
