// controller/userController.js
exports.updateNotificationPreferences = async (req, res, next) => {
    try {
      const { appointmentReminders, promotions } = req.body;
  
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { 
          $set: { 
            'notificationPreferences.appointmentReminders': appointmentReminders,
            'notificationPreferences.promotions': promotions
          } 
        },
        { new: true, runValidators: true }
      );
  
      res.status(200).json({
        status: 'success',
        data: {
          user
        }
      });
    } catch (err) {
      next(err);
    }
  };
  
  // Get Current Preferences
  exports.getNotificationPreferences = async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id)
        .select('notificationPreferences');
  
      res.status(200).json({
        status: 'success',
        data: {
          preferences: user.notificationPreferences
        }
      });
    } catch (err) {
      next(err);
    }
  };