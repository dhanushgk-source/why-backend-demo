module.exports = (req, res) => {
  res.status(200).json({ status: "OK", message: "WHY Backend Vercel Serverless Function Online", path: req.url });
};
