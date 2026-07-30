const express = require("express");
const cors = require("cors");
const jobsRoutes = require("./routes/jobsRoutes");
const authRoutes = require("./routes/authRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const teamRoutes = require("./routes/teamRoutes");
const adRoutes = require("./routes/adRoutes");


const path = require("path");
const uploadRoutes =
require("./routes/uploadRoutes");
const orderRoutes = require("./routes/orderRoutes");

const studentRoutes = require("./routes/studentRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const lessonAssetRoutes = require("./routes/lessonAssetRoutes");
const myLearningRoutes = require("./routes/myLearningRoutes");



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

app.use("/api/ads", adRoutes);

app.use("/api/students", studentRoutes);
app.use("/api/trainings", trainingRoutes);
app.use("/api/lessons", lessonAssetRoutes);
app.use("/api/me", myLearningRoutes);

app.get("/", (req, res) => {
  res.send("WHY Careers API Running");
});

module.exports = app;
