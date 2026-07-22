const placementManagementRoot = document.querySelector("[data-placement-management]");

if (placementManagementRoot) {
  const session = window.AdminAuth?.requirePage("placement-details");

  if (session) {
    const apiBase = window.APP_API_BASE || "";
    const { token, user } = session;
    const state = {
      students: [],
      institutions: [],
      placements: [],
      query: "",
      status: "all",
      institution: "all",
      editingId: "",
      salaryRows: [],
    };

  const MAX_SALARY_MONTHS = 6;

  const formatMoney = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatStatus = (value) =>
    String(value || "")
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const formatDate = (value) =>
    value
      ? new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(value))
      : "-";

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  const parseJsonResponse = async (response) => {
    const raw = await response.text();
    return raw ? JSON.parse(raw) : {};
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
  const normalizeLower = (value) => String(value || "").trim().toLowerCase();
  const formatSalaryMonth = (date) =>
    date.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

  const parseJoiningDate = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return null;
    const [year, month, day] = normalized.split("-").map(Number);
    if (!year || !month || !day) return null;
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isSkillDepartmentYes = () =>
    String(document.getElementById("placementSkillDepartment")?.value || "").trim().toLowerCase() === "yes";

  const buildGeneratedSalaryRows = (joiningDateValue, existingRows = []) => {
    const joiningDate = parseJoiningDate(joiningDateValue);
    if (!joiningDate) return [];

    return Array.from({ length: MAX_SALARY_MONTHS }, (_, index) => {
      const monthDate = new Date(joiningDate.getFullYear(), joiningDate.getMonth() + index, 1);
      return {
        slNo: index + 1,
        month: formatSalaryMonth(monthDate),
        salary: existingRows[index]?.salary || "",
      };
    });
  };
  const hasFutureDate = (value) => {
    if (!value) return false;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return true;
    return false;
  };

  const selectedTraineeCard = document.getElementById("selectedTraineeCard");
  const candidateIdInput = document.getElementById("placementCandidateIdInput");

  const getStudentProfileData = (student) => student?.profileData || {};
  const normalizeCandidateId = (value) => String(value || "").trim().toLowerCase();
  const findStudentByCandidateId = (value) => {
    const normalized = normalizeCandidateId(value);
    if (!normalized) return null;

    return (
      state.students.find((student) =>
        [student.candidateCode, student.profileData?.basicInfo?.candidateId, student.id]
          .filter(Boolean)
          .some((candidateValue) => normalizeCandidateId(candidateValue) === normalized)
      ) || null
    );
  };

  const renderSalaryRows = () => {
    const container = document.getElementById("salaryRowsContainer");
    const help = document.getElementById("salaryTrackingHelp");
    if (!container) return;

    if (help) {
      help.textContent = state.salaryRows.length
        ? "Six consecutive months are generated from Date of Joining. Enter each take-home salary before saving."
        : "Select Date of Joining to auto-generate the next six salary months.";
    }

    container.innerHTML = state.salaryRows.length
      ? state.salaryRows
          .map(
            (row, index) => `
              <tr>
                <td>${row.slNo || index + 1}</td>
                <td>
                  <input class="salary-month-readonly" type="text" value="${escapeHtml(row.month)}" readonly tabindex="-1" />
                </td>
                <td>
                  <input
                    type="number"
                    inputmode="numeric"
                    data-salary-amount="${index}"
                    value="${escapeHtml(row.salary)}"
                    min="1"
                    step="1"
                    placeholder="Enter salary"
                  />
                </td>
              </tr>
            `
          )
          .join("")
      : `
        <tr>
          <td colspan="3" class="salary-table-empty">Salary Tracking appears only for Skill Department candidates after Date of Joining is selected.</td>
        </tr>
      `;
  };

  const syncSalaryRowsFromDom = () => {
    state.salaryRows = state.salaryRows.map((row, index) => ({
      slNo: row.slNo || index + 1,
      month: row.month,
      salary: document.querySelector(`[data-salary-amount="${index}"]`)?.value || "",
    }));
  };

  const setSalaryRows = (rows = []) => {
    state.salaryRows = rows;
    renderSalaryRows();
  };

  const refreshSalaryTracking = ({ preserveSalaries = true } = {}) => {
    const form = document.getElementById("placementManagementForm");
    const salarySection = document.getElementById("salaryTrackingAccordion");
    const showSalaryTracking = isSkillDepartmentYes();

    if (salarySection) salarySection.hidden = !showSalaryTracking;

    if (!showSalaryTracking) {
      setSalaryRows([]);
      return;
    }

    syncSalaryRowsFromDom();
    setSalaryRows(buildGeneratedSalaryRows(form?.placementDate?.value, preserveSalaries ? state.salaryRows : []));
  };

  const getEditingPlacement = () =>
    state.editingId ? state.placements.find((placement) => placement.id === state.editingId) || null : null;

  const renderFormMode = () => {
    const isEditing = Boolean(state.editingId);
    const heading = document.querySelector(".placement-form-panel .panel-heading h2");
    const submitButton = document.getElementById("placementSubmitButton");
    const cancelButton = document.getElementById("placementCancelButton");

    if (heading) heading.textContent = isEditing ? "Update placement record" : "Create a new placement record";
    if (submitButton) submitButton.textContent = isEditing ? "Update Placement" : "Add Placement";
    if (cancelButton) cancelButton.hidden = !isEditing;
  };

  const togglePlacementConditionalFields = () => {
    const ojtToggle = document.getElementById("placementOjtToggle");
    const ojtField = document.getElementById("placementOjtCompletionField");
    const ojtInput = ojtField?.querySelector("input");
    const hasOjt = String(ojtToggle?.value) === "true";

    if (ojtField) ojtField.hidden = !hasOjt;
    if (ojtInput) {
      ojtInput.required = hasOjt;
      if (!hasOjt) ojtInput.value = "";
    }

    refreshSalaryTracking();
  };

  const getSelectedStudent = () => {
    return findStudentByCandidateId(candidateIdInput?.value);
  };

  const renderSelectedTrainee = (candidateId) => {
    if (!selectedTraineeCard) return;

    const student = findStudentByCandidateId(candidateId);
    const profileData = getStudentProfileData(student);
    const basicInfo = profileData.basicInfo || {};
    const education = profileData.education || {};
    const training = profileData.training || {};

    if (!student) {
      selectedTraineeCard.innerHTML = `
        <strong>Selected trainee</strong>
        <span>Enter a saved candidate ID to review course and contact details.</span>
      `;
      return;
    }

    selectedTraineeCard.innerHTML = `
      <strong>${escapeHtml(student.fullName)}</strong>
      <span>${escapeHtml(student.candidateCode || basicInfo.candidateId || "Candidate ID pending")}</span>
      <span>${escapeHtml(student.course || education.course || "-")}</span>
      <span>${escapeHtml(student.email || basicInfo.email || "-")}${student.phone ? ` | ${escapeHtml(student.phone)}` : ""}</span>
      <span>Assessment: ${escapeHtml(training.assessmentStatus || "Not set")}</span>
    `;

    togglePlacementConditionalFields();
  };

  const populateSelect = (selectId, items, labelResolver) => {
    const select = document.getElementById(selectId);
    if (!select) return;

    const placeholder = select.querySelector("option")?.outerHTML || "";
    select.innerHTML =
      placeholder +
      items
        .map((item) => {
          const label = typeof labelResolver === "function" ? labelResolver(item) : item[labelResolver];
          return `<option value="${item.id}">${escapeHtml(label)}</option>`;
        })
        .join("");
  };

  const populateFilter = (selectId, values, defaultLabel) => {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML =
      `<option value="all">${defaultLabel}</option>` +
      values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  };

  const getFilteredPlacements = () => {
    const query = state.query.trim().toLowerCase();

    return state.placements.filter((placement) => {
      const searchable = [
        placement.student?.fullName,
        placement.student?.candidateCode,
        placement.companyName,
        placement.role,
        placement.institution?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !query || searchable.includes(query);
      const matchesStatus = state.status === "all" || placement.status === state.status;
      const matchesInstitution =
        state.institution === "all" || placement.institution?.name === state.institution;

      return matchesQuery && matchesStatus && matchesInstitution;
    });
  };

  const renderMetrics = (placements) => {
    const placed = placements.filter((item) => item.status === "PLACED");
    const totalPackage = placements.reduce((sum, item) => sum + (item.package || 0), 0);
    const average = placements.length ? Math.round(totalPackage / placements.length) : 0;
    const topPlacement = [...placements].sort((a, b) => (b.package || 0) - (a.package || 0))[0];

    setText("placementMetricTotal", placements.length);
    setText("placementMetricPlaced", placed.length);
    setText("placementMetricAverage", formatMoney(average));
    setText("placementMetricCompany", topPlacement?.companyName || "-");
  };

  const renderTable = () => {
    const body = document.getElementById("placementAdminTableBody");
    if (!body) return;

    const placements = getFilteredPlacements();
    setText("placementTableCount", `${placements.length} record${placements.length === 1 ? "" : "s"}`);
    renderMetrics(placements);

    if (!placements.length) {
      body.innerHTML = `
        <tr>
          <td colspan="8">
            <strong>No placement records found</strong>
            <small>Try changing the search or filter settings, or add a new placement entry.</small>
          </td>
        </tr>
      `;
      return;
    }

    body.innerHTML = placements
      .map(
        (placement) => `
          <tr>
            <td>
              <strong>${escapeHtml(placement.student?.fullName || "-")}</strong>
              <small>${escapeHtml(placement.student?.candidateCode || placement.student?.email || "-")}</small>
            </td>
            <td>${escapeHtml(placement.institution?.name || "-")}</td>
            <td>${escapeHtml(placement.companyName)}</td>
            <td>${escapeHtml(placement.role)}</td>
            <td>${formatMoney(placement.package)}</td>
            <td><span class="status-badge ${formatStatus(placement.status).toLowerCase().replaceAll(" ", "-")}">${formatStatus(placement.status)}</span></td>
            <td>${formatDate(placement.placementDate)}</td>
            <td>
              <div class="table-action-row">
                <button class="table-action-link" type="button" data-edit-placement="${escapeHtml(placement.id)}">Edit</button>
                <a class="table-action-link" href="mailto:${escapeHtml(placement.student?.email || "")}">Contact</a>
                <button class="table-action-link table-action-danger" type="button" data-delete-placement="${escapeHtml(placement.id)}">Delete</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  };

  const hydrateFilters = () => {
    const statuses = [...new Set(state.placements.map((item) => formatStatus(item.status)))];
    const institutions = [...new Set(state.placements.map((item) => item.institution?.name).filter(Boolean))];
    populateFilter("placementAdminStatusFilter", statuses, "All statuses");
    populateFilter("placementAdminInstitutionFilter", institutions, "All institutions");
  };

  const loadData = async () => {
    setText("placementModuleMeta", user.email);

    const [studentsResponse, institutionsResponse, placementsResponse] = await Promise.all([
      fetch(`${apiBase}${placementManagementRoot.dataset.studentsApi}`, { headers: getHeaders() }),
      fetch(`${apiBase}${placementManagementRoot.dataset.institutionsApi}`, { headers: getHeaders() }),
      fetch(`${apiBase}${placementManagementRoot.dataset.placementsApi}`, { headers: getHeaders() }),
    ]);

    const [studentsResult, institutionsResult, placementsResult] = await Promise.all([
      parseJsonResponse(studentsResponse),
      parseJsonResponse(institutionsResponse),
      parseJsonResponse(placementsResponse),
    ]);

    if (!studentsResponse.ok || !institutionsResponse.ok || !placementsResponse.ok) {
      const errorMessage =
        studentsResult.message ||
        institutionsResult.message ||
        placementsResult.message ||
        "Unable to load placement management data";
      throw new Error(errorMessage);
    }

    state.students = studentsResult.data || [];
    state.institutions = institutionsResult.data || [];
    state.placements = placementsResult.data || [];

    populateSelect("placementInstitutionSelect", state.institutions, "name");
    hydrateFilters();
    renderTable();
  };

  const buildPlacementPayload = (form) => {
    syncSalaryRowsFromDom();
    const formData = new FormData(form);
    const candidateId = String(formData.get("candidateId") || "").trim();
    const student = getSelectedStudent();
    const profileData = getStudentProfileData(student);
    const basicInfo = profileData.basicInfo || {};
    const education = profileData.education || {};
    const bank = profileData.bank || {};
    const address = profileData.address || {};
    const salaryTracking = isSkillDepartmentYes()
      ? state.salaryRows.map((row, index) => ({
          slNo: index + 1,
          month: String(row.month || "").trim(),
          salary: Number(row.salary),
        }))
      : [];
    const ojtConfirmation = String(formData.get("ojtConfirmation")) === "true";

    const structuredData = {
      basicInfo: {
        candidateId: candidateId || student?.candidateCode || basicInfo.candidateId || "",
        fullName: String(formData.get("candidateName") || "").trim(),
        fatherName: basicInfo.fatherName || "",
        motherName: basicInfo.motherName || "",
        mobileNumber: student?.phone || basicInfo.mobileNumber || "",
        email: student?.email || basicInfo.email || "",
        dateOfBirth: basicInfo.dateOfBirth || "",
      },
      education,
      bank,
      address,
      training: {
        assessmentStatus: String(formData.get("assessmentStatus") || "").trim(),
        ojtConfirmation,
        ojtCompletion: ojtConfirmation ? String(formData.get("ojtCompletion") || "").trim() : "",
      },
      placement: {
        candidateName: String(formData.get("candidateName") || "").trim(),
        skillDepartment: String(formData.get("skillDepartment") || "").trim(),
        companyName: String(formData.get("companyName") || "").trim(),
        role: String(formData.get("role") || "").trim(),
        package: String(formData.get("package") || "").trim(),
        dateOfJoining: String(formData.get("placementDate") || "").trim(),
        status: String(formData.get("status") || "").trim(),
      },
      salaryTracking,
    };

    return {
      candidateId,
      studentId: student?.id || "",
      institutionId: String(formData.get("institutionId") || "").trim(),
      skillDepartment: structuredData.placement.skillDepartment,
      companyName: structuredData.placement.companyName,
      role: structuredData.placement.role,
      package: structuredData.placement.package,
      placementDate: structuredData.placement.dateOfJoining,
      status: structuredData.placement.status,
      salaryTracking,
      ...structuredData,
      details: structuredData,
    };
  };

  const validatePlacementPayload = (payload) => {
    if (!payload.candidateId) throw new Error("Please enter a candidate ID.");
    if (!payload.studentId) throw new Error("Candidate ID must match an enrolled trainee.");
    if (!payload.institutionId) throw new Error("Please select an institution.");
    if (!payload.details.basicInfo.fullName) throw new Error("Candidate name is required.");
    if (!payload.skillDepartment) throw new Error("Please confirm whether the candidate belongs to the skill department.");
    if (!payload.details.training.assessmentStatus) throw new Error("Assessment status is required.");
    if (!payload.companyName) throw new Error("Company name is required.");
    if (!payload.role) throw new Error("Role / designation is required.");
    if (!isPositiveNumber(payload.package)) throw new Error("Package must be a positive number.");
    if (hasFutureDate(payload.placementDate)) throw new Error("Date of joining must be a valid date.");
    if (payload.details.training.ojtConfirmation && !payload.details.training.ojtCompletion) {
      throw new Error("OJT completion date is required when OJT is confirmed.");
    }
    if (normalizeLower(payload.skillDepartment) === "yes") {
      if (payload.details.salaryTracking.length !== MAX_SALARY_MONTHS) {
        throw new Error("Salary Tracking requires Date of Joining and all 6 generated months.");
      }
      if (payload.details.salaryTracking.some((row) => !row.month || !isPositiveNumber(row.salary))) {
        throw new Error("Please enter numeric take-home salary values for all 6 months.");
      }
    }
  };

  const resetPlacementForm = () => {
    const form = document.getElementById("placementManagementForm");
    form?.reset();
    window.AdminAuth?.clearEditFocus?.();
    const editField = document.getElementById("placementEditId");
    if (editField) editField.value = "";
    state.editingId = "";
    setSalaryRows([]);
    renderSelectedTrainee("");
    togglePlacementConditionalFields();
    renderFormMode();
    setText("placementFormStatus", "");
  };

  const bindAutofillGuard = () => {
    const form = document.getElementById("placementManagementForm");
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

    const clearNewPlacementFields = () => {
      if (state.editingId || hasManualInput) return;
      fields.forEach((field) => {
        field.value = "";
        field.removeAttribute("value");
      });
    };

    clearNewPlacementFields();
    window.addEventListener("pageshow", clearNewPlacementFields);
    [50, 250, 800].forEach((delay) => window.setTimeout(clearNewPlacementFields, delay));
  };

  const fillPlacementForm = (placement) => {
    const form = document.getElementById("placementManagementForm");
    if (!form || !placement) return;

    const details = placement.details || {};
    const training = details.training || {};
    const placementDetails = details.placement || {};
    const student = placement.student || {};

    form.candidateId.value = student.candidateCode || details.basicInfo?.candidateId || placement.studentId || "";
    form.institutionId.value = placement.institutionId || placement.institution?.id || "";
    form.candidateName.value =
      placementDetails.candidateName || details.basicInfo?.fullName || student.fullName || "";
    form.skillDepartment.value = placementDetails.skillDepartment || details.skillDepartment || placement.skillDepartment || "";
    form.assessmentStatus.value = training.assessmentStatus || "";
    form.ojtConfirmation.value = String(Boolean(training.ojtConfirmation));
    form.ojtCompletion.value = training.ojtCompletion || "";
    form.role.value = placement.role || placementDetails.role || "";
    form.companyName.value = placement.companyName || placementDetails.companyName || "";
    form.package.value = placement.package || placementDetails.package || "";
    form.placementDate.value = String(placement.placementDate || placementDetails.dateOfJoining || "").slice(0, 10);
    form.status.value = placement.status || placementDetails.status || "";

    const editField = document.getElementById("placementEditId");
    if (editField) editField.value = placement.id;
    state.editingId = placement.id;
    const savedSalaryRows = Array.isArray(details.salaryTracking)
      ? details.salaryTracking
      : Array.isArray(details.salary)
      ? details.salary
      : [];
    setSalaryRows(
      buildGeneratedSalaryRows(form.placementDate.value, savedSalaryRows).map((row, index) => ({
        ...row,
        salary: savedSalaryRows[index]?.salary || "",
      }))
    );
    renderSelectedTrainee(form.candidateId.value);
    togglePlacementConditionalFields();
    renderFormMode();
    const recordName = placement.student?.fullName || placement.companyName || "placement record";
    const heading = document.querySelector(".placement-form-panel .panel-heading h2");
    if (heading) heading.textContent = `Edit ${recordName}`;
    setText("placementFormStatus", `Editing ${recordName}`);
    window.AdminAuth?.focusEditTarget?.(document.querySelector(".placement-form-panel"));
  };

  const bindFilters = () => {
    document.getElementById("placementAdminSearch")?.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderTable();
    });

    document.getElementById("placementAdminStatusFilter")?.addEventListener("change", (event) => {
      state.status =
        event.target.value === "all"
          ? "all"
          : event.target.value.toUpperCase().replaceAll(" ", "_");
      renderTable();
    });

    document.getElementById("placementAdminInstitutionFilter")?.addEventListener("change", (event) => {
      state.institution = event.target.value;
      renderTable();
    });

    document.getElementById("placementCandidateIdInput")?.addEventListener("input", (event) => {
      renderSelectedTrainee(event.target.value);
    });

    document.getElementById("placementOjtToggle")?.addEventListener("change", togglePlacementConditionalFields);
    document.getElementById("placementSkillDepartment")?.addEventListener("change", () => {
      refreshSalaryTracking({ preserveSalaries: false });
    });
    document.querySelector('[name="placementDate"]')?.addEventListener("change", () => {
      refreshSalaryTracking();
    });

    document.getElementById("salaryRowsContainer")?.addEventListener("keydown", (event) => {
      if (!event.target.matches("[data-salary-amount]")) return;
      if (["e", "E", "+", "-", "."].includes(event.key)) event.preventDefault();
    });
    document.getElementById("salaryRowsContainer")?.addEventListener("input", (event) => {
      if (event.target.matches("[data-salary-amount]")) {
        event.target.value = event.target.value.replace(/\D/g, "");
      }
      syncSalaryRowsFromDom();
    });
  };

  const bindForm = () => {
    const form = document.getElementById("placementManagementForm");
    const status = document.getElementById("placementFormStatus");

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitButton = document.getElementById("placementSubmitButton");
      const isEditing = Boolean(state.editingId);
      if (!form.reportValidity()) return;

      try {
        const payload = buildPlacementPayload(form);
        validatePlacementPayload(payload);

        if (status) status.textContent = isEditing ? "Updating placement record..." : "Creating placement record...";
        if (submitButton) submitButton.disabled = true;

        const endpoint = isEditing
          ? `${apiBase}${placementManagementRoot.dataset.placementsApi}/${state.editingId}`
          : `${apiBase}${placementManagementRoot.dataset.placementsApi}`;
        const response = await fetch(endpoint, {
          method: isEditing ? "PUT" : "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });

        const result = await parseJsonResponse(response);
        if (!response.ok) throw new Error(result.message || "Unable to create placement");

        resetPlacementForm();
        if (status) status.textContent = isEditing ? "Placement record updated successfully." : "Placement record added successfully.";
        await loadData();
      } catch (error) {
        if (status) status.textContent = error.message || "Unable to save placement.";
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });

    document.getElementById("placementCancelButton")?.addEventListener("click", resetPlacementForm);
  };

  const bindTableActions = () => {
    document.getElementById("placementAdminTableBody")?.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-edit-placement]");
      if (editButton) {
        const placement = state.placements.find((item) => item.id === editButton.getAttribute("data-edit-placement"));
        fillPlacementForm(placement);
        return;
      }

      const button = event.target.closest("[data-delete-placement]");
      if (!button) return;

      const placementId = button.getAttribute("data-delete-placement");
      if (!placementId || !window.confirm("Delete this placement record?")) return;

      try {
        const response = await fetch(`${apiBase}${placementManagementRoot.dataset.placementsApi}/${placementId}`, {
          method: "DELETE",
          headers: getHeaders(),
        });

        const result = await parseJsonResponse(response);
        if (!response.ok) throw new Error(result.message || "Unable to delete placement");

        if (state.editingId === placementId) {
          resetPlacementForm();
        }

        await loadData();
      } catch (error) {
        setText("placementModuleMeta", error.message || "Unable to delete placement record.");
      }
    });
  };

  const bindLogout = () => {
    document.getElementById("adminPlacementLogoutButton")?.addEventListener("click", window.AdminAuth.logout);
  };

    const init = async () => {
      bindLogout();
      bindFilters();
      bindForm();
      bindTableActions();
      resetPlacementForm();
      bindAutofillGuard();

      try {
        await loadData();
        setText("placementModuleMeta", "Protected admin data loaded successfully.");
      } catch (error) {
        if (/401|403|token|permission|expired/i.test(error.message)) {
          setText("placementModuleMeta", "Your session could not load placement data. Please refresh or sign in again.");
          return;
        }

        setText("placementModuleMeta", error.message || "Unable to load placement management data.");
        const body = document.getElementById("placementAdminTableBody");
        if (body) {
          body.innerHTML = `
            <tr>
              <td colspan="8">
                <strong>Module unavailable</strong>
                <small>${escapeHtml(error.message || "We could not load placement management data.")}</small>
              </td>
            </tr>
          `;
        }
      }
    };

    init();
  }
}
