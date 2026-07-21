(function () {
  const createPageRange = (currentPage, totalPages, siblingCount = 2) => {
    const pages = [];
    const start = Math.max(2, currentPage - siblingCount);
    const end = Math.min(totalPages - 1, currentPage + siblingCount);

    pages.push(1);
    if (start > 2) pages.push("start-ellipsis");
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (end < totalPages - 1) pages.push("end-ellipsis");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(Number(value) || 0);

  const render = ({
    container,
    currentPage = 1,
    totalPages = 1,
    totalRecords = 0,
    pageSize = 10,
    isLoading = false,
    onPageChange,
  }) => {
    if (!container) return;

    const normalizedPage = Math.min(Math.max(1, Number(currentPage) || 1), Math.max(1, Number(totalPages) || 1));
    const normalizedTotalPages = Math.max(1, Number(totalPages) || 1);
    const normalizedPageSize = Math.max(1, Number(pageSize) || 10);
    const startRecord = totalRecords ? (normalizedPage - 1) * normalizedPageSize + 1 : 0;
    const endRecord = Math.min(totalRecords, normalizedPage * normalizedPageSize);
    const shouldHide = !totalRecords;

    container.hidden = shouldHide;
    if (shouldHide) {
      container.innerHTML = "";
      return;
    }

    const pages = createPageRange(normalizedPage, normalizedTotalPages, window.matchMedia("(max-width: 720px)").matches ? 1 : 2);
    const button = (label, page, extraClass = "", disabled = false) => `
      <button
        class="pagination-button ${extraClass}"
        type="button"
        data-pagination-page="${page}"
        ${disabled || isLoading ? "disabled" : ""}
      >${label}</button>
    `;

    container.innerHTML = `
      <div class="pagination-summary">
        Showing ${formatNumber(startRecord)}-${formatNumber(endRecord)} of ${formatNumber(totalRecords)} trainees
      </div>
      <div class="pagination-actions" aria-label="Pagination">
        ${button("First", 1, "pagination-boundary", normalizedPage <= 1)}
        ${button("Previous", normalizedPage - 1, "", normalizedPage <= 1)}
        <span class="pagination-mobile-meta">Page ${formatNumber(normalizedPage)} of ${formatNumber(normalizedTotalPages)}</span>
        <div class="pagination-pages">
          ${pages
            .map((page) =>
              typeof page === "number"
                ? button(String(page), page, page === normalizedPage ? "is-active" : "", page === normalizedPage)
                : '<span class="pagination-ellipsis">...</span>'
            )
            .join("")}
        </div>
        ${button("Next", normalizedPage + 1, "", normalizedPage >= normalizedTotalPages)}
        ${button("Last", normalizedTotalPages, "pagination-boundary", normalizedPage >= normalizedTotalPages)}
      </div>
    `;

    container.querySelectorAll("[data-pagination-page]").forEach((control) => {
      control.addEventListener("click", () => {
        const nextPage = Number(control.dataset.paginationPage);
        if (Number.isFinite(nextPage) && nextPage !== normalizedPage) {
          onPageChange?.(nextPage);
        }
      });
    });
  };

  window.AdminPagination = {
    render,
  };
})();
