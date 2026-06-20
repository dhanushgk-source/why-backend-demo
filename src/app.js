const express = require("express");
const cors = require("cors");
const jobsRoutes = require("./routes/jobsRoutes");
const authRoutes = require("./routes/authRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const path = require("path");
const uploadRoutes =
require("./routes/uploadRoutes");



const app = express();

app.use(cors());
app.use(express.json());
console.log(authRoutes);

app.use("/api/jobs", jobsRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/applications", applicationRoutes);

app.use("/api/admin", adminRoutes);

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "../uploads")
  )
);

app.use(
  "/api/upload",
  uploadRoutes
);

app.get("/", (req, res) => {
  res.send("WHY Careers API Running");
});

module.exports = app;