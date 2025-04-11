// middlewares/paymongoWebHook.js
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50 // limit each IP to 50 requests per windowMs
});

exports.verifyPaymongoWebhook = (req, res, next) => {
  const signature = req.headers['paymongo-signature'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

  if (!signature) {
    return res.status(401).json({ status: 'fail', message: 'No signature provided' });
  }

  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (signature !== computedSignature) {
    return res.status(401).json({ status: 'fail', message: 'Invalid signature' });
  }

  next();
};