// sidebar.js
document.addEventListener("DOMContentLoaded", () => {
  // fetch and insert sidebar
  fetch("/sidebar.html")
    .then(response => response.text())
    .then(data => {
      const placeholder = document.getElementById("sidebar-placeholder");
      placeholder.innerHTML = data;

      const currentPath = window.location.pathname;

      // highlight active link + auto-expand parent collapsible
      placeholder.querySelectorAll("a").forEach(link => {
        const href = link.getAttribute("href");
        const fullHref = "/" + href.replace(/^\//, "");

        if (currentPath.endsWith(href) || currentPath.endsWith(fullHref)) {
          link.classList.add("active");

          // Expand the matching collapsible and all its ancestor collapsibles
          let p = link.closest('.collapsible');
          while (p) {
            const header = p.querySelector('.collapsible-header');
            const sublist = p.querySelector('.sublist');
            if (sublist) sublist.style.display = 'block';
            if (header) {
              if (header.textContent.includes('▸')) {
                header.textContent = header.textContent.replace('▸', '▾');
              } else if (!header.textContent.includes('▾')) {
                header.textContent = header.textContent.trim() + ' ▾';
              }
            }
            // move to the next ancestor collapsible (if any)
            const parentUL = p.parentElement;
            p = parentUL ? parentUL.closest('.collapsible') : null;
          }
        }
      });

      // initialize collapsibles
      placeholder.querySelectorAll(".collapsible").forEach(item => {
        const header = item.querySelector(".collapsible-header");
        const sublist = item.querySelector(".sublist");
        if (!header || !sublist) return;

        if (!sublist.style.display) {
          sublist.style.display = "none";
        }

        header.style.cursor = "pointer";
        header.addEventListener("click", () => {
          const isOpen = sublist.style.display === "block";
          sublist.style.display = isOpen ? "none" : "block";
          header.textContent = isOpen
            ? header.textContent.replace("▾", "▸")
            : header.textContent.replace("▸", "▾");
        });
      });
    })
    .catch(err => console.error("Sidebar load error:", err));
});
