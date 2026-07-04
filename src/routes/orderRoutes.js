const express = require("express");

const router = express.Router();

const {
  createOrder,
  getOrdersByCustomer,
  getOrderById
} = require("../controllers/orderController");

router.post("/", createOrder);

router.get("/customer/:customerId", getOrdersByCustomer);

router.get("/:id", getOrderById);

module.exports = router;
