const app = require("../../backend/src/app");

module.exports = (request, response) => {
  if (!request.url.startsWith("/api")) {
    request.url = `/api/admin${request.url}`;
  }

  return app(request, response);
};
