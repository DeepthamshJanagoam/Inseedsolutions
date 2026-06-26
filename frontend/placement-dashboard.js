const dashboard = document.querySelector("[data-placement-dashboard]");

if (dashboard) {
  const state = {
    rows: [],
    query: "",
    status: "all",
    company: "all",
    institution: "all",
    sortKey: "id",
    sortDirection: "asc",
  };

  const formatMoney = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const getFilteredRows = () => {
    const query = state.query.trim().toLowerCase();

    return state.rows
      .filter((row) => {
        const searchable = `${row.student} ${row.company} ${row.course} ${row.contact}`.toLowerCase();
        const matchesQuery = !query || searchable.includes(query);
        const matchesStatus = state.status === "all" || row.status === state.status;
        const matchesCompany = state.company === "all" || row.company === state.company;
        const matchesInstitution = state.institution === "all" || row.institution === state.institution;
        return matchesQuery && matchesStatus && matchesCompany && matchesInstitution;
      })
      .sort((a, b) => {
        const aValue = a[state.sortKey];
        const bValue = b[state.sortKey];
        const direction = state.sortDirection === "asc" ? 1 : -1;
        if (typeof aValue === "number") return (aValue - bValue) * direction;
        return String(aValue).localeCompare(String(bValue)) * direction;
      });
  };

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const populateSelect = (id, values) => {
    const select = document.getElementById(id);
    if (!select) return;

    const firstOption = select.querySelector("option")?.outerHTML || "";
    select.innerHTML =
      firstOption +
      values
        .map((value) => `<option value="${value}">${value}</option>`)
        .join("");
  };

  const renderStats = (rows) => {
    const placed = rows.filter((row) => row.status === "Placed");
    const totalPackage = rows.reduce((sum, row) => sum + row.package, 0);
    const average = rows.length ? Math.round(totalPackage / rows.length) : 0;
    const maximum = rows.length ? Math.max(...rows.map((row) => row.package)) : 0;

    setText("statTotal", rows.length);
    setText("statPlaced", placed.length);
    setText("statAvg", formatMoney(average));
    setText("statMax", formatMoney(maximum));
    setText("resultCount", `${rows.length} record${rows.length === 1 ? "" : "s"}`);
  };

  const renderTable = (rows) => {
    const body = document.getElementById("placementTableBody");
    if (!body) return;

    if (!rows.length) {
      body.innerHTML = `
        <tr>
          <td colspan="7">
            <strong>No placement records available</strong>
            <small>Data will appear here once the backend API returns records.</small>
          </td>
        </tr>
      `;
      return;
    }

    body.innerHTML = rows
      .map(
        (row) => `
          <tr>
            <td>${row.id}</td>
            <td>
              <strong>${row.student}</strong>
              <small>${row.institution}</small>
            </td>
            <td>${row.company}</td>
            <td>${formatMoney(row.package)}</td>
            <td>${row.course}</td>
            <td><span class="status-badge ${row.status.toLowerCase().replaceAll(" ", "-")}">${row.status}</span></td>
            <td><a href="mailto:${row.contact}">${row.contact}</a></td>
          </tr>
        `
      )
      .join("");
  };

  const renderCompanyChart = (rows) => {
    const chart = document.getElementById("companyChart");
    if (!chart) return;

    const groups = rows.reduce((acc, row) => {
      acc[row.company] = Math.max(acc[row.company] || 0, row.package);
      return acc;
    }, {});
    const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = entries.length ? Math.max(...entries.map((entry) => entry[1])) : 1;

    chart.innerHTML = entries.length
      ? entries
          .map(([company, value]) => {
            const width = Math.max(8, Math.round((value / max) * 100));
            return `
              <div class="bar-row">
                <span>${company}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
                <strong>${formatMoney(value)}</strong>
              </div>
            `;
          })
          .join("")
      : `<p class="empty-chart">No company package data available.</p>`;
  };

  const renderStatusDonut = (rows) => {
    const donut = document.getElementById("statusDonut");
    const legend = document.getElementById("statusLegend");
    if (!donut || !legend) return;

    const counts = rows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});
    const total = rows.length || 1;
    const placed = counts.Placed || 0;
    const interviewing = counts.Interviewing || 0;
    const pending = counts["Offer Pending"] || 0;
    const placedStop = (placed / total) * 100;
    const interviewingStop = placedStop + (interviewing / total) * 100;

    donut.style.background = rows.length
      ? `conic-gradient(#16b3a8 0 ${placedStop}%, #d6b15f ${placedStop}% ${interviewingStop}%, #123a74 ${interviewingStop}% 100%)`
      : "conic-gradient(#dfe5ef 0 100%)";
    donut.innerHTML = `<span>${rows.length ? Math.round((placed / total) * 100) : 0}%<small>Placed</small></span>`;
    legend.innerHTML = `
      <span><i style="background:#16b3a8"></i>Placed: ${placed}</span>
      <span><i style="background:#d6b15f"></i>Interviewing: ${interviewing}</span>
      <span><i style="background:#123a74"></i>Offer Pending: ${pending}</span>
    `;
  };

  const render = () => {
    const rows = getFilteredRows();
    renderStats(rows);
    renderTable(rows);
    renderCompanyChart(rows);
    renderStatusDonut(rows);
  };

  const bindEvents = () => {
    document.getElementById("placementSearch")?.addEventListener("input", (event) => {
      state.query = event.target.value;
      render();
    });

    document.getElementById("statusFilter")?.addEventListener("change", (event) => {
      state.status = event.target.value;
      render();
    });

    document.getElementById("companyFilter")?.addEventListener("change", (event) => {
      state.company = event.target.value;
      render();
    });

    document.getElementById("institutionFilter")?.addEventListener("change", (event) => {
      state.institution = event.target.value;
      render();
    });

    document.querySelectorAll("[data-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.sort;
        state.sortDirection = state.sortKey === key && state.sortDirection === "asc" ? "desc" : "asc";
        state.sortKey = key;
        render();
      });
    });
  };

  const init = async () => {
    const apiBase = window.APP_API_BASE || "";
    const api = `${apiBase}${dashboard.dataset.api}`;
    const status = document.getElementById("dataStatus");

    try {
      const response = await fetch(api, { cache: "no-store" });
      if (!response.ok) throw new Error("Placement API unavailable");
      state.rows = await response.json();
      if (status) status.textContent = `Read-only data loaded from ${api}`;
    } catch (error) {
      state.rows = [];
      if (status) status.textContent = "Unable to load backend placement data.";
    }

    populateSelect("statusFilter", [...new Set(state.rows.map((row) => row.status))]);
    populateSelect("companyFilter", [...new Set(state.rows.map((row) => row.company))]);
    populateSelect("institutionFilter", [...new Set(state.rows.map((row) => row.institution))]);
    bindEvents();
    render();
  };

  init();
}
