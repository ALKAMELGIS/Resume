/* Resume "Map" tab — plots each past employer on an interactive
   Leaflet map, grouped by city so multiple companies in the same
   place share one marker/popup. Initialized lazily on first view
   of the tab, since a Leaflet map can't size itself correctly
   inside a hidden ([hidden]) panel.

   Also adds a small basemap switcher (Gray / Dark / Satellite),
   defaulting to the Gray canvas style. */
(function () {
  "use strict";

  var BASEMAPS = {
    gray: {
      label: "Gray",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      options: { maxZoom: 19, maxNativeZoom: 16 },
    },
    dark: {
      label: "Dark",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      options: { maxZoom: 19, maxNativeZoom: 16 },
    },
    satellite: {
      label: "Satellite",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      options: { maxZoom: 19, maxNativeZoom: 19 },
    },
  };
  var BASEMAP_ORDER = ["gray", "dark", "satellite"];
  var DEFAULT_BASEMAP = "gray";

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
    var tileLayers = {};
    var currentBasemap = DEFAULT_BASEMAP;

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

    function setBasemap(name) {
      if (!tileLayers[name] || name === currentBasemap) return;
      map.removeLayer(tileLayers[currentBasemap]);
      tileLayers[name].addTo(map);
      currentBasemap = name;
      updateSwitcherUI();
    }

    var switcherEl, menuEl;

    function updateSwitcherUI() {
      if (!menuEl) return;
      menuEl.querySelectorAll(".res-basemap-option").forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-basemap") === currentBasemap);
      });
    }

    function addBasemapSwitcher() {
      var Switcher = L.Control.extend({
        options: { position: "topright" },
        onAdd: function () {
          switcherEl = L.DomUtil.create("div", "res-basemap-control");

          var toggle = L.DomUtil.create("button", "res-basemap-toggle", switcherEl);
          toggle.type = "button";
          toggle.setAttribute("aria-label", "Change basemap");
          toggle.innerHTML = '<i class="bi bi-layers"></i>';

          menuEl = L.DomUtil.create("div", "res-basemap-menu", switcherEl);
          menuEl.hidden = true;

          BASEMAP_ORDER.forEach(function (key) {
            var btn = L.DomUtil.create("button", "res-basemap-option", menuEl);
            btn.type = "button";
            btn.textContent = BASEMAPS[key].label;
            btn.setAttribute("data-basemap", key);
            L.DomEvent.on(btn, "click", function () {
              setBasemap(key);
              menuEl.hidden = true;
            });
          });

          L.DomEvent.on(toggle, "click", function (e) {
            L.DomEvent.stop(e);
            menuEl.hidden = !menuEl.hidden;
          });

          L.DomEvent.disableClickPropagation(switcherEl);
          L.DomEvent.disableScrollPropagation(switcherEl);

          updateSwitcherUI();
          return switcherEl;
        },
      });

      map.addControl(new Switcher());
    }

    function createMap() {
      map = L.map(mapEl, { scrollWheelZoom: false, attributionControl: false });

      BASEMAP_ORDER.forEach(function (key) {
        tileLayers[key] = L.tileLayer(BASEMAPS[key].url, BASEMAPS[key].options);
      });
      tileLayers[DEFAULT_BASEMAP].addTo(map);

      addBasemapSwitcher();

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
