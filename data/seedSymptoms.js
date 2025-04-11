// utils/seedSymptoms.js
const SymptomRule = require('../models/SymptomRule');

const initialRules = [
  {
    symptom: 'fever',
    questions: [
      {
        text: 'What is your pet\'s temperature in °C?',
        type: 'number',
        required: true
      },
      {
        text: 'How many days has the fever lasted?',
        type: 'number',
        required: true
      },
      {
        text: 'Is your pet showing other symptoms like lethargy or loss of appetite?',
        type: 'boolean'
      }
    ],
    conditions: [
      {
        criteria: { 
          temperature: { $gt: 39.4 },
          duration: { $gt: 2 } 
        },
        diagnosis: 'High fever possibly indicating infection',
        urgency: 'urgent',
        recommendedServices: ['consultation', 'blood_test'],
        suggestedClinics: 'emergency',
        followUpAdvice: 'Keep your pet hydrated and in a cool environment until veterinary care is available'
      },
      {
        criteria: { 
          temperature: { $gt: 39.0, $lt: 39.4 },
          duration: { $gt: 1 } 
        },
        diagnosis: 'Moderate fever that should be monitored',
        urgency: 'routine',
        recommendedServices: ['consultation'],
        followUpAdvice: 'Monitor temperature every 4 hours. If it rises above 39.4°C, seek veterinary care'
      }
    ]
  },
  {
    symptom: 'vomiting',
    questions: [
      {
        text: 'How many times has your pet vomited in the last 24 hours?',
        type: 'number',
        required: true
      },
      {
        text: 'Is there blood in the vomit?',
        type: 'boolean',
        required: true
      },
      {
        text: 'Is your pet able to keep water down?',
        type: 'boolean'
      }
    ],
    conditions: [
      {
        criteria: { 
          frequency: { $gt: 3 },
          blood: true 
        },
        diagnosis: 'Severe vomiting possibly indicating gastrointestinal emergency',
        urgency: 'emergency',
        suggestedClinics: 'emergency',
        followUpAdvice: 'Withhold food but offer small amounts of water. Seek immediate veterinary attention'
      },
      {
        criteria: { 
          frequency: { $gt: 3 },
          blood: false 
        },
        diagnosis: 'Frequent vomiting without blood',
        urgency: 'urgent',
        recommendedServices: ['consultation'],
        followUpAdvice: 'Withhold food for 12 hours but provide water. If vomiting continues, seek veterinary care'
      }
    ]
  }
];

async function seedSymptoms() {
  try {
    await SymptomRule.deleteMany();
    await SymptomRule.insertMany(initialRules);
    console.log('Symptom rules seeded successfully!');
  } catch (err) {
    console.error('Error seeding symptoms:', err);
  }
}

module.exports = seedSymptoms;