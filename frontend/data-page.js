const publicReportsRoot = document.querySelector("[data-public-reports]");

if (publicReportsRoot) {
  const apiBase = window.APP_API_BASE || "";

  const state = {
    currentPage: 1,
    pageSize: 10,
    table: { columns: [], rows: [] },
    currentFilters: {},
    reportType: "trainee",
  };

  const elements = {
    filterForm: document.getElementById("dataFilterForm"),
    typeFilter: document.getElementById("dataTypeFilter"),
    courseFilter: document.getElementById("dataCourseFilter"),
    qualificationFilter: document.getElementById("dataQualificationFilter"),
    dateFilter: document.getElementById("dataDateFilter"),
    filterStatus: document.getElementById("dataFilterStatus"),
    meta: document.getElementById("dataMeta"),
    statTotal: document.getElementById("dataStatTotal"),
    statPlaced: document.getElementById("dataStatPlaced"),
    statAverage: document.getElementById("dataStatAverage"),
    statLabel: document.getElementById("dataStatLabel"),
    statLabelCaption: document.getElementById("dataStatLabelCaption"),
    statusDonut: document.getElementById("dataStatusDonut"),
    statusLegend: document.getElementById("dataStatusLegend"),
    distributionChart: document.getElementById("dataDistributionChart"),
    distributionHeading: document.getElementById("dataDistributionHeading"),
    tableHeading: document.getElementById("dataTableHeading"),
    tableHead: document.getElementById("dataTableHead"),
    tableBody: document.getElementById("dataTableBody"),
    paginationSummary: document.getElementById("dataPaginationSummary"),
    paginationActions: document.getElementById("dataPaginationActions"),
    exportExcelButton: document.getElementById("dataExportExcelButton"),
    exportPdfButton: document.getElementById("dataExportPdfButton"),
  };

  const palette = ["#68d5bc", "#7387ff", "#f0cf71", "#f29c80", "#7fd3ef", "#9c8df6"];

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

  const formatLabel = (value) =>
    String(value || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());

  const formatDate = (value) => {
    if (!value || value === "-") return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const setLoadingState = (button, isLoading, label) => {
    if (!button) return;

    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = label || "Loading...";
      button.disabled = true;
      return;
    }

    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  };

  const getFilters = () => ({
    reportType: elements.typeFilter?.value || "",
    course: elements.courseFilter?.value || "",
    qualification: elements.qualificationFilter?.value || "",
    dateOfJoining: elements.dateFilter?.value || "",
  });

  const buildQuery = (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  };

  const renderOptions = (options, filters) => {
    const populateSelect = (select, values, defaultLabel, selectedValue) => {
      if (!select) return;

      select.innerHTML = [`<option value="">${defaultLabel}</option>`]
        .concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`))
        .join("");

      if (selectedValue) {
        select.value = selectedValue;
      }
    };

    if (elements.typeFilter && Array.isArray(options.reportTypes)) {
      elements.typeFilter.innerHTML = '<option value="">Select report type</option>' + options.reportTypes
        .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
        .join("");
      elements.typeFilter.value = filters.reportType || "";
    }

    populateSelect(elements.courseFilter, options.courses || [], "All Courses", filters.course);
    populateSelect(
      elements.qualificationFilter,
      options.qualifications || [],
      "All Qualifications",
      filters.qualification
    );

    if (elements.dateFilter) {
      elements.dateFilter.value = filters.dateOfJoining || "";
    }
  };

  const renderSummary = (summary, exportMeta, reportType) => {
    elements.statTotal.textContent = summary.totalRecords ?? 0;
    elements.statPlaced.textContent = summary.placedCount ?? 0;
    elements.statAverage.textContent = formatCurrency(summary.averagePackage);
    elements.statLabel.textContent = summary.topLabel || "-";
    elements.statLabelCaption.textContent = summary.topLabelCaption || "Top Label";
    elements.meta.textContent = `Generated ${new Date(exportMeta.generatedAt).toLocaleString("en-IN")} for ${formatLabel(
      reportType
    )} report`;
  };

  const renderDonut = (items) => {
    if (!items.length) {
      elements.statusDonut.style.setProperty("--donut", "#e6ebf5 0deg 360deg");
      elements.statusDonut.innerHTML = `<div><strong>0%</strong><span>No data</span></div>`;
      elements.statusLegend.innerHTML = `<span class="reports-empty-text">No status distribution available.</span>`;
      return;
    }

    const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
    let angleCursor = 0;
    const segments = items.map((item, index) => {
      const angle = (item.value / total) * 360;
      const segment = `${palette[index % palette.length]} ${angleCursor}deg ${angleCursor + angle}deg`;
      angleCursor += angle;
      return segment;
    });

    const lead = items[0];
    const leadPct = Math.round((lead.value / total) * 100);

    elements.statusDonut.style.setProperty("--donut", segments.join(", "));
    elements.statusDonut.innerHTML = `<div><strong>${leadPct}%</strong><span>${escapeHtml(lead.label)}</span></div>`;
    elements.statusLegend.innerHTML = items
      .map(
        (item, index) => `
          <div class="reports-legend-item">
            <span class="reports-legend-dot" style="background:${palette[index % palette.length]}"></span>
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.value}</strong>
          </div>
        `
      )
      .join("");
  };

  const renderDistribution = (items, reportType) => {
    const title =
      reportType === "institution"
        ? "Institution Placement Spread"
        : reportType === "placement"
        ? "Top Institutions"
        : "Course Distribution";
    elements.distributionHeading.textContent = title;

    if (!items.length) {
      elements.distributionChart.innerHTML = `<p class="reports-empty-text">No distribution data available.</p>`;
      return;
    }

    const maxValue = Math.max(...items.map((item) => item.value), 1);
    elements.distributionChart.innerHTML = items
      .map(
        (item, index) => `
          <div class="reports-bar-row">
            <div class="reports-bar-label">${escapeHtml(item.label)}</div>
            <div class="reports-bar-track">
              <span class="reports-bar-fill" style="width:${Math.max((item.value / maxValue) * 100, 8)}%; background:${palette[index % palette.length]}"></span>
            </div>
            <strong>${item.value}</strong>
          </div>
        `
      )
      .join("");
  };

  const renderTable = () => {
    const { columns, rows } = state.table;
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
    state.currentPage = Math.min(state.currentPage, totalPages);

    const start = (state.currentPage - 1) * state.pageSize;
    const end = Math.min(start + state.pageSize, totalRows);
    const visibleRows = rows.slice(start, end);

    elements.tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>`;

    if (!visibleRows.length) {
      elements.tableBody.innerHTML = `<tr><td colspan="${Math.max(columns.length, 1)}" class="reports-table-empty">No records matched the selected filters.</td></tr>`;
    } else {
      elements.tableBody.innerHTML = visibleRows
        .map(
          (row) => `
            <tr>
              ${columns
                .map((column) => {
                  const value = row[column.key];
                  if (column.key === "package" || column.key === "averagePackage") {
                    return `<td>${escapeHtml(formatCurrency(value))}</td>`;
                  }
                  if (column.key === "status") {
                    return `<td><span class="reports-status-pill">${escapeHtml(formatLabel(value))}</span></td>`;
                  }
                  if (column.key === "dateOfJoining" || column.key === "dob") {
                    return `<td>${escapeHtml(formatDate(value))}</td>`;
                  }
                  return `<td>${escapeHtml(value ?? "-")}</td>`;
                })
                .join("")}
            </tr>
          `
        )
        .join("");
    }

    elements.paginationSummary.textContent = `Showing ${totalRows ? start + 1 : 0}-${end} of ${totalRows} records`;

    const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
      Math.max(0, state.currentPage - 2),
      Math.max(0, state.currentPage - 2) + 3
    );

    elements.paginationActions.innerHTML = `
      <button type="button" class="reports-page-button" data-page="prev" ${state.currentPage === 1 ? "disabled" : ""}>← Prev</button>
      ${pageNumbers
        .map(
          (pageNumber) => `
            <button type="button" class="reports-page-button ${pageNumber === state.currentPage ? "is-active" : ""}" data-page="${pageNumber}">
              ${pageNumber}
            </button>
          `
        )
        .join("")}
      <button type="button" class="reports-page-button" data-page="next" ${state.currentPage === totalPages ? "disabled" : ""}>Next →</button>
    `;

    elements.paginationActions.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.page;
        if (target === "prev" && state.currentPage > 1) state.currentPage -= 1;
        else if (target === "next" && state.currentPage < totalPages) state.currentPage += 1;
        else if (!Number.isNaN(Number(target))) state.currentPage = Number(target);
        renderTable();
      });
    });
  };

  const exportCsv = () => {
    const { columns, rows } = state.table;
    if (!rows.length) return;

    const csvRows = [
      columns.map((column) => `"${String(column.label).replaceAll('"', '""')}"`).join(","),
      ...rows.map((row) =>
        columns
          .map((column) => {
            const value =
              column.key === "package" || column.key === "averagePackage"
                ? formatCurrency(row[column.key])
                : column.key === "dateOfJoining" || column.key === "dob"
                ? formatDate(row[column.key])
                : column.key === "status"
                ? formatLabel(row[column.key])
                : row[column.key] ?? "-";
            return `"${String(value).replaceAll('"', '""')}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.reportType}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const { columns, rows } = state.table;
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>${formatLabel(state.reportType)} Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin-bottom: 8px; }
            p { color: #4b5563; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #eef2ff; }
          </style>
        </head>
        <body>
          <h1>${formatLabel(state.reportType)} Report</h1>
          <p>Generated from INSEED Solutions on ${new Date().toLocaleString("en-IN")}</p>
          <table>
            <thead>
              <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      ${columns
                        .map((column) => {
                          const value =
                            column.key === "package" || column.key === "averagePackage"
                              ? formatCurrency(row[column.key])
                              : column.key === "dateOfJoining" || column.key === "dob"
                              ? formatDate(row[column.key])
                              : column.key === "status"
                              ? formatLabel(row[column.key])
                              : row[column.key] ?? "-";
                          return `<td>${escapeHtml(value)}</td>`;
                        })
                        .join("")}
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const renderReport = (payload) => {
    const { reportType, options, summary, charts, table, export: exportMeta } = payload;
    state.reportType = reportType;
    state.table = table;
    state.currentPage = 1;

    renderOptions(options, state.currentFilters);
    renderSummary(summary, exportMeta, reportType);
    renderDonut(charts.statusDistribution || []);
    renderDistribution(
      reportType === "trainee" ? charts.courseDistribution || [] : charts.institutionDistribution || [],
      reportType
    );
    elements.tableHeading.textContent =
      reportType === "placement" ? "Placement Report" : reportType === "institution" ? "Institution Report" : "Trainee Report";
    renderTable();
  };

  const loadReports = async (filters = getFilters()) => {
    state.currentFilters = filters;
    setLoadingState(elements.filterForm?.querySelector('button[type="submit"]'), true, "Loading...");

    try {
      const query = buildQuery(filters);
      const response = await fetch(`${apiBase}${publicReportsRoot.dataset.api}${query ? `?${query}` : ""}`);
      const raw = await response.text();
      const result = raw ? JSON.parse(raw) : {};

      if (!response.ok) {
        throw new Error(result.message || "Unable to load reports");
      }

      renderReport(result.data);
    } catch (error) {
      elements.meta.textContent = error.message || "We could not load report data right now.";
      elements.tableHead.innerHTML = "";
      elements.tableBody.innerHTML = `<tr><td class="reports-table-empty">Unable to load report data.</td></tr>`;
      elements.statusDonut.innerHTML = `<div><strong>0%</strong><span>Error</span></div>`;
      elements.distributionChart.innerHTML = `<p class="reports-empty-text">Chart data unavailable.</p>`;
    } finally {
      setLoadingState(elements.filterForm?.querySelector('button[type="submit"]'), false);
    }
  };

  elements.filterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!elements.filterForm.reportValidity()) {
      if (elements.filterStatus) elements.filterStatus.textContent = "Please select a report type before generating.";
      return;
    }
    if (elements.filterStatus) elements.filterStatus.textContent = "";
    loadReports(getFilters());
  });
  elements.exportExcelButton?.addEventListener("click", exportCsv);
  elements.exportPdfButton?.addEventListener("click", exportPdf);

  loadReports();
}
