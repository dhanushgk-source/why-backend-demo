require("dotenv").config();

const { verifyMailServer } = require("./services/mailService");

const app = require("./app");
verifyMailServer();

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`Server running...!!!`);
});
