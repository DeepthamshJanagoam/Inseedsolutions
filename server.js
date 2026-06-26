const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "frontend");
const SUBMISSIONS_FILE = path.join(__dirname, "contact-submissions.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
};

const readRequestBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });

const saveSubmission = async (submission) => {
  const existing = fs.existsSync(SUBMISSIONS_FILE)
    ? JSON.parse(await fs.promises.readFile(SUBMISSIONS_FILE, "utf8"))
    : [];

  existing.push({
    id: Date.now(),
    receivedAt: new Date().toISOString(),
    ...submission,
  });

  await fs.promises.writeFile(SUBMISSIONS_FILE, JSON.stringify(existing, null, 2));
};

const handleContactSubmission = async (request, response) => {
  try {
    const body = await readRequestBody(request);
    const submission = JSON.parse(body || "{}");
    const requiredFields = ["name", "email", "inquiryType", "message"];
    const missingField = requiredFields.find((field) => !String(submission[field] || "").trim());

    if (missingField) {
      sendJson(response, 400, { message: `Missing required field: ${missingField}` });
      return;
    }

    await saveSubmission({
      name: String(submission.name).trim(),
      email: String(submission.email).trim(),
      phone: String(submission.phone || "").trim(),
      inquiryType: String(submission.inquiryType).trim(),
      message: String(submission.message).trim(),
    });

    sendJson(response, 201, { message: "Contact inquiry received" });
  } catch (error) {
    sendJson(response, 500, { message: "Unable to process contact inquiry" });
  }
};

const serveStaticFile = async (request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(ROOT, safePath));

  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    response.end(data);
  } catch (error) {
    response.writeHead(404);
    response.end("Not found");
  }
};

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/contact") {
    handleContactSubmission(request, response);
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    serveStaticFile(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`InSeed website server running at http://localhost:${PORT}`);
});
