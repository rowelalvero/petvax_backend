// controller/paymentController.js
const axios = require('axios');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const AppError = require('../utils/appError');

// PayMongo API Config
const PAYMONGO_BASE_URL = 'https://api.paymongo.com/v1';
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;

// Initialize GCash Payment
exports.initiateGcashPayment = async (req, res, next) => {
  try {
    const { appointmentId, amount } = req.body;
    
    // 1. Validate appointment exists and belongs to user
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      user: req.user.id
    });
    
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    // 2. Create PayMongo payment intent
    const response = await axios.post(
      `${PAYMONGO_BASE_URL}/payment_intents`,
      {
        data: {
          attributes: {
            amount: amount * 100, // Convert to cents
            payment_method_allowed: ['gcash'],
            currency: 'PHP'
          }
        }
      },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentIntent = response.data.data;

    // 3. Create payment record
    const payment = await Payment.create({
      appointment: appointmentId,
      amount,
      paymentMethod: 'gcash',
      transactionId: paymentIntent.id,
      status: 'pending'
    });

    // 4. Return payment URL to client
    res.status(200).json({
      status: 'success',
      data: {
        paymentId: payment._id,
        paymentUrl: paymentIntent.attributes.next_action.redirect.url,
        paymentIntentId: paymentIntent.id
      }
    });

  } catch (err) {
    next(err);
  }
};

// Verify Payment Status (Webhook)
exports.verifyPayment = async (req, res, next) => {
  try {
    const { data } = req.body;
    
    // 1. Get payment intent details from PayMongo
    const paymentIntent = await axios.get(
      `${PAYMONGO_BASE_URL}/payment_intents/${data.id}`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`
        }
      }
    );

    const paymentData = paymentIntent.data.data;
    
    // 2. Update payment status
    const payment = await Payment.findOneAndUpdate(
      { transactionId: paymentData.id },
      {
        status: paymentData.attributes.status === 'succeeded' ? 'success' : 'failed',
        receiptUrl: paymentData.attributes.receipt_url,
        paidAt: paymentData.attributes.paid_at
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ status: 'fail', message: 'Payment not found' });
    }

    // 3. Update appointment payment status if successful
    if (paymentData.attributes.status === 'succeeded') {
      await Appointment.findByIdAndUpdate(
        payment.appointment,
        { paymentStatus: 'paid' }
      );
    }

    res.status(200).json({ status: 'success' });

  } catch (err) {
    next(err);
  }
};

// Get Payment Details
exports.getPaymentDetails = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      appointment: req.params.appointmentId,
      user: req.user.id
    }).populate('appointment');

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        payment
      }
    });
  } catch (err) {
    next(err);
  }
};

// Process Refund (Clinic Owner/Admin)
exports.processRefund = async (req, res, next) => {
    try {
      const { paymentId, reason } = req.body;
  
      // 1. Verify payment exists and belongs to clinic
      const payment = await Payment.findById(paymentId)
        .populate('appointment')
        .populate({
          path: 'appointment',
          populate: { path: 'clinic' }
        });
  
      if (!payment) {
        throw new AppError('Payment not found', 404);
      }
  
      // 2. Verify requester has rights (clinic owner or admin)
      const isClinicOwner = req.user.role === 'clinic_owner' && 
        payment.appointment.clinic._id.equals(req.user.clinicId);
      const isAdmin = req.user.role === 'admin';
  
      if (!isClinicOwner && !isAdmin) {
        throw new AppError('Not authorized to process refunds', 403);
      }
  
      // 3. Call PayMongo refund API
      const refundResponse = await axios.post(
        `${PAYMONGO_BASE_URL}/refunds`,
        {
          data: {
            attributes: {
              amount: payment.amount * 100,
              payment_id: payment.transactionId,
              reason: reason || 'cancellation'
            }
          }
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`
          }
        }
      );
  
      // 4. Update payment record
      payment.status = 'refunded';
      payment.refundReason = reason;
      payment.refundedAt = new Date();
      payment.refundApprovedBy = req.user.id;
      await payment.save();
  
      // 5. Update appointment status
      await Appointment.findByIdAndUpdate(
        payment.appointment._id,
        { 
          paymentStatus: 'refunded',
          status: 'cancelled' 
        }
      );
  
      res.status(200).json({
        status: 'success',
        data: {
          payment,
          refundId: refundResponse.data.data.id
        }
      });
  
    } catch (err) {
      next(err);
    }
  };