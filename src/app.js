const express = require("express");
const cors = require("cors");
const jobsRoutes = require("./routes/jobsRoutes");
const authRoutes = require("./routes/authRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const teamRoutes = require("./routes/teamRoutes");


const path = require("path");
const uploadRoutes =
require("./routes/uploadRoutes");
const orderRoutes = require("./routes/orderRoutes");



const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/jobs", jobsRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/applications", applicationRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/orders", orderRoutes);

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "../uploads")
  )
);

app.use("/api/team", teamRoutes);

app.use(
  "/api/upload",
  uploadRoutes
);

app.get("/", (req, res) => {
  res.send("WHY Careers API Running");
});

module.exports = app;
