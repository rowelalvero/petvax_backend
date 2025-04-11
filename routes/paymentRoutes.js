// routes/paymentRoutes.js
const express = require('express');
const { verifyPaymongoWebhook } = require('../middlewares/paymongoWebhook');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Initiate GCash Payment
router.post(
  '/initiate-gcash',
  authController.restrictTo('pet_owner'),
  paymentController.initiateGcashPayment
);

// Get Payment Details
router.get(
  '/:appointmentId',
  authController.restrictTo('pet_owner', 'clinic_owner', 'secretary'),
  paymentController.getPaymentDetails
);

// Webhook for PayMongo (no auth)
router.post(
    '/webhook',
    webhookLimiter, 
    verifyPaymongoWebhook,
    paymentController.verifyPayment
);

// Add to existing routes
router.post(
    '/refund',
    authController.restrictTo('clinic_owner', 'admin'),
    paymentController.processRefund
  );
module.exports =router;