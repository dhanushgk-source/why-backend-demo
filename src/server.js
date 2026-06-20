require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
    console.log(process.env.DB_PASSWORD);
  console.log(`Server running on port ${PORT}`);
});