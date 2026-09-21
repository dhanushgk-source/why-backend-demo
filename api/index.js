let appError = null;
let app = null;

try {
  app = require("../src/app");
} catch (e) {
  appError = {
    message: e.message,
    stack: e.stack,
  };
}

module.exports = (req, res) => {
  if (appError) {
    return res.status(500).json({
      success: false,
      message: "Module initialization error",
      error: appError,
    });
  }
  return app(req, res);
};
