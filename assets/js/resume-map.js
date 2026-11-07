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
          '<span class="res-pin-pulse"></span>' +
          '<span class="res-pin-icon"><i class="bi bi-geo-alt-fill"></i></span>',
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -34],
      });

      var bounds = [];
      locations.forEach(function (loc) {
        var marker = L.marker([loc.lat, loc.lng], { icon: markerIcon }).addTo(map);
        marker.bindPopup(buildPopupHtml(loc));
        bounds.push([loc.lat, loc.lng]);
      });

      addFlowLines();

      if (bounds.length === 1) {
        map.setView(bounds[0], 6);
      } else {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    function findLocation(nameFragment) {
      var match = locations.filter(function (loc) {
        return loc.place.indexOf(nameFragment) !== -1;
      })[0];
      return match ? [match.lat, match.lng] : null;
    }

    function buildArc(a, b, steps) {
      // Quadratic-bezier arc between two points, bulging outward like a
      // typical flight-path / flow-map line instead of a straight segment.
      var dLat = b[0] - a[0];
      var dLng = b[1] - a[1];
      var dist = Math.sqrt(dLat * dLat + dLng * dLng) || 1;
      var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      var curveFactor = 0.22;
      // Perpendicular unit vector to the a->b line.
      var normLat = -dLng / dist;
      var normLng = dLat / dist;
      var ctrl = [mid[0] + normLat * dist * curveFactor, mid[1] + normLng * dist * curveFactor];

      var pts = [];
      for (var s = 0; s <= steps; s++) {
        var t = s / steps;
        var inv = 1 - t;
        var lat = inv * inv * a[0] + 2 * inv * t * ctrl[0] + t * t * b[0];
        var lng = inv * inv * a[1] + 2 * inv * t * ctrl[1] + t * t * b[1];
        pts.push([lat, lng]);
      }
      return pts;
    }

    function animatePlaneAlongArc(arcPoints, marker) {
      // Flies the plane the full way from one end of the arc to the
      // other, then back again, looping continuously.
      var n = arcPoints.length;
      var DURATION_MS = 4500;
      var startTime = null;

      function frame(timestamp) {
        if (startTime === null) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var cyclePos = elapsed % (DURATION_MS * 2);
        var t = cyclePos <= DURATION_MS ? cyclePos / DURATION_MS : 2 - cyclePos / DURATION_MS;

        var idx = Math.min(n - 1, Math.max(0, Math.round(t * (n - 1))));
        marker.setLatLng(arcPoints[idx]);

        var p1 = arcPoints[Math.max(0, idx - 1)];
        var p2 = arcPoints[Math.min(n - 1, idx + 1)];
        var angle = (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI;
        if (cyclePos > DURATION_MS) angle += 180;

        var el = marker.getElement ? marker.getElement() : null;
        if (el) {
          var wrap = el.querySelector(".res-plane-wrap");
          if (wrap) wrap.style.transform = "rotate(" + angle + "deg)";
        }

        requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    }

    function addFlowLines() {
      // Connects the career path (Sudan -> UAE) with an animated dashed
      // curved line and a plane that flies the full stretch of each leg.
      var order = ["Khartoum", "Abu Dhabi", "Dibba"];
      var points = order
        .map(findLocation)
        .filter(function (p) {
          return p !== null;
        });

      for (var i = 0; i < points.length - 1; i++) {
        var a = points[i];
        var b = points[i + 1];
        var arc = buildArc(a, b, 48);

        L.polyline(arc, {
          color: "#e2a948",
          weight: 2,
          opacity: 0.85,
          dashArray: "6, 8",
          className: "res-flow-line",
          interactive: false,
          smoothFactor: 1,
        }).addTo(map);

        // Only the first leg (the Sudan -> UAE crossing) gets an animated
        // plane; a plane on every short intra-UAE hop is too busy.
        if (i === 0) {
          var planeIcon = L.divIcon({
            className: "res-plane-marker",
            html: '<div class="res-plane-wrap"><i class="bi bi-airplane-fill"></i></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });
          var planeMarker = L.marker(arc[0], { icon: planeIcon, interactive: false }).addTo(map);
          animatePlaneAlongArc(arc, planeMarker);
        }
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
