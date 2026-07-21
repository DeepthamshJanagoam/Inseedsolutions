const traineeEnrollmentRoot = document.querySelector("[data-trainee-enrollment]");

if (traineeEnrollmentRoot) {
  const session = window.AdminAuth?.requirePage("trainee-enrollment");

  if (session) {
    const apiBase = window.APP_API_BASE || "";
    const { token, user } = session;
    const state = {
      trainees: [],
      query: "",
      course: "all",
      page: 1,
      pageSize: 10,
      totalRecords: 0,
      totalPages: 1,
      metrics: {
        totalTrainees: 0,
        activeCourses: 0,
        reachableRecords: 0,
        placementReady: 0,
      },
      courseOptions: [],
      isLoading: false,
      editingId: "",
      documentFiles: {},
      existingDocuments: {},
    };
    let searchTimer = 0;

  const TRAINEE_DOCUMENTS = {
    qualificationCertificate: {
      label: "Qualification Certificate",
      accept: [".pdf", ".jpg", ".jpeg", ".png"],
      required: true,
    },
    profilePhoto: {
      label: "Profile Photo",
      accept: [".jpg", ".jpeg", ".png"],
      required: false,
    },
    aadharCard: {
      label: "Aadhar Card",
      accept: [".pdf", ".jpg", ".jpeg", ".png"],
      required: false,
    },
    panCard: {
      label: "PAN Card",
      accept: [".pdf", ".jpg", ".jpeg", ".png"],
      required: false,
    },
    bankPassbook: {
      label: "Bank Passbook",
      accept: [".pdf", ".jpg", ".jpeg", ".png"],
      required: false,
    },
  };
  const MAX_TRAINEE_DOCUMENT_SIZE = 5 * 1024 * 1024;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const parseJsonResponse = async (response) => {
    const raw = await response.text();
    return raw ? JSON.parse(raw) : {};
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

  const formatCount = (value, singular, plural = `${singular}s`) => `${value} ${value === 1 ? singular : plural}`;

  const toBoolean = (value) => String(value) === "true";
  const stripDigits = (value) => String(value || "").replace(/\D/g, "");

  const isValidCandidateId = (value) => /^[A-Z0-9-]{5,24}$/i.test(String(value || "").trim());
  const isValidPhone = (value) => {
    const digits = stripDigits(value);
    return digits.length >= 10 && digits.length <= 15;
  };
  const isValidPincode = (value) => !value || stripDigits(value).length === 6;
  const isValidIfsc = (value) => !value || /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(value || "").trim());
  const isFutureDate = (value) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const getProfileData = (trainee = {}) => trainee.profileData || {};
  const isImageFile = (file) => /^image\//i.test(file?.type || "") || /\.(jpe?g|png)$/i.test(file?.name || "");
  const formatFileSize = (size = 0) => {
    if (!size) return "";
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };
  const getFileExtension = (fileName) => {
    const match = String(fileName || "").toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : "";
  };
  const validateUploadFile = (fieldName, file) => {
    const config = TRAINEE_DOCUMENTS[fieldName];
    if (!config || !file) return "";
    if (!config.accept.includes(getFileExtension(file.name))) {
      return `${config.label} must be ${config.accept.join(", ").toUpperCase().replaceAll(".", "")}.`;
    }
    if (file.size > MAX_TRAINEE_DOCUMENT_SIZE) {
      return `${config.label} must be 5 MB or smaller.`;
    }
    return "";
  };

  const hydrateCourseFilter = () => {
    const filter = document.getElementById("traineeCourseFilter");
    if (!filter) return;

    const currentValue = state.course;
    const courses = [...new Set(state.courseOptions.filter(Boolean))].sort((a, b) => a.localeCompare(b));

    filter.innerHTML =
      '<option value="all">All courses</option>' +
      courses.map((course) => `<option value="${escapeHtml(course)}">${escapeHtml(course)}</option>`).join("");
    filter.value = courses.includes(currentValue) ? currentValue : "all";
    state.course = filter.value;
  };

  const renderMetrics = () => {
    setText("traineeMetricTotal", state.metrics.totalTrainees);
    setText("traineeMetricCourses", state.metrics.activeCourses);
    setText("traineeMetricReachable", state.metrics.reachableRecords);
    setText("traineeMetricPlacementReady", state.metrics.placementReady);
  };

  const updateUrlState = () => {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.set("page", String(state.page));
    params.set("limit", String(state.pageSize));

    if (state.query.trim()) {
      params.set("search", state.query.trim());
    } else {
      params.delete("search");
    }

    if (state.course !== "all") {
      params.set("course", state.course);
    } else {
      params.delete("course");
    }

    window.history.replaceState({}, "", `${url.pathname}?${params.toString()}`);
  };

  const hydrateStateFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const page = Number(params.get("page"));
    const limit = Number(params.get("limit"));
    state.page = Number.isFinite(page) && page > 0 ? page : 1;
    state.pageSize = [10, 25, 50, 100].includes(limit) ? limit : 10;
    state.query = params.get("search") || "";
    state.course = params.get("course") || "all";

    const searchInput = document.getElementById("traineeSearch");
    const pageSizeSelect = document.getElementById("traineePageSize");
    if (searchInput) searchInput.value = state.query;
    if (pageSizeSelect) pageSizeSelect.value = String(state.pageSize);
  };

  const renderPagination = () => {
    window.AdminPagination?.render({
      container: document.getElementById("traineePagination"),
      currentPage: state.page,
      totalPages: state.totalPages,
      totalRecords: state.totalRecords,
      pageSize: state.pageSize,
      isLoading: state.isLoading,
      onPageChange: async (page) => {
        state.page = page;
        await loadTrainees();
      },
    });
  };

  const renderLoadingRows = () => {
    const body = document.getElementById("traineeTableBody");
    if (!body) return;

    body.innerHTML = Array.from({ length: Math.min(state.pageSize, 10) })
      .map(
        () => `
          <tr class="table-skeleton-row">
            <td colspan="6"><span class="table-skeleton-line"></span></td>
          </tr>
        `
      )
      .join("");
  };

  const setAnimatedFieldVisibility = (field, isVisible) => {
    if (!field) return;

    window.clearTimeout(Number(field.dataset.hideTimer || 0));

    if (isVisible) {
      field.hidden = false;
      field.setAttribute("aria-hidden", "false");
      window.requestAnimationFrame(() => field.classList.add("is-visible"));
      return;
    }

    field.classList.remove("is-visible");
    field.setAttribute("aria-hidden", "true");
    field.dataset.hideTimer = window.setTimeout(() => {
      if (!field.classList.contains("is-visible")) {
        field.hidden = true;
      }
    }, 240);
  };

  const toggleConditionalFields = () => {
    const disabilityToggle = document.getElementById("traineeDisabilityToggle");
    const disabilityTypeField = document.getElementById("traineeDisabilityTypeField");
    const disabilityInput = disabilityTypeField?.querySelector("input");
    const ojtToggle = document.getElementById("traineeOjtToggle");
    const ojtCompletionField = document.getElementById("traineeOjtCompletionField");
    const ojtInput = ojtCompletionField?.querySelector("input");

    const hasDisability = toBoolean(disabilityToggle?.value);
    setAnimatedFieldVisibility(disabilityTypeField, hasDisability);
    if (disabilityInput) {
      disabilityInput.required = hasDisability;
      if (!hasDisability) disabilityInput.value = "";
    }

    const hasOjt = toBoolean(ojtToggle?.value);
    if (ojtCompletionField) ojtCompletionField.hidden = !hasOjt;
    if (ojtInput) {
      ojtInput.required = hasOjt;
      if (!hasOjt) ojtInput.value = "";
    }
  };

  const renderFormMode = () => {
    const isEditing = Boolean(state.editingId);
    const submitButton = document.getElementById("traineeFormSubmitButton");
    const cancelButton = document.getElementById("traineeFormCancelButton");
    const heading = document.getElementById("traineeFormHeading");
    const passwordField = document.getElementById("traineePasswordField");
    const passwordInput = document.getElementById("traineePasswordInput");

    if (heading) {
      heading.textContent = isEditing ? "Update trainee record" : "Add a new trainee";
    }

    if (submitButton) {
      submitButton.textContent = isEditing ? "Update Trainee" : "Save Trainee";
    }

    if (cancelButton) {
      cancelButton.hidden = !isEditing;
    }

    if (passwordField) {
      passwordField.hidden = isEditing;
    }

    if (passwordInput) {
      passwordInput.required = !isEditing;
      if (isEditing) {
        passwordInput.value = "";
      }
    }
  };

  const setInsightCard = (trainee) => {
    const insight = document.getElementById("selectedTraineeInsight");
    if (!insight) return;

    if (!trainee) {
      insight.innerHTML = `
        <strong>Enrollment notes</strong>
        <span>Create a trainee record first, then continue to Placement Details when the candidate is ready for hiring workflows.</span>
      `;
      return;
    }

    const profileData = getProfileData(trainee);
    const placementCount = Array.isArray(trainee.placements) ? trainee.placements.length : 0;
    insight.innerHTML = `
      <strong>${escapeHtml(trainee.fullName)}</strong>
      <span>${escapeHtml(trainee.candidateCode || profileData?.basicInfo?.candidateId || "Candidate ID pending")}</span>
      <span>${escapeHtml(trainee.course || "Course not set")}</span>
      <span>${escapeHtml(trainee.email || "No email")} | ${escapeHtml(trainee.phone || "No phone")}</span>
      <span>${formatCount(placementCount, "placement record")}</span>
    `;
  };

  const renderUploadField = (fieldName) => {
    const wrapper = document.querySelector(`[data-upload-name="${fieldName}"]`);
    if (!wrapper) return;

    const input = wrapper.querySelector('input[type="file"]');
    const preview = wrapper.querySelector("[data-upload-preview]");
    const title = wrapper.querySelector("[data-upload-title]");
    const meta = wrapper.querySelector("[data-upload-meta]");
    const removeButton = wrapper.querySelector("[data-upload-remove]");
    const file = state.documentFiles[fieldName];
    const existing = state.existingDocuments[fieldName];
    const config = TRAINEE_DOCUMENTS[fieldName];
    const hasDocument = Boolean(file || existing);

    if (input) {
      input.required = Boolean(config?.required && !hasDocument);
      input.setCustomValidity("");
    }

    wrapper.classList.remove("is-invalid");

    if (preview) {
      preview.innerHTML = "FILE";
    }

    if (file) {
      if (preview && isImageFile(file)) {
        const imageUrl = URL.createObjectURL(file);
        preview.innerHTML = `<img src="${imageUrl}" alt="" />`;
        preview.querySelector("img")?.addEventListener("load", () => URL.revokeObjectURL(imageUrl), { once: true });
      } else if (preview) {
        preview.textContent = getFileExtension(file.name).replace(".", "").toUpperCase() || "FILE";
      }
      if (title) title.textContent = file.name;
      if (meta) meta.textContent = `${formatFileSize(file.size)} selected`;
      if (removeButton) removeButton.hidden = false;
      return;
    }

    if (existing) {
      if (preview && /^image\//i.test(existing.mimeType || "")) {
        preview.innerHTML = `<img src="${escapeHtml(existing.url)}" alt="" />`;
      } else if (preview) {
        preview.textContent = getFileExtension(existing.originalName || existing.fileName).replace(".", "").toUpperCase() || "FILE";
      }
      if (title) title.textContent = existing.originalName || existing.fileName || config.label;
      if (meta) meta.textContent = "Uploaded file saved";
      if (removeButton) removeButton.hidden = false;
      return;
    }

    if (title) title.textContent = "Upload file";
    if (meta) meta.textContent = fieldName === "profilePhoto" ? "JPG or PNG up to 5 MB" : "PDF, JPG, or PNG up to 5 MB";
    if (removeButton) removeButton.hidden = true;
  };

  const renderUploadFields = () => {
    Object.keys(TRAINEE_DOCUMENTS).forEach(renderUploadField);
  };

  const setUploadFile = (fieldName, file) => {
    const input = document.querySelector(`[data-upload-name="${fieldName}"] input[type="file"]`);
    const error = validateUploadFile(fieldName, file);
    if (error) {
      if (input) input.setCustomValidity(error);
      throw new Error(error);
    }

    state.documentFiles[fieldName] = file;
    delete state.existingDocuments[fieldName];
    renderUploadField(fieldName);
  };

  const clearUploadField = (fieldName) => {
    const input = document.querySelector(`[data-upload-name="${fieldName}"] input[type="file"]`);
    delete state.documentFiles[fieldName];
    delete state.existingDocuments[fieldName];
    if (input) {
      input.value = "";
      input.setCustomValidity("");
    }
    renderUploadField(fieldName);
  };

  const validateDocumentUploads = () => {
    for (const [fieldName, config] of Object.entries(TRAINEE_DOCUMENTS)) {
      const wrapper = document.querySelector(`[data-upload-name="${fieldName}"]`);
      const input = wrapper?.querySelector('input[type="file"]');
      const hasDocument = Boolean(state.documentFiles[fieldName] || state.existingDocuments[fieldName]);
      const error =
        config.required && !hasDocument
          ? `${config.label} is required.`
          : validateUploadFile(fieldName, state.documentFiles[fieldName]);

      if (input) input.setCustomValidity(error);
      wrapper?.classList.toggle("is-invalid", Boolean(error));
      if (error) throw new Error(error);
    }
  };

  const bindUploadFields = () => {
    document.querySelectorAll("[data-upload-field]").forEach((wrapper) => {
      const fieldName = wrapper.dataset.uploadName;
      const input = wrapper.querySelector('input[type="file"]');
      const card = wrapper.querySelector(".trainee-upload-card");
      const replaceButton = wrapper.querySelector("[data-upload-replace]");
      const removeButton = wrapper.querySelector("[data-upload-remove]");

      const openPicker = () => input?.click();
      const handleFile = (file) => {
        if (!file) return;
        try {
          setUploadFile(fieldName, file);
          setText("traineeFormStatus", "");
        } catch (error) {
          setText("traineeFormStatus", error.message);
          wrapper.classList.add("is-invalid");
        }
      };

      card?.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        openPicker();
      });
      card?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      });
      card?.addEventListener("dragover", (event) => {
        event.preventDefault();
        card.classList.add("is-drag-over");
      });
      card?.addEventListener("dragleave", () => {
        card.classList.remove("is-drag-over");
      });
      card?.addEventListener("drop", (event) => {
        event.preventDefault();
        card.classList.remove("is-drag-over");
        handleFile(event.dataTransfer?.files?.[0]);
      });
      input?.addEventListener("change", () => handleFile(input.files?.[0]));
      replaceButton?.addEventListener("click", openPicker);
      removeButton?.addEventListener("click", () => clearUploadField(fieldName));
    });

    renderUploadFields();
  };

  const buildProfilePayload = (form) => {
    const formData = new FormData(form);
    const candidateId = String(formData.get("candidateId") || "").trim();
    const disability = toBoolean(formData.get("disability"));
    const ojtConfirmation = toBoolean(formData.get("ojtConfirmation"));

    const structuredData = {
      basicInfo: {
        candidateId,
        fullName: String(formData.get("fullName") || "").trim(),
        fatherName: String(formData.get("fatherName") || "").trim(),
        motherName: String(formData.get("motherName") || "").trim(),
        mobileNumber: String(formData.get("phone") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        dateOfBirth: String(formData.get("dateOfBirth") || "").trim(),
      },
      education: {
        course: String(formData.get("course") || "").trim(),
        education: String(formData.get("educationLevel") || "").trim(),
        religion: String(formData.get("religion") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        disability,
      },
      bank: {
        accountNumber: String(formData.get("bankAccountNumber") || "").trim(),
        bankName: String(formData.get("bankName") || "").trim(),
        branch: String(formData.get("bankBranch") || "").trim(),
        ifscCode: String(formData.get("ifscCode") || "").trim(),
      },
      address: {
        city: String(formData.get("city") || "").trim(),
        mandal: String(formData.get("mandal") || "").trim(),
        district: String(formData.get("district") || "").trim(),
        state: String(formData.get("state") || "").trim(),
        pincode: String(formData.get("pincode") || "").trim(),
      },
      training: {
        assessmentStatus: String(formData.get("assessmentStatus") || "").trim(),
        ojtConfirmation,
        ojtCompletion: ojtConfirmation ? String(formData.get("ojtCompletion") || "").trim() : "",
      },
      placement: {},
      salary: [],
      documents: { ...state.existingDocuments },
    };

    if (disability) {
      structuredData.education.disabilityType = String(formData.get("disabilityType") || "").trim();
    }

    return {
      candidateCode: candidateId,
      fullName: structuredData.basicInfo.fullName,
      email: structuredData.basicInfo.email,
      phone: structuredData.basicInfo.mobileNumber,
      course: structuredData.education.course,
      password: String(formData.get("password") || "").trim(),
      ...structuredData,
      profileData: structuredData,
    };
  };

  const buildStudentFormData = (payload, isEditing) => {
    const body = new FormData();
    body.set("candidateCode", payload.candidateCode);
    body.set("fullName", payload.fullName);
    body.set("email", payload.email);
    body.set("phone", payload.phone);
    body.set("course", payload.course);
    body.set("profileData", JSON.stringify(payload.profileData));
    if (isEditing) {
      body.set("id", state.editingId);
    }

    if (!isEditing) {
      body.set("password", payload.password || "");
    }

    Object.entries(state.documentFiles).forEach(([fieldName, file]) => {
      if (file) body.set(fieldName, file);
    });

    return body;
  };

  const resetForm = () => {
    const form = document.getElementById("traineeEnrollmentForm");
    form?.reset();
    window.AdminAuth?.clearEditFocus?.();
    const editField = document.getElementById("traineeEditId");
    if (editField) editField.value = "";
    state.editingId = "";
    renderFormMode();
    toggleConditionalFields();
    setInsightCard(null);
    state.documentFiles = {};
    state.existingDocuments = {};
    renderUploadFields();
    setText("traineeFormStatus", "");
  };

  const renderTable = () => {
    const body = document.getElementById("traineeTableBody");
    if (!body) return;

    const pageRows = state.trainees;

    setText("traineeTableCount", `${state.totalRecords} record${state.totalRecords === 1 ? "" : "s"}`);
    renderMetrics();
    renderPagination();

    if (!pageRows.length) {
      body.innerHTML = `
        <tr>
          <td colspan="6">
            <strong>No trainees found</strong>
            <small>Try adjusting your search terms or course filter, or add a new trainee record.</small>
          </td>
        </tr>
      `;
      return;
    }

    body.innerHTML = pageRows
      .map((trainee) => {
        const placementCount = Array.isArray(trainee.placements) ? trainee.placements.length : 0;
        const profileData = getProfileData(trainee);
        return `
          <tr>
            <td>
              <strong>${escapeHtml(trainee.fullName)}</strong>
              <small>ID: ${escapeHtml(trainee.candidateCode || profileData?.basicInfo?.candidateId || trainee.id)}</small>
            </td>
            <td>${escapeHtml(trainee.course || "-")}</td>
            <td>${escapeHtml(trainee.phone || "-")}</td>
            <td>${escapeHtml(trainee.email || "-")}</td>
            <td><span class="status-badge ${placementCount ? "placed" : "offer-pending"}">${placementCount ? formatCount(placementCount, "record") : "No records"}</span></td>
            <td>
              <div class="table-action-row">
                <button class="table-action-link" type="button" data-edit-trainee="${escapeHtml(trainee.id)}">Edit</button>
                <button class="table-action-link table-action-danger" type="button" data-delete-trainee="${escapeHtml(trainee.id)}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const loadTrainees = async () => {
    setText("traineeModuleMeta", user.email);
    state.isLoading = true;
    renderLoadingRows();
    renderPagination();

    const params = new URLSearchParams({
      page: String(state.page),
      limit: String(state.pageSize),
    });
    if (state.query.trim()) params.set("search", state.query.trim());
    if (state.course !== "all") params.set("course", state.course);

    try {
      const response = await fetch(`${apiBase}${traineeEnrollmentRoot.dataset.studentsApi}?${params.toString()}`, {
        headers: getHeaders(false),
      });

      const result = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(result.message || "Unable to load trainee data");
      }

      const pagination = result.pagination || {};
      state.trainees = result.data || [];
      state.totalRecords = Number(pagination.totalRecords) || 0;
      state.totalPages = Math.max(1, Number(pagination.totalPages) || 1);
      state.page = Math.min(Math.max(1, Number(pagination.currentPage) || state.page), state.totalPages);
      state.pageSize = Number(pagination.limit) || state.pageSize;
      state.metrics = {
        ...state.metrics,
        ...(result.metrics || {}),
      };
      state.courseOptions = result.filters?.courses || state.courseOptions;

      hydrateCourseFilter();
      updateUrlState();
      renderTable();
    } finally {
      state.isLoading = false;
      renderPagination();
    }
  };

  const fillForm = (trainee) => {
    const form = document.getElementById("traineeEnrollmentForm");
    if (!form || !trainee) return;

    const profileData = getProfileData(trainee);
    const basicInfo = profileData.basicInfo || {};
    const education = profileData.education || {};
    const bank = profileData.bank || {};
    const address = profileData.address || {};
    const training = profileData.training || {};
    const documents = profileData.documents || {};

    form.fullName.value = trainee.fullName || basicInfo.fullName || "";
    form.email.value = trainee.email || basicInfo.email || "";
    form.phone.value = trainee.phone || basicInfo.mobileNumber || "";
    form.course.value = trainee.course || education.course || "";
    form.candidateId.value = trainee.candidateCode || basicInfo.candidateId || "";
    form.fatherName.value = basicInfo.fatherName || "";
    form.motherName.value = basicInfo.motherName || "";
    form.dateOfBirth.value = basicInfo.dateOfBirth || "";
    form.educationLevel.value = education.education || "";
    form.religion.value = education.religion || "";
    form.category.value = education.category || "";
    form.disability.value =
      education.disability === true ? "true" : education.disability === false ? "false" : "";
    form.disabilityType.value = education.disabilityType || "";
    form.bankAccountNumber.value = bank.accountNumber || "";
    form.bankName.value = bank.bankName || "";
    form.bankBranch.value = bank.branch || "";
    form.ifscCode.value = bank.ifscCode || "";
    form.city.value = address.city || "";
    form.mandal.value = address.mandal || "";
    form.district.value = address.district || "";
    form.state.value = address.state || "";
    form.pincode.value = address.pincode || "";
    form.assessmentStatus.value = training.assessmentStatus || "";
    form.ojtConfirmation.value =
      training.ojtConfirmation === true ? "true" : training.ojtConfirmation === false ? "false" : "";
    form.ojtCompletion.value = training.ojtCompletion || "";
    state.documentFiles = {};
    state.existingDocuments = { ...documents };
    renderUploadFields();

    const editField = document.getElementById("traineeEditId");
    if (editField) editField.value = trainee.id;
    state.editingId = trainee.id;
    renderFormMode();
    toggleConditionalFields();
    setInsightCard(trainee);
    const heading = document.getElementById("traineeFormHeading");
    if (heading) heading.textContent = `Edit ${trainee.fullName}`;
    setText("traineeFormStatus", `Editing ${trainee.fullName}`);
    window.AdminAuth?.focusEditTarget?.(document.querySelector(".trainee-form-panel"));
  };

  const bindFilters = () => {
    document.getElementById("traineeSearch")?.addEventListener("input", (event) => {
      state.query = event.target.value;
      state.page = 1;
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(loadTrainees, 250);
    });

    document.getElementById("traineeCourseFilter")?.addEventListener("change", async (event) => {
      state.course = event.target.value;
      state.page = 1;
      await loadTrainees();
    });

    document.getElementById("traineePageSize")?.addEventListener("change", async (event) => {
      state.pageSize = Number(event.target.value) || 10;
      state.page = 1;
      await loadTrainees();
    });
  };

  const bindConditionalFields = () => {
    document.getElementById("traineeDisabilityToggle")?.addEventListener("change", toggleConditionalFields);
    document.getElementById("traineeOjtToggle")?.addEventListener("change", toggleConditionalFields);
  };

  const validateNestedRequirements = (payload) => {
    if (!payload.profileData.basicInfo.candidateId) {
      throw new Error("Candidate ID is missing.");
    }

    if (!isValidCandidateId(payload.profileData.basicInfo.candidateId)) {
      throw new Error("Candidate ID should use letters, numbers, or hyphens only.");
    }

    const duplicateCandidate = state.trainees.find(
      (trainee) =>
        trainee.id !== state.editingId &&
        String(trainee.candidateCode || "").trim().toLowerCase() ===
          payload.profileData.basicInfo.candidateId.trim().toLowerCase()
    );
    if (duplicateCandidate) {
      throw new Error("Candidate ID already exists. Please use a unique Candidate ID.");
    }

    if (!isValidPhone(payload.profileData.basicInfo.mobileNumber)) {
      throw new Error("Mobile number should contain 10 to 15 digits.");
    }

    const duplicateEmail = state.trainees.find(
      (trainee) =>
        trainee.id !== state.editingId &&
        String(trainee.email || "").trim().toLowerCase() ===
          payload.profileData.basicInfo.email.trim().toLowerCase()
    );
    if (duplicateEmail) {
      throw new Error("Email already exists for another trainee record.");
    }

    if (isFutureDate(payload.profileData.basicInfo.dateOfBirth)) {
      throw new Error("Date of birth cannot be in the future.");
    }

    if (!isValidIfsc(payload.profileData.bank.ifscCode)) {
      throw new Error("IFSC code must follow the standard 11-character bank format.");
    }

    if (!isValidPincode(payload.profileData.address.pincode)) {
      throw new Error("Pincode must contain exactly 6 digits.");
    }

    if (payload.profileData.education.disability && !payload.profileData.education.disabilityType) {
      throw new Error("Type of disability is required when disability is set to Yes.");
    }

    if (payload.profileData.training.ojtConfirmation && !payload.profileData.training.ojtCompletion) {
      throw new Error("OJT completion date is required when OJT is confirmed.");
    }
  };

  const bindForm = () => {
    const form = document.getElementById("traineeEnrollmentForm");
    const status = document.getElementById("traineeFormStatus");

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitButton = document.getElementById("traineeFormSubmitButton");
      const isEditing = Boolean(state.editingId);
      try {
        validateDocumentUploads();
      } catch (error) {
        if (status) status.textContent = error.message;
        return;
      }

      if (!form.reportValidity()) return;

      try {
        const payload = buildProfilePayload(form);
        validateNestedRequirements(payload);
        if (!isEditing) {
          payload.password = payload.password || "";
        } else {
          delete payload.password;
        }

        if (status) status.textContent = isEditing ? "Updating trainee..." : "Saving trainee...";
        if (submitButton) submitButton.disabled = true;

        const endpoint = isEditing
          ? `${apiBase}/api/admin/student-update`
          : `${apiBase}${traineeEnrollmentRoot.dataset.studentsApi}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: getHeaders(false),
          body: buildStudentFormData(payload, isEditing),
        });

        const result = await parseJsonResponse(response);
        if (!response.ok) {
          throw new Error(result.message || "Unable to save trainee");
        }

        resetForm();
        if (status) {
          status.textContent = isEditing ? "Trainee updated successfully." : "Trainee created successfully.";
        }
        await loadTrainees();
        setText("traineeModuleMeta", isEditing ? "Trainee record updated." : "New trainee enrolled successfully.");
      } catch (error) {
        if (status) status.textContent = error.message || "Unable to save trainee.";
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });

    document.getElementById("traineeFormCancelButton")?.addEventListener("click", resetForm);
  };

  const bindTableActions = () => {
    document.getElementById("traineeTableBody")?.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-edit-trainee]");
      if (editButton) {
        const traineeId = editButton.getAttribute("data-edit-trainee");
        const trainee = state.trainees.find((item) => item.id === traineeId);
        fillForm(trainee);
        return;
      }

      const deleteButton = event.target.closest("[data-delete-trainee]");
      if (!deleteButton) return;

      const traineeId = deleteButton.getAttribute("data-delete-trainee");
      const trainee = state.trainees.find((item) => item.id === traineeId);
      if (!traineeId || !window.confirm(`Delete trainee record for ${trainee?.fullName || "this user"}?`)) {
        return;
      }

      try {
        const response = await fetch(`${apiBase}/api/admin/student-delete`, {
          method: "POST",
          headers: {
            ...getHeaders(false),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ id: traineeId }),
        });

        const result = await parseJsonResponse(response);
        if (!response.ok) {
          throw new Error(result.message || "Unable to delete trainee");
        }

        if (state.editingId === traineeId) {
          resetForm();
        }

        await loadTrainees();
        setText("traineeModuleMeta", "Trainee record deleted successfully.");
      } catch (error) {
        setText("traineeModuleMeta", error.message || "Unable to delete trainee record.");
      }
    });
  };

  const bindLogout = () => {
    document.getElementById("adminTraineeLogoutButton")?.addEventListener("click", window.AdminAuth.logout);
  };

  const bindAutofillGuard = () => {
    const form = document.getElementById("traineeEnrollmentForm");
    if (!form) return;

    let hasManualInput = false;
    const fields = Array.from(form.querySelectorAll("input")).filter(
      (field) => !["hidden", "file", "button", "submit"].includes(field.type)
    );

    fields.forEach((field) => {
      field.addEventListener("input", () => {
        hasManualInput = true;
      });
    });

    const clearNewTraineeFields = () => {
      if (state.editingId || hasManualInput) return;
      fields.forEach((field) => {
        field.value = "";
        field.removeAttribute("value");
      });
    };

    clearNewTraineeFields();
    window.addEventListener("pageshow", clearNewTraineeFields);
    [50, 250, 800].forEach((delay) => window.setTimeout(clearNewTraineeFields, delay));
  };

    const init = async () => {
      hydrateStateFromUrl();
      bindLogout();
      bindFilters();
      bindConditionalFields();
      bindForm();
      bindTableActions();
      bindUploadFields();
      renderFormMode();
      resetForm();
      bindAutofillGuard();

      try {
        await loadTrainees();
        setText("traineeModuleMeta", "Protected trainee enrollment data loaded successfully.");
      } catch (error) {
        if (/401|403|token|permission|expired/i.test(error.message)) {
          window.AdminAuth.logout();
          return;
        }

        setText("traineeModuleMeta", error.message || "Unable to load trainee enrollment data.");
        const body = document.getElementById("traineeTableBody");
        if (body) {
          body.innerHTML = `
            <tr>
              <td colspan="6">
                <strong>Module unavailable</strong>
                <small>${escapeHtml(error.message || "We could not load trainee data.")}</small>
              </td>
            </tr>
          `;
        }
      }
    };

    init();
  }
}
