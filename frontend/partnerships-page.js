const partnershipsPageRoot = document.querySelector("[data-partnerships-page]");

if (partnershipsPageRoot) {
  const apiBase = window.APP_API_BASE || "";
  const grid = document.getElementById("partnerAgreementsGrid");
  let modalElements = null;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const resolveDocumentHref = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (normalized.startsWith("/")) {
      return `${apiBase}${normalized}`;
    }
    return normalized;
  };

  const getMouDocumentValue = (agreement) =>
    agreement?.mouUrl || agreement?.mouDocumentUrl || agreement?.mouFilePath || agreement?.mouDocumentPath || "";

  const isPdfDocumentValue = (value) => {
    const normalized = String(value || "").trim();
    return /^data:application\/pdf;base64,/i.test(normalized) || /\.pdf(?:[?#].*)?$/i.test(normalized);
  };

  const ensureMouModal = () => {
    if (modalElements) return modalElements;

    const modal = document.createElement("div");
    modal.className = "mou-modal";
    modal.setAttribute("hidden", "");
    modal.innerHTML = `
      <div class="mou-modal-backdrop" data-close-mou-modal></div>
      <section class="mou-modal-panel" role="dialog" aria-modal="true" aria-labelledby="mouModalTitle">
        <header class="mou-modal-header">
          <h2 id="mouModalTitle">MOU Document</h2>
          <div class="mou-modal-actions">
            <a class="button button-secondary button-sm" data-mou-open-link target="_blank" rel="noreferrer">Open in new tab</a>
            <button class="mou-modal-close" type="button" aria-label="Close MOU document" data-close-mou-modal>&times;</button>
          </div>
        </header>
        <iframe class="mou-modal-frame" title="MOU Document PDF viewer"></iframe>
      </section>
    `;

    document.body.appendChild(modal);
    modalElements = {
      modal,
      frame: modal.querySelector(".mou-modal-frame"),
      openLink: modal.querySelector("[data-mou-open-link]"),
      closeButton: modal.querySelector(".mou-modal-close"),
    };

    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-mou-modal]")) {
        closeMouModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modalElements.modal.hasAttribute("hidden")) {
        closeMouModal();
      }
    });

    return modalElements;
  };

  const openMouModal = (url) => {
    const absoluteUrl = resolveDocumentHref(url);
    if (!absoluteUrl) return;

    const { modal, frame, openLink, closeButton } = ensureMouModal();
    frame.src = absoluteUrl;
    openLink.href = absoluteUrl;
    modal.removeAttribute("hidden");
    document.body.classList.add("mou-modal-open");
    closeButton.focus({ preventScroll: true });
  };

  const closeMouModal = () => {
    if (!modalElements) return;

    modalElements.modal.setAttribute("hidden", "");
    modalElements.frame.removeAttribute("src");
    modalElements.openLink.removeAttribute("href");
    document.body.classList.remove("mou-modal-open");
  };

  const renderAgreements = (agreements) => {
    if (!grid || !agreements.length) return;

    grid.innerHTML = agreements
      .map((agreement) => {
        const tags = Array.isArray(agreement.tags) ? agreement.tags : [];
        const bullets = Array.isArray(agreement.bullets) ? agreement.bullets : [];
        const mouDocumentValue = getMouDocumentValue(agreement);
        const ctaHref = isPdfDocumentValue(mouDocumentValue) ? resolveDocumentHref(mouDocumentValue) : "";
        const ctaLabel = agreement.mouLabel || "View MOU";
        const hasDocument = Boolean(ctaHref);

        return `
          <article class="partner-card reveal is-visible">
            <div class="partner-logo">${escapeHtml(agreement.shortCode || agreement.name.slice(0, 2).toUpperCase())}</div>
            <div class="tag-row">
              ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
            <h3>${escapeHtml(agreement.name)}</h3>
            <ul class="executive-list executive-list-strong">
              ${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}
            </ul>
            <div class="partner-card-actions">
              ${
                hasDocument
                  ? `<button class="button button-secondary partner-button" type="button" data-mou-url="${escapeHtml(ctaHref)}">${escapeHtml(ctaLabel)}</button>`
                  : `<span class="partner-mou-empty">No MOU uploaded yet.</span>`
              }
            </div>
          </article>
        `;
      })
      .join("");
  };

  grid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mou-url]");
    if (!button) return;

    openMouModal(button.getAttribute("data-mou-url"));
  });

  const loadAgreements = async () => {
    try {
      const response = await fetch(`${apiBase}${partnershipsPageRoot.dataset.agreementsApi}`);
      const raw = await response.text();
      const result = raw ? JSON.parse(raw) : {};

      if (!response.ok || !Array.isArray(result.data) || !result.data.length) {
        return;
      }

      console.debug(
        "Partnership agreements loaded",
        result.data.map((agreement) => ({
          name: agreement.name,
          mouUrl: agreement.mouUrl,
          mouDocumentUrl: agreement.mouDocumentUrl,
          mouFilePath: agreement.mouFilePath,
        }))
      );
      renderAgreements(result.data);
    } catch (error) {
      console.warn("Unable to load partnership agreements from API.", error);
    }
  };

  loadAgreements();
}
