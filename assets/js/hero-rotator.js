/* Hero role rotator — crossfades through a short list of titles
   in the hero's left text column, one at a time, looping forever.
   Respects prefers-reduced-motion by just keeping the first title. */
(function () {
  "use strict";

  var roles = [
    "Senior GIS Analyst",
    "Remote Sensing & Geospatial AI",
    "🗺️ Cartographer",
    "🧭 Maps Data Viz",
    "Information Management Officer"
  ];

  function init() {
    var el = document.getElementById("mhRotatorText");
    if (!el) return;

    var reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    var i = 0;
    var holdMs = 2200;
    var fadeMs = 450;

    function showNext() {
      el.classList.add("mh-rotator-hidden");
      setTimeout(function () {
        i = (i + 1) % roles.length;
        el.textContent = roles[i];
        el.classList.remove("mh-rotator-hidden");
      }, fadeMs);
    }

    setInterval(showNext, holdMs + fadeMs);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
