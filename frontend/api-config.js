(() => {
  const configuredMetaBase = document
    .querySelector('meta[name="api-base-url"]')
    ?.getAttribute("content")
    ?.trim();
  const isFileProtocol = window.location.protocol === "file:";
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const isBackendOrigin = isLocalHost && window.location.port === "4000";
  const configuredBaseIsLocal =
    configuredMetaBase && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(configuredMetaBase);
  const safeConfiguredBase = configuredBaseIsLocal && !isLocalHost ? "" : configuredMetaBase;

  window.APP_API_BASE =
    window.APP_API_BASE ||
    safeConfiguredBase ||
    (isFileProtocol || (isLocalHost && !isBackendOrigin) ? "http://localhost:4000" : "");
})();
