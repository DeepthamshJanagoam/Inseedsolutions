const adminReportsRoot = document.querySelector("[data-admin-reports]");

if (adminReportsRoot) {
  const session = window.AdminAuth?.requirePage("reports");

  if (session) {
    const apiBase = window.APP_API_BASE || "";
    const { token } = session;

    const state = {
      currentPage: 1,
      pageSize: 25,
      table: {
        columns: [],
        rows: [],
      },
      currentFilters: {},
      reportType: "trainee",
    };

    const elements = {
      logoutButton: document.getElementById("adminReportsLogoutButton"),
      filterForm: document.getElementById("reportsFilterForm"),
      typeFilter: document.getElementById("reportsTypeFilter"),
      courseFilter: document.getElementById("reportsCourseFilter"),
      qualificationFilter: document.getElementById("reportsQualificationFilter"),
      dateFilter: document.getElementById("reportsDateFilter"),
      institutionFilter: document.getElementById("reportsInstitutionFilter"),
      companyFilter: document.getElementById("reportsCompanyFilter"),
      searchFilter: document.getElementById("reportsSearchFilter"),
      filterStatus: document.getElementById("reportsFilterStatus"),
      meta: document.getElementById("reportsMeta"),
      summaryCards: Array.from(document.querySelectorAll("[data-report-card]")).map((card, index) => ({
        card,
        label: document.getElementById(`reportsStat${index + 1}Label`),
        value: document.getElementById(`reportsStat${index + 1}Value`),
        subtext: document.getElementById(`reportsStat${index + 1}Subtext`),
      })),
      chartPanels: [1, 2, 3, 4].map((index) => ({
        title: document.getElementById(`reportsChartTitle${index}`),
        body: document.getElementById(`reportsChart${index}`),
      })),
      tableHeading: document.getElementById("reportsTableHeading"),
      tableElement: document.querySelector(".reports-table"),
      tableHead: document.getElementById("reportsTableHead"),
      tableBody: document.getElementById("reportsTableBody"),
      paginationSummary: document.getElementById("reportsPaginationSummary"),
      paginationActions: document.getElementById("reportsPaginationActions"),
      exportExcelButton: document.getElementById("exportExcelButton"),
      exportPdfButton: document.getElementById("exportPdfButton"),
    };

    const chartPalette = ["#20c997", "#6c8cff", "#f3c969", "#ff8e72", "#8a7cf7", "#64c4e7"];

    const escapeHtml = (value) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const formatCurrency = (value) => {
      const amount = Number(value) || 0;
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount);
    };

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

    const formatCellValue = (column, row) => {
      const value = row[column.key];

      if (column.format === "currency") {
        return formatCurrency(value);
      }

      if (column.format === "date") {
        return formatDate(value);
      }

      if (column.format === "status") {
        return formatLabel(value);
      }

      return value ?? "-";
    };

    const setButtonLoading = (button, isLoading, text) => {
      if (!button) return;

      if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = text || "Loading...";
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
      institution: elements.institutionFilter?.value || "",
      company: elements.companyFilter?.value || "",
      search: elements.searchFilter?.value || "",
    });

    const buildQuery = (filters) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      return params.toString();
    };

    const populateSelect = (select, values, fallbackLabel, selectedValue) => {
      if (!select) return;

      select.innerHTML = [`<option value="">${fallbackLabel}</option>`]
        .concat(values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`))
        .join("");

      if (selectedValue) {
        select.value = selectedValue;
      }
    };

    const renderOptions = (options, filters) => {
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
      populateSelect(elements.institutionFilter, options.institutions || [], "All Institutions", filters.institution);
      populateSelect(elements.companyFilter, options.companies || [], "All Companies", filters.company);

      if (elements.dateFilter) {
        elements.dateFilter.value = filters.dateOfJoining || "";
      }

      if (elements.searchFilter) {
        elements.searchFilter.value = filters.search || "";
      }
    };

    const renderSummary = (summary, exportMeta, reportType) => {
      const cards = summary.cards || [];
      elements.summaryCards.forEach((card, index) => {
        const content =
          cards[index] ||
          (index === 0
            ? {
                label: "Total Records",
                value: String(summary.totalRecords ?? 0),
                subtext: "Rows in the current report",
              }
            : index === 1
            ? {
                label: "Placed",
                value: String(summary.placedCount ?? 0),
                subtext: "Confirmed outcomes",
              }
            : index === 2
            ? {
                label: "Average Package",
                value: formatCurrency(summary.averagePackage),
                subtext: "Across visible data",
              }
            : index === 3
            ? {
                label: summary.topLabelCaption || "Top Label",
                value: summary.topLabel || "-",
                subtext: "Leading segment in this report",
              }
            : {
                label: "Report Focus",
                value: reportType === "skill-placement" ? "Skill Department" : formatLabel(reportType),
                subtext: "Additional analytics spotlight",
              });

        if (card.label) card.label.textContent = content.label || "-";
        if (card.value) card.value.textContent = content.value || "-";
        if (card.subtext) card.subtext.textContent = content.subtext || "";
      });

      elements.meta.textContent = `Generated ${new Date(exportMeta.generatedAt).toLocaleString("en-IN")} for ${formatLabel(
        reportType
      )} report`;
    };

    const renderBarChart = (container, panel) => {
      if (!container) return;

      const items = panel?.items || [];
      if (!items.length) {
        container.innerHTML = `<p class="reports-empty-text">${escapeHtml(panel?.emptyText || "No chart data available.")}</p>`;
        return;
      }

      const maxValue = Math.max(...items.map((item) => item.value), 1);
      container.innerHTML = items
        .map(
          (item, index) => `
            <div class="reports-bar-row">
              <div class="reports-bar-label">${escapeHtml(item.label)}</div>
              <div class="reports-bar-track">
                <span
                  class="reports-bar-fill"
                  style="width:${Math.max((item.value / maxValue) * 100, 8)}%; background:${chartPalette[index % chartPalette.length]}"
                ></span>
              </div>
              <strong>${escapeHtml(panel.formatter === "currency" ? formatCurrency(item.value) : item.value)}</strong>
            </div>
          `
        )
        .join("");
    };

    const renderCharts = (charts = {}) => {
      const fallbackPanels = [
        {
          title: "Status Distribution",
          items: charts.statusDistribution || [],
          emptyText: "No status distribution available.",
        },
        {
          title: "Course Distribution",
          items: charts.courseDistribution || [],
          emptyText: "No course distribution available.",
        },
        {
          title: "Company-wise Hiring Count",
          items: charts.companyDistribution || [],
          emptyText: "No company hiring distribution available.",
        },
        {
          title: "Institution-wise Placement Chart",
          items: charts.institutionDistribution || [],
          emptyText: "No institution placement distribution available.",
        },
      ];

      const panels = Array.isArray(charts.panels) && charts.panels.length ? charts.panels : fallbackPanels;

      elements.chartPanels.forEach((panelElement, index) => {
        const panel = panels[index] || fallbackPanels[index];
        if (panelElement.title) panelElement.title.textContent = panel.title;
        renderBarChart(panelElement.body, panel);
      });
    };

    const renderTable = () => {
      const { columns, rows } = state.table;
      const totalRows = rows.length;
      const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
      state.currentPage = Math.min(state.currentPage, totalPages);
      const start = (state.currentPage - 1) * state.pageSize;
      const end = Math.min(start + state.pageSize, totalRows);
      const visibleRows = rows.slice(start, end);

      if (elements.tableElement) {
        elements.tableElement.style.minWidth = columns.length > 12 ? "1800px" : columns.length > 9 ? "1320px" : "980px";
      }

      elements.tableHead.innerHTML = `<tr>${columns
        .map((column) => `<th>${escapeHtml(column.label)}</th>`)
        .join("")}</tr>`;

      if (!visibleRows.length) {
        elements.tableBody.innerHTML = `
          <tr>
            <td colspan="${Math.max(columns.length, 1)}" class="reports-table-empty">No records matched the selected filters.</td>
          </tr>
        `;
      } else {
        elements.tableBody.innerHTML = visibleRows
          .map(
            (row) => `
              <tr>
                ${columns
                  .map((column) => {
                    const formatted = formatCellValue(column, row);
                    if (column.format === "status") {
                      return `<td><span class="reports-status-pill">${escapeHtml(formatted)}</span></td>`;
                    }
                    return `<td>${escapeHtml(formatted)}</td>`;
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
            .map((column) => `"${String(formatCellValue(column, row)).replaceAll('"', '""')}"`)
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
      const win = window.open("", "_blank", "width=1400,height=900");
      if (!win) return;

      win.document.write(`
        <html>
          <head>
            <title>${formatLabel(state.reportType)} Report</title>
            <style>
              @page { size: A4 landscape; margin: 12mm; }
              body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
              h1 { margin-bottom: 8px; }
              p { color: #4b5563; margin-bottom: 24px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
              th { background: #eef2ff; }
            </style>
          </head>
          <body>
            <h1>${formatLabel(state.reportType)} Report</h1>
            <p>Generated from INSEED Admin on ${new Date().toLocaleString("en-IN")}</p>
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
                          .map((column) => `<td>${escapeHtml(formatCellValue(column, row))}</td>`)
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

    const getReportHeading = (reportType) => {
      if (reportType === "placement") return "Placement Report";
      if (reportType === "institution") return "Institution Report";
      if (reportType === "skill-placement") return "Skill Placement Report";
      return "Trainee Report";
    };

    const renderReport = (payload) => {
      const { reportType, options, summary, charts, table, export: exportMeta } = payload;
      state.reportType = reportType;
      state.table = table;
      state.currentPage = 1;

      renderOptions(options, state.currentFilters);
      renderSummary(summary, exportMeta, reportType);
      renderCharts(charts);
      elements.tableHeading.textContent = getReportHeading(reportType);
      renderTable();
    };

    const loadReports = async (filters = getFilters()) => {
      state.currentFilters = filters;
      setButtonLoading(elements.filterForm?.querySelector('button[type="submit"]'), true, "Loading...");

      try {
        const query = buildQuery(filters);
        const response = await fetch(`${apiBase}${adminReportsRoot.dataset.api}${query ? `?${query}` : ""}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const raw = await response.text();
        const result = raw ? JSON.parse(raw) : {};

        if (!response.ok) {
          throw new Error(result.message || "Unable to load reports");
        }

        renderReport(result.data);
      } catch (error) {
        if (/401|403|token|permission|expired/i.test(error.message)) {
          window.AdminAuth.logout();
          return;
        }

        elements.meta.textContent = error.message || "We could not load reports right now.";
        elements.tableHead.innerHTML = "";
        elements.tableBody.innerHTML = `<tr><td class="reports-table-empty">Unable to load report data.</td></tr>`;
        elements.chartPanels.forEach((panel) => {
          if (panel.body) {
            panel.body.innerHTML = `<p class="reports-empty-text">Chart data unavailable.</p>`;
          }
        });
      } finally {
        setButtonLoading(elements.filterForm?.querySelector('button[type="submit"]'), false);
      }
    };

    const bindEvents = () => {
      elements.logoutButton?.addEventListener("click", window.AdminAuth.logout);
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
    };

    bindEvents();
    loadReports();
  }
}
