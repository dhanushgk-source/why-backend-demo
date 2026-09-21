module.exports = (req, res) => {
  try {
    const app = require("../src/app");
    return app(req, res);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack,
    });
  }
};
