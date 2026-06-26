const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = require("./app");

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
