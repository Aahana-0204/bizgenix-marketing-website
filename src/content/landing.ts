export const landing = {
  brand: "Bizgenix AI CRM",
  nav: [
    ["Why Bizgenix", "why-bizgenix"],
    ["Features", "features"],
    ["Industries", "industries"],
    ["How It Works", "how-it-works"],
    ["Plans", "plans"],
    ["FAQs", "faqs"],
  ],
  hero: {
    eyebrow: "SMARTER SALES. BETTER FOLLOW-THROUGH.",
    title: "Leads Are Coming In. Are They Moving Forward?",
    body: "Meet Bizgenix AI CRM—bring customer enquiries, sales activities and follow-ups into one organized workspace, with AI-enabled workflows available where configured.",
    note: "See a real CRM workflow tailored to your business. No purchase commitment required for the demo.",
  },
  problem: {
    title: "Your Next Sale Could Be Waiting on a Follow-Up.",
    body: "Enquiries arrive from multiple places. Teams get busy. Important conversations get buried. Without a clear process, it is easy to lose track of who needs a call, which proposal is pending, and what happens next.",
    questions: [
      "Who owns the next follow-up?",
      "Which opportunities are progressing?",
      "Which leads have gone quiet?",
      "Can your team see the same customer context?",
    ],
    closing: "What if the entire sales journey were easier to see?",
  },
  solution: {
    title: "One Place to Organize Your Sales Momentum.",
    body: "Bizgenix AI CRM is designed to help teams manage leads, view pipeline progress and maintain consistent follow-up activity—without relying on scattered spreadsheets and disconnected updates.",
  },
  features: [
    {
      title: "Lead Management",
      body: "Capture, organize and assign customer enquiries to the right team member.",
      icon: "users",
      verified: true,
    },
    {
      title: "Sales Pipeline",
      body: "See opportunities by stage and know what needs attention next.",
      icon: "pipeline",
      verified: true,
    },
    {
      title: "Follow-up Workflows",
      body: "Keep callbacks and next actions visible to the sales team.",
      icon: "clock",
      verified: true,
    },
    {
      title: "Sales Visibility",
      body: "Understand team activities and pipeline progress with available reports.",
      icon: "chart",
      verified: true,
    },
    {
      title: "AI Voice Assistant",
      body: "Explore AI-assisted calling workflows where enabled in the subscribed setup.",
      icon: "voice",
      verified: false,
    },
    {
      title: "WhatsApp Workflows",
      body: "Connect approved customer communication workflows where integration is available.",
      icon: "message",
      verified: false,
    },
    {
      title: "Conversation Insights",
      body: "Use supported recordings, transcripts or analysis in enabled configurations.",
      icon: "sparkles",
      verified: false,
    },
  ],
  industries: {
    title: "Different Businesses. One Common Challenge: Following Through.",
    items: [
      {
        name: "Real Estate",
        stages: [
          "Property enquiry",
          "Qualification",
          "Site visit",
          "Follow-up",
        ],
        icon: "building",
      },
      {
        name: "B2B Services",
        stages: ["Client enquiry", "Discovery call", "Proposal", "Decision"],
        icon: "briefcase",
      },
      {
        name: "Education & Training",
        stages: ["Admission enquiry", "Counselling", "Follow-up", "Admission"],
        icon: "education",
      },
      {
        name: "Manufacturing / Distribution",
        stages: ["Dealer enquiry", "Quotation", "Follow-up", "Order"],
        icon: "factory",
      },
    ],
    note: "Example workflows, not claims of existing customer implementations.",
  },
  process: {
    title: "From First Enquiry to the Next Right Action.",
    steps: [
      ["Capture", "Keep incoming business enquiries organized."],
      ["Qualify", "Understand needs and assign a sales owner."],
      ["Follow Up", "Track conversations, reminders and next actions."],
      ["Demonstrate", "Schedule a relevant live product session."],
      ["Convert", "Move qualified opportunities through proposal and closing."],
    ],
  },
  proof: {
    title: "What Would Your Sales Process Look Like With Better Visibility?",
    body: "Book a short live demonstration. We will walk through a real example based on your team size and sales workflow so you can assess the fit for your business.",
    cta: "See the CRM in Action",
  },
  plans: {
    title: "A CRM Setup That Fits the Way You Sell.",
    body: "Explore plan options for growing teams, scaling teams and larger organizations. We can explain the applicable terms and recommend an option after understanding your use case.",
    items: [
      {
        name: "5 Users",
        body: "For growing sales teams",
        cta: "Get Plan Details",
      },
      {
        name: "10 Users",
        body: "For teams expanding their sales operations",
        cta: "Get Plan Details",
      },
      {
        name: "Unlimited Users",
        body: "For larger teams or wider deployments",
        cta: "Discuss Your Requirements",
      },
    ],
  },
  booking: {
    title: "See Bizgenix AI CRM in Action.",
    body: "Choose a convenient time for a free live walkthrough. Tell us a little about your business so our team can show the most relevant CRM workflows.",
  },
  faqs: [
    [
      "Who is Bizgenix AI CRM for?",
      "Teams that want to organize customer enquiries, sales stages and follow-up activities.",
    ],
    [
      "Can I see the CRM before buying?",
      "Yes. Select an available time using the Book Free Demo calendar.",
    ],
    [
      "Is AI calling included?",
      "Availability, activation and usage charges depend on the confirmed configuration. Our team will clarify this before purchase.",
    ],
    [
      "Can our workflow be customized?",
      "Share your requirements; our team will review scope, feasibility and commercial terms.",
    ],
    [
      "How do I learn the pricing?",
      "Choose Get Plan Details or Ask About Pricing to request the approved plan details.",
    ],
  ],
  final: {
    title: "Your Next Sales Opportunity Deserves a Clear Next Step.",
    body: "See how Bizgenix AI CRM can help bring clarity to leads, follow-ups and sales activity.",
  },
} as const;

export const formContent = {
  company_name: "Company name",
  full_name: "Full name",
  work_email: "Work email",
  mobile: "Mobile (+91)",
  interested_in: "I’m interested in",
  industry: "Industry",
  team_size: "Team size",
  key_challenge: "Anything we should know?",
  plan_interest: "Plan interest",
  interests: [
    "Custom solution",
    "AI CRM",
    "AI Voice Assistant",
    "WhatsApp Workflows",
    "Other",
  ],
  industries: [
    "Real Estate",
    "B2B Services",
    "Education & Training",
    "Manufacturing-Distribution",
    "Other",
  ],
  teamSizes: ["1–5", "6–10", "11–25", "26+"],
  plans: ["5 Users", "10 Users", "Unlimited Users", "Not sure yet"],
  bookingTitle: "Choose a time that works for you.",
  planTitle: "Find the right fit for your team.",
  bookingSubtitle:
    "See live availability for Khushi and Pranesh. Pick a time first, then share a few details to confirm your walkthrough.",
  planSubtitle:
    "Tell us a little about your team. We’ll share the approved plan details.",
  consent:
    "I agree to be contacted about my enquiry and have read the Privacy Policy.",
  helper:
    "We’ll use these details to confirm your meeting and send the calendar invitation.",
  placeholder: "Tell us where work gets in the way.",
  planSuccess:
    "Thanks — our team will share the approved plan details shortly.",
  submitDemo: "Confirm your booking",
  submitPlan: "Send my enquiry",
} as const;
