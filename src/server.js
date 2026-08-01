require("dotenv").config();

const { verifyMailServer } = require("./services/mailService");
const { runCertificatesMigration } = require("./controllers/certificateController");

const app = require("./app");
verifyMailServer();
runCertificatesMigration();

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`Server running...!!!`);
});
