/* Resume section tabs — swaps the visible panel (Summary,
   Experience, Education, Certifications, Skills) without a page
   reload, and keeps ARIA state in sync for accessibility. */
(function () {
  "use strict";

  function init() {
    var tabs = document.querySelectorAll(".res-tab");
    var panels = document.querySelectorAll(".res-panel");
    if (!tabs.length || !panels.length) return;

    function activate(name) {
      tabs.forEach(function (tab) {
        var isActive = tab.getAttribute("data-tab") === name;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      panels.forEach(function (panel) {
        var isActive = panel.id === "res-panel-" + name;
        panel.classList.toggle("active", isActive);
        if (isActive) {
          panel.removeAttribute("hidden");
        } else {
          panel.setAttribute("hidden", "");
        }
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activate(tab.getAttribute("data-tab"));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
