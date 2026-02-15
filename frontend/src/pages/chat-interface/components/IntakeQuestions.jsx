import React from 'react';

const IntakeQuestions = {
  initial: {
    question: "Hi, I'm Agent Axel, the intake assistant. Briefly Chat and I'll ask a few questions so an attorney can review.",
    nextStep: 'category'
  },
  category: {
    question: "Thank you for sharing that. To help our attorneys better understand your situation, could you tell me which category best describes your legal issue?\n\n• Personal Injury\n• Family Law\n• Criminal Defense\n• Business/Contract\n• Real Estate\n• Employment\n• Estate Planning\n• Other",
    nextStep: 'timeline'
  },
  timeline: {
    question: "When did this legal issue first occur or begin? Please provide an approximate date or timeframe.",
    nextStep: 'parties'
  },
  parties: {
    question: "Are there other parties involved in this matter? If yes, please briefly describe their relationship to the situation.",
    nextStep: 'documentation'
  },
  documentation: {
    question: "Do you have any documentation related to this matter? (Examples: contracts, emails, police reports, medical records, court documents)\n\nPlease describe what documents you have available.",
    nextStep: 'urgency'
  },
  urgency: {
    question: "Is there a specific deadline or time-sensitive aspect to your case? (Examples: court date, statute of limitations, contract expiration)",
    nextStep: 'contact'
  },
  contact: {
    question: "Thank you for providing those details. To complete your intake, please provide:\n\n• Your full name\n• Phone number\n• Email address\n• Preferred method of contact",
    nextStep: 'summary'
  },
  summary: {
    question: "Thank you for completing the intake process. I've compiled your information for attorney review. Our legal team will contact you within 24-48 business hours to schedule a consultation.\n\nIs there anything else you'd like to add to your case summary?",
    nextStep: 'complete'
  }
};

export const getNextQuestion = (currentStep) => {
  return IntakeQuestions?.[currentStep] || null;
};

export const getInitialQuestion = () => {
  return IntakeQuestions?.initial;
};

export default IntakeQuestions;