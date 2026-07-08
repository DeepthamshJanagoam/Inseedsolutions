const adminPartnershipsRoot = document.querySelector("[data-admin-partnerships]");

if (adminPartnershipsRoot) {
  const session = window.AdminAuth?.requirePage("partnerships");

  if (session) {
    const apiBase = window.APP_API_BASE || "";
    const { token, user } = session;
    const state = {
      agreements: [],
      editingId: "",
    };

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const parseJsonResponse = async (response) => {
    const raw = await response.text();
    if (!raw) return {};

    try {
      return JSON.parse(raw);
    } catch (error) {
      const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 140);
      return {
        success: false,
        message: `Server returned ${response.status} ${response.statusText || "response"} instead of JSON.${snippet ? ` ${snippet}` : ""}`,
      };
    }
  };

  const getHeaders = (includeJson = true) => {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const asLines = (value) =>
    Array.isArray(value)
      ? value.join("\n")
      : String(value || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
          .join("\n");

  const resolveMouDocumentUrl = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (normalized.startsWith("/")) {
      return `${apiBase}${normalized}`;
    }
    return normalized;
  };

  const renderDocumentCard = (agreement) => {
    const card = document.getElementById("partnershipDocumentCard");
    if (!card) return;

    const absoluteUrl = resolveMouDocumentUrl(agreement?.mouUrl);
    const fileName = absoluteUrl ? absoluteUrl.split("/").pop() : "";

    if (!agreement || !absoluteUrl) {
      card.innerHTML = `
        <strong>Current MOU document</strong>
        <span>No document uploaded yet.</span>
      `;
      return;
    }

    card.innerHTML = `
      <strong>Current MOU document</strong>
      <span>${escapeHtml(fileName || "Uploaded document available")}</span>
      <a class="table-action-link" href="${escapeHtml(absoluteUrl)}" target="_blank" rel="noreferrer">Open uploaded file</a>
    `;
  };

  const renderMetrics = () => {
    const active = state.agreements.filter((item) => item.isActive);
    const uniqueTags = new Set(active.flatMap((item) => (Array.isArray(item.tags) ? item.tags : []))).size;
    const lastSlot = state.agreements.reduce((max, item) => Math.max(max, Number(item.sortOrder) || 0), 0);

    setText("partnershipMetricTotal", state.agreements.length);
    setText("partnershipMetricActive", active.length);
    setText("partnershipMetricTags", uniqueTags);
    setText("partnershipMetricSort", lastSlot);
  };

  const renderTable = () => {
    const body = document.getElementById("partnershipTableBody");
    if (!body) return;

    setText("partnershipTableCount", `${state.agreements.length} record${state.agreements.length === 1 ? "" : "s"}`);
    renderMetrics();

    if (!state.agreements.length) {
      body.innerHTML = `
        <tr>
          <td colspan="5">
            <strong>No partnership agreements found</strong>
            <small>Create your first agreement to publish it dynamically on the public partnerships page.</small>
          </td>
        </tr>
      `;
      return;
    }

    body.innerHTML = state.agreements
      .map(
        (agreement) => `
          <tr>
            <td>
              <strong>${escapeHtml(agreement.name)}</strong>
              <small>${escapeHtml(agreement.shortCode)}${agreement.summary ? ` | ${escapeHtml(agreement.summary)}` : ""}</small>
            </td>
            <td>${(Array.isArray(agreement.tags) ? agreement.tags : []).map((tag) => `<span class="inline-tag">${escapeHtml(tag)}</span>`).join("")}</td>
            <td><span class="status-badge ${agreement.isActive ? "placed" : "offer-pending"}">${agreement.isActive ? "Live" : "Draft"}</span></td>
            <td>${escapeHtml(agreement.sortOrder)}</td>
            <td>
              <div class="table-action-row">
                <button class="table-action-link" type="button" data-edit-partnership="${escapeHtml(agreement.id)}">Edit</button>
                <button class="table-action-link table-action-danger" type="button" data-delete-partnership="${escapeHtml(agreement.id)}">Delete</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  };

  const resetForm = () => {
    document.getElementById("partnershipAgreementForm")?.reset();
    document.getElementById("partnershipAgreementId").value = "";
    state.editingId = "";
    setText("partnershipFormHeading", "Create a new partnership agreement");
    setText("partnershipFormStatus", "");
    const cancelButton = document.getElementById("partnershipCancelButton");
    if (cancelButton) cancelButton.hidden = true;
    const submitButton = document.getElementById("partnershipSubmitButton");
    if (submitButton) submitButton.textContent = "Save Agreement";
    renderDocumentCard(null);
  };

  const loadAgreements = async () => {
    setText("partnershipAdminMeta", user.email);

    const response = await fetch(`${apiBase}${adminPartnershipsRoot.dataset.partnershipsApi}`, {
      headers: getHeaders(),
    });

    const result = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(result.message || "Unable to load partnership agreements");
    }

    state.agreements = Array.isArray(result.data) ? result.data : [];
    renderTable();
  };

  const fillForm = (agreement) => {
    const form = document.getElementById("partnershipAgreementForm");
    if (!form || !agreement) return;

    form.name.value = agreement.name || "";
    form.shortCode.value = agreement.shortCode || "";
    form.tags.value = asLines(agreement.tags);
    form.bullets.value = asLines(agreement.bullets);
    form.mouLabel.value = agreement.mouLabel || "";
    form.summary.value = agreement.summary || "";
    form.sortOrder.value = agreement.sortOrder ?? 0;
    form.isActive.value = String(Boolean(agreement.isActive));
    document.getElementById("partnershipAgreementId").value = agreement.id;
    state.editingId = agreement.id;
    setText("partnershipFormHeading", `Edit ${agreement.name}`);
    setText("partnershipFormStatus", `Editing ${agreement.name}`);
    const cancelButton = document.getElementById("partnershipCancelButton");
    if (cancelButton) cancelButton.hidden = false;
    const submitButton = document.getElementById("partnershipSubmitButton");
    if (submitButton) submitButton.textContent = "Update Agreement";
    renderDocumentCard(agreement);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const bindForm = () => {
    const form = document.getElementById("partnershipAgreementForm");
    const status = document.getElementById("partnershipFormStatus");

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = document.getElementById("partnershipSubmitButton");
      const isEditing = Boolean(state.editingId);
      if (!form.reportValidity()) return;
      const formData = new FormData(form);
      const multipartData = new FormData();
      multipartData.set("name", formData.get("name"));
      multipartData.set("shortCode", formData.get("shortCode"));
      multipartData.set("tags", asLines(formData.get("tags")));
      multipartData.set("bullets", asLines(formData.get("bullets")));
      multipartData.set("mouLabel", formData.get("mouLabel") || "View MOU");
      multipartData.set("summary", formData.get("summary") || "");
      multipartData.set("sortOrder", formData.get("sortOrder") || "0");
      multipartData.set("isActive", formData.get("isActive") === "true" ? "true" : "false");
      if (isEditing) {
        multipartData.set("id", state.editingId);
      }

      const mouDocument = document.getElementById("mouDocumentInput")?.files?.[0];
      if (mouDocument) {
        const isPdf = mouDocument.type === "application/pdf" || /\.pdf$/i.test(mouDocument.name || "");
        if (!isPdf) {
          if (status) status.textContent = "Please upload a PDF file for the MOU document.";
          return;
        }

        multipartData.set("mouDocument", mouDocument);
      }

      if (status) status.textContent = isEditing ? "Updating agreement..." : "Creating agreement...";
      if (submitButton) submitButton.disabled = true;

      try {
        const endpoint = isEditing
          ? `${apiBase}/api/admin/partnership-update`
          : `${apiBase}${adminPartnershipsRoot.dataset.partnershipsApi}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: getHeaders(false),
          body: multipartData,
        });

        const result = await parseJsonResponse(response);
        if (!response.ok) {
          throw new Error(result.message || "Unable to save partnership agreement");
        }

        resetForm();
        await loadAgreements();
        setText("partnershipAdminMeta", isEditing ? "Agreement updated successfully." : "Agreement created successfully.");
      } catch (error) {
        if (status) status.textContent = error.message || "Unable to save partnership agreement.";
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });

    document.getElementById("partnershipCancelButton")?.addEventListener("click", resetForm);
  };

  const bindTableActions = () => {
    document.getElementById("partnershipTableBody")?.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-edit-partnership]");
      if (editButton) {
        const id = editButton.getAttribute("data-edit-partnership");
        fillForm(state.agreements.find((item) => item.id === id));
        return;
      }

      const deleteButton = event.target.closest("[data-delete-partnership]");
      if (!deleteButton) return;

      const id = deleteButton.getAttribute("data-delete-partnership");
      const agreement = state.agreements.find((item) => item.id === id);
      if (!id || !window.confirm(`Delete agreement for ${agreement?.name || "this institution"}?`)) {
        return;
      }

      try {
        const response = await fetch(`${apiBase}/api/admin/partnership-delete`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ id }),
        });

        const result = await parseJsonResponse(response);
        if (!response.ok) {
          throw new Error(result.message || "Unable to delete partnership agreement");
        }

        if (state.editingId === id) {
          resetForm();
        }

        await loadAgreements();
        setText("partnershipAdminMeta", "Agreement deleted successfully.");
      } catch (error) {
        setText("partnershipAdminMeta", error.message || "Unable to delete partnership agreement.");
      }
    });
  };

  const bindLogout = () => {
    document.getElementById("adminPartnershipLogoutButton")?.addEventListener("click", window.AdminAuth.logout);
  };

    const init = async () => {
      bindLogout();
      bindForm();
      bindTableActions();
      renderDocumentCard(null);

      try {
        await loadAgreements();
        setText("partnershipAdminMeta", "Partnership agreements loaded successfully.");
      } catch (error) {
        if (/401|403|token|permission|expired/i.test(error.message)) {
          window.AdminAuth.logout();
          return;
        }

        setText("partnershipAdminMeta", error.message || "Unable to load partnership agreements.");
        const body = document.getElementById("partnershipTableBody");
        if (body) {
          body.innerHTML = `
            <tr>
              <td colspan="5">
                <strong>Module unavailable</strong>
                <small>${escapeHtml(error.message || "We could not load partnership agreements.")}</small>
              </td>
            </tr>
          `;
        }
      }
    };

    init();
  }
}
