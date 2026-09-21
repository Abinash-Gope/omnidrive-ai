import React, { useState, useEffect } from "react";
import { Check, HelpCircle, ChevronDown, Sparkles, ArrowRight } from "lucide-react";
import usePublicPages from "../../hooks/usePublicPages.jsx";
import { getPricingPlans } from "../../api/publicApi.jsx";

const faqs = [
  {
    q: "How does the Free 15GB tier work?",
    a: "You get 15GB of free Amazon S3 storage with full access to Direct-to-S3 uploads, automated Rekognition moderation, and 720p HLS video transcoding. No credit card is required to sign up.",
  },
  {
    q: "Can I bring my own AWS Account and VPC?",
    a: "Yes! With the Enterprise Dedicated model, you can deploy OmniDrive AI directly into your private AWS VPC using our provided Terraform or CloudFormation modules.",
  },
  {
    q: "Is my data used to train Amazon Bedrock or AI models?",
    a: "Never. All AI inferences through Amazon Bedrock (Claude 3) and Rekognition are stateless and zero-retention. Your proprietary media is never used to train or fine-tune public models.",
  },
  {
    q: "What happens if an uploaded file contains unsafe content?",
    a: "Our automated Rekognition gatekeeper intercepts the upload during Step 2. Flagged files are immediately isolated to a private quarantine bucket and downstream transcoding is cancelled to prevent toxic content leakage.",
  },
];

const PricingPage = () => {
  const { activePricingTier, handleSelectTier, handleOpenRegister } = usePublicPages();
  const [plans, setPlans] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    getPricingPlans().then(setPlans);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#eaedff] text-[#005bbf] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Transparent Serverless Pricing</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Simple Pricing & Transparent Plans
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          Start for free with AWS Free Tier allocation, then scale up with dedicated Graviton3 Fargate workers and Bedrock AI tokens.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {plans.map((plan) => {
          const isSelected = activePricingTier === plan.id;
          const isPopular = plan.popular;

          return (
            <div
              key={plan.id}
              onClick={() => handleSelectTier(plan.id)}
              className={`relative bg-white dark:bg-slate-800/90 rounded-3xl p-8 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isPopular
                  ? "border-[#1a73e8] shadow-lg ring-2 ring-[#1a73e8]/20"
                  : "border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-xs font-bold bg-[#1a73e8] text-white shadow-xs">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {plan.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  {plan.description}
                </p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-xs text-slate-500">{plan.period}</span>
                </div>

                <ul className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenRegister();
                  }}
                  className={`w-full py-3 rounded-full text-sm font-semibold transition-all ${
                    isPopular
                      ? "bg-[#1a73e8] hover:bg-[#1557bf] text-white shadow-md hover:shadow-lg"
                      : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto pt-8 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-slate-900 dark:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
