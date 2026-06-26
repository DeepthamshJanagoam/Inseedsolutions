const galleryPageRoot = document.querySelector("[data-gallery-page]");

if (galleryPageRoot) {
  const apiBase = window.APP_API_BASE || "";
  const grid = document.getElementById("galleryGrid");
  const status = document.getElementById("galleryStatus");
  let lightbox = null;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const resolveImageUrl = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (normalized.startsWith("/")) return `${apiBase}${normalized}`;
    return normalized;
  };

  const ensureLightbox = () => {
    if (lightbox) return lightbox;

    const element = document.createElement("div");
    element.className = "gallery-lightbox";
    element.hidden = true;
    element.innerHTML = `
      <button class="gallery-lightbox-backdrop" type="button" aria-label="Close gallery preview" data-close-gallery></button>
      <figure class="gallery-lightbox-panel" role="dialog" aria-modal="true" aria-labelledby="galleryLightboxTitle">
        <button class="gallery-lightbox-close" type="button" aria-label="Close gallery preview" data-close-gallery>&times;</button>
        <img alt="" />
        <figcaption>
          <strong id="galleryLightboxTitle"></strong>
          <span></span>
        </figcaption>
      </figure>
    `;

    document.body.appendChild(element);
    lightbox = {
      element,
      image: element.querySelector("img"),
      title: element.querySelector("strong"),
      caption: element.querySelector("span"),
      closeButton: element.querySelector(".gallery-lightbox-close"),
    };

    element.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-gallery]")) closeLightbox();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !lightbox.element.hidden) closeLightbox();
    });

    return lightbox;
  };

  const openLightbox = ({ url, title, caption }) => {
    const preview = ensureLightbox();
    preview.image.src = url;
    preview.image.alt = title || "Gallery image";
    preview.title.textContent = title || "Gallery Image";
    preview.caption.textContent = caption || "";
    preview.element.hidden = false;
    document.body.classList.add("gallery-lightbox-open");
    preview.closeButton.focus({ preventScroll: true });
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.element.hidden = true;
    lightbox.image.removeAttribute("src");
    document.body.classList.remove("gallery-lightbox-open");
  };

  const renderImages = (images) => {
    if (!grid) return;

    if (!images.length) {
      grid.innerHTML = `
        <article class="gallery-empty-card">
          <strong>No gallery images yet</strong>
          <span>Published gallery images will appear here automatically.</span>
        </article>
      `;
      return;
    }

    grid.innerHTML = images
      .map((image) => {
        const url = resolveImageUrl(image.url);
        return `
          <button class="gallery-card reveal is-visible" type="button" data-gallery-url="${escapeHtml(url)}" data-gallery-title="${escapeHtml(
          image.title
        )}" data-gallery-caption="${escapeHtml(image.caption)}">
            <img src="${escapeHtml(url)}" alt="${escapeHtml(image.title || "Gallery image")}" loading="lazy" decoding="async" />
            <span>
              <strong>${escapeHtml(image.title || "Gallery Image")}</strong>
              ${image.caption ? `<small>${escapeHtml(image.caption)}</small>` : ""}
            </span>
          </button>
        `;
      })
      .join("");
  };

  grid?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-gallery-url]");
    if (!card) return;

    openLightbox({
      url: card.getAttribute("data-gallery-url"),
      title: card.getAttribute("data-gallery-title"),
      caption: card.getAttribute("data-gallery-caption"),
    });
  });

  const loadGallery = async () => {
    try {
      if (status) status.textContent = "Loading gallery images...";
      const response = await fetch(`${apiBase}${galleryPageRoot.dataset.galleryApi}`);
      const result = await response.json();

      if (!response.ok || !Array.isArray(result.data)) {
        throw new Error(result.message || "Unable to load gallery images");
      }

      renderImages(result.data);
      if (status) status.textContent = `${result.data.length} image${result.data.length === 1 ? "" : "s"} published`;
    } catch (error) {
      if (status) status.textContent = error.message || "Unable to load gallery images.";
    }
  };

  loadGallery();
}
