// controllers/symptomController.js
const SymptomRule = require('../models/SymptomRule');
const Clinic = require('../models/Clinic');
const AppError = require('../utils/appError');

// Get all active symptom rules (for admin/vet management)
exports.getAllSymptomRules = async (req, res, next) => {
  try {
    const rules = await SymptomRule.find({ isActive: true });
    res.status(200).json({
      status: 'success',
      data: {
        rules
      }
    });
  } catch (err) {
    next(err);
  }
};

// Create new symptom rule (admin/vet only)
exports.createSymptomRule = async (req, res, next) => {
  try {
    const newRule = await SymptomRule.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        rule: newRule
      }
    });
  } catch (err) {
    next(err);
  }
};

// Symptom assessment endpoint
exports.assessSymptoms = async (req, res, next) => {
  try {
    const { symptoms, location } = req.body;
    
    // 1. Validate input
    if (!symptoms || typeof symptoms !== 'object') {
      throw new AppError('Please provide symptoms in the correct format', 400);
    }

    // 2. Get all active rules matching the symptoms
    const matchedRules = await SymptomRule.find({
      symptom: { $in: Object.keys(symptoms) },
      isActive: true
    }).populate('recommendedServices');

    if (matchedRules.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          diagnosis: 'No specific concerns detected based on symptoms',
          urgency: 'routine',
          recommendedServices: [],
          clinics: []
        }
      });
    }

    // 3. Evaluate conditions for each matched rule
    const results = [];
    
    matchedRules.forEach(rule => {
      const symptomData = symptoms[rule.symptom];
      
      rule.conditions.forEach(condition => {
        if (this.evaluateCondition(condition.criteria, symptomData)) {
          results.push({
            ruleId: rule._id,
            symptom: rule.symptom,
            diagnosis: condition.diagnosis,
            urgency: condition.urgency,
            recommendedServices: condition.recommendedServices,
            suggestedClinics: condition.suggestedClinics,
            followUpAdvice: condition.followUpAdvice,
            confidenceScore: this.calculateConfidence(condition.criteria, symptomData)
          });
        }
      });
    });

    if (results.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          diagnosis: 'No concerning patterns detected',
          urgency: 'routine',
          recommendedServices: [],
          clinics: []
        }
      });
    }

    // 4. Sort by urgency and confidence
    const prioritizedResults = results.sort((a, b) => {
      const urgencyOrder = { emergency: 3, urgent: 2, routine: 1 };
      if (urgencyOrder[b.urgency] !== urgencyOrder[a.urgency]) {
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      }
      return b.confidenceScore - a.confidenceScore;
    });

    // 5. Find recommended clinics if location provided
    let recommendedClinics = [];
    if (location && location.latitude && location.longitude) {
      const clinicQuery = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(location.longitude), parseFloat(location.latitude)]
            },
            $maxDistance: location.maxDistance || 10000 // 10km default
          }
        },
        isActive: true
      };

      // Add specialty filter if suggested by the rule
      if (prioritizedResults[0].suggestedClinics) {
        clinicQuery.specialties = prioritizedResults[0].suggestedClinics;
      }

      recommendedClinics = await Clinic.find(clinicQuery)
        .limit(5)
        .select('name address contactNumber email operatingHours');
    }

    // 6. Prepare response
    const primaryResult = prioritizedResults[0];
    const response = {
      diagnosis: primaryResult.diagnosis,
      urgency: primaryResult.urgency,
      recommendedServices: primaryResult.recommendedServices,
      followUpAdvice: primaryResult.followUpAdvice,
      clinics: recommendedClinics,
      additionalConsiderations: prioritizedResults.slice(1).map(r => ({
        symptom: r.symptom,
        diagnosis: r.diagnosis
      }))
    };

    res.status(200).json({
      status: 'success',
      data: response
    });

  } catch (err) {
    next(err);
  }
};

// Helper: Evaluate condition criteria
exports.evaluateCondition = (criteria, symptomData) => {
  for (const [key, ruleValue] of Object.entries(criteria)) {
    const userValue = symptomData[key];
    
    if (userValue === undefined || userValue === null) {
      return false;
    }

    if (typeof ruleValue === 'object') {
      // Handle operators (e.g., { $gt: 39.2 })
      if (ruleValue.$gt !== undefined && userValue <= ruleValue.$gt) return false;
      if (ruleValue.$lt !== undefined && userValue >= ruleValue.$lt) return false;
      if (ruleValue.$eq !== undefined && userValue !== ruleValue.$eq) return false;
    } else if (userValue !== ruleValue) {
      return false;
    }
  }
  return true;
};

// Helper: Calculate confidence score (0-1)
exports.calculateConfidence = (criteria, symptomData) => {
  let matchedConditions = 0;
  let totalConditions = 0;
  
  for (const [key, ruleValue] of Object.entries(criteria)) {
    totalConditions++;
    const userValue = symptomData[key];
    
    if (userValue === undefined || userValue === null) continue;
    
    if (typeof ruleValue === 'object') {
      if (ruleValue.$gt !== undefined && userValue > ruleValue.$gt) matchedConditions++;
      if (ruleValue.$lt !== undefined && userValue < ruleValue.$lt) matchedConditions++;
      if (ruleValue.$eq !== undefined && userValue === ruleValue.$eq) matchedConditions++;
    } else if (userValue === ruleValue) {
      matchedConditions++;
    }
  }
  
  return totalConditions > 0 ? matchedConditions / totalConditions : 0;
};

// Update existing rule
exports.updateSymptomRule = async (req, res, next) => {
    try {
      const rule = await SymptomRule.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      res.status(200).json({
        status: 'success',
        data: { rule }
      });
    } catch (err) {
      next(err);
    }
  };
  
  // Toggle rule status
  exports.toggleRuleStatus = async (req, res, next) => {
    try {
      const rule = await SymptomRule.findById(req.params.id);
      rule.isActive = !rule.isActive;
      await rule.save();
      res.status(200).json({
        status: 'success',
        data: { rule }
      });
    } catch (err) {
      next(err);
    }
  };
  
  // Get rule usage analytics
  exports.getRuleAnalytics = async (req, res, next) => {
    try {
      const stats = await Appointment.aggregate([
        { $match: { 'symptomAssessment': { $exists: true } } },
        { $group: { 
          _id: '$symptomAssessment.diagnosis',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$symptomAssessment.confidenceScore' }
        }}
      ]);
      res.status(200).json({
        status: 'success',
        data: { stats }
      });
    } catch (err) {
      next(err);
    }
  };