const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const createOrder = async (req, res) => {

  try {

    const {
      customerId,
      customerName,
      bookingFor,
      careRecipientName,
      age,
      gender,
      mobileNumber
    } = req.body;

    if (
      !customerId ||
      !customerName ||
      !bookingFor ||
      !careRecipientName ||
      !age ||
      !gender ||
      !mobileNumber
    ) {
      return res.status(400).json({
        success: false,
        message: "customerId, customerName, bookingFor, careRecipientName, age, gender and mobileNumber are all required"
      });
    }

    const id = uuidv4();

    await pool.query(
      `
      INSERT INTO orders
      (
        id,
        customer_id,
        customer_name,
        booking_for,
        care_recipient_name,
        age,
        gender,
        mobile_number
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        id,
        customerId,
        customerName,
        bookingFor,
        careRecipientName,
        age,
        gender,
        mobileNumber
      ]
    );

    res.status(201).json({
      success: true,
      message: "Order created",
      order: {
        id,
        customerId,
        customerName,
        bookingFor,
        careRecipientName,
        age,
        gender,
        mobileNumber
      }
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};


const getOrdersByCustomer = async (req, res) => {

  try {

    const { customerId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM orders
      WHERE customer_id = $1
      `,
      [customerId]
    );

    res.status(200).json({
      success: true,
      orders: result.rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};


const getOrderById = async (req, res) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM orders
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.status(200).json({
      success: true,
      order: result.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};


module.exports = {
  createOrder,
  getOrdersByCustomer,
  getOrderById
};
