const adminGalleryRoot = document.querySelector("[data-admin-gallery]");

if (adminGalleryRoot) {
  const session = window.AdminAuth?.requirePage("gallery");

  if (session) {
    const apiBase = window.APP_API_BASE || "";
    const { token, user } = session;
    const grid = document.getElementById("adminGalleryGrid");
    const status = document.getElementById("adminGalleryStatus");
    const preview = document.getElementById("galleryUploadPreview");
    const previewImage = preview?.querySelector("img");
    let previewUrl = "";

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

    const parseJsonResponse = async (response) => {
      const raw = await response.text();
      return raw ? JSON.parse(raw) : {};
    };

    const getHeaders = () => ({
      Authorization: `Bearer ${token}`,
    });

    const setStatus = (message) => {
      if (status) status.textContent = message;
    };

    const renderImages = (images) => {
      if (!grid) return;

      if (!images.length) {
        grid.innerHTML = `
          <article class="admin-gallery-empty">
            <strong>No gallery images found</strong>
            <span>Upload the first image to publish it on the public gallery page.</span>
          </article>
        `;
        return;
      }

      grid.innerHTML = images
        .map((image) => {
          const url = resolveImageUrl(image.url);
          return `
            <article class="admin-gallery-card" data-gallery-item="${escapeHtml(image.filename)}">
              <img src="${escapeHtml(url)}" alt="${escapeHtml(image.title || "Gallery image")}" loading="lazy" decoding="async" />
              <div class="admin-gallery-card-body">
                <label>
                  <span>Title</span>
                  <input type="text" value="${escapeHtml(image.title || "")}" data-gallery-title />
                </label>
                <label>
                  <span>Caption</span>
                  <textarea rows="2" data-gallery-caption>${escapeHtml(image.caption || "")}</textarea>
                </label>
                <div class="table-action-row">
                  <button class="table-action-link" type="button" data-save-gallery="${escapeHtml(image.filename)}">Edit</button>
                  <button class="table-action-link table-action-danger" type="button" data-delete-gallery="${escapeHtml(image.filename)}">Delete</button>
                </div>
              </div>
            </article>
          `;
        })
        .join("");
    };

    const loadGallery = async () => {
      const response = await fetch(`${apiBase}${adminGalleryRoot.dataset.galleryApi}`, {
        headers: getHeaders(),
      });
      const result = await parseJsonResponse(response);

      if (!response.ok || !Array.isArray(result.data)) {
        throw new Error(result.message || "Unable to load gallery images");
      }

      renderImages(result.data);
      setStatus(`${result.data.length} gallery image${result.data.length === 1 ? "" : "s"} loaded for ${user.email}.`);
    };

    document.getElementById("adminGalleryLogoutButton")?.addEventListener("click", window.AdminAuth.logout);

    document.getElementById("galleryImageInput")?.addEventListener("change", (event) => {
      const file = event.currentTarget.files?.[0];

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = "";
      }

      if (!file || !preview || !previewImage) {
        if (preview) preview.hidden = true;
        return;
      }

      previewUrl = URL.createObjectURL(file);
      previewImage.src = previewUrl;
      previewImage.alt = file.name;
      preview.hidden = false;
    });

    document.getElementById("galleryUploadForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitButton = document.getElementById("galleryUploadButton");
      const file = form.galleryImage.files?.[0];

      if (!file) {
        setStatus("Choose an image to upload.");
        return;
      }

      const isAllowed = /image\/(jpeg|png|webp)/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!isAllowed) {
        setStatus("Upload a JPG, JPEG, PNG, or WEBP image.");
        return;
      }

      const formData = new FormData(form);
      if (submitButton) submitButton.disabled = true;
      setStatus("Uploading gallery image...");

      try {
        const response = await fetch(`${apiBase}${adminGalleryRoot.dataset.galleryApi}`, {
          method: "POST",
          headers: getHeaders(),
          body: formData,
        });
        const result = await parseJsonResponse(response);

        if (!response.ok) {
          throw new Error(result.message || "Unable to upload gallery image");
        }

        form.reset();
        if (preview) preview.hidden = true;
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          previewUrl = "";
        }
        await loadGallery();
        setStatus("Gallery image uploaded successfully.");
      } catch (error) {
        setStatus(error.message || "Unable to upload gallery image.");
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });

    grid?.addEventListener("click", async (event) => {
      const saveButton = event.target.closest("[data-save-gallery]");
      const deleteButton = event.target.closest("[data-delete-gallery]");
      const button = saveButton || deleteButton;
      if (!button) return;

      const filename = button.getAttribute(saveButton ? "data-save-gallery" : "data-delete-gallery");
      const card = button.closest("[data-gallery-item]");

      try {
        if (deleteButton) {
          if (!window.confirm("Delete this gallery image?")) return;

          const response = await fetch(`${apiBase}/api/admin/gallery-delete`, {
            method: "POST",
            headers: {
              ...getHeaders(),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ filename }),
          });
          const result = await parseJsonResponse(response);
          if (!response.ok) throw new Error(result.message || "Unable to delete gallery image");
          await loadGallery();
          setStatus("Gallery image deleted successfully.");
          return;
        }

        const payload = {
          title: card?.querySelector("[data-gallery-title]")?.value || "",
          caption: card?.querySelector("[data-gallery-caption]")?.value || "",
        };
        window.AdminAuth?.focusEditTarget?.(card, { focusSelector: "[data-gallery-title]" });
        setStatus(`Editing ${payload.title || filename}. Saving gallery details...`);
        const response = await fetch(`${apiBase}/api/admin/gallery-update`, {
          method: "POST",
          headers: {
            ...getHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ filename, ...payload }),
        });
        const result = await parseJsonResponse(response);
        if (!response.ok) throw new Error(result.message || "Unable to update gallery image");
        await loadGallery();
        setStatus("Gallery image details updated successfully.");
      } catch (error) {
        setStatus(error.message || "Unable to update gallery image.");
      }
    });

    loadGallery().catch((error) => {
      if (/401|403|token|permission|expired/i.test(error.message)) {
        setStatus("Your session could not load gallery data. Please refresh or sign in again.");
        return;
      }

      setStatus(error.message || "Unable to load gallery images.");
    });
  }
}
