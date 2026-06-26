(() => {
  const configuredMetaBase = document
    .querySelector('meta[name="api-base-url"]')
    ?.getAttribute("content")
    ?.trim();
  const isFileProtocol = window.location.protocol === "file:";
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const isBackendOrigin = isLocalHost && window.location.port === "4000";

  window.APP_API_BASE =
    window.APP_API_BASE ||
    configuredMetaBase ||
    (isFileProtocol || (isLocalHost && !isBackendOrigin) ? "http://localhost:4000" : "");
})();
