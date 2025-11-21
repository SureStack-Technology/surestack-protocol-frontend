import React from "react";

export default function EnterpriseCTA() {
  return (
    <div className="glass-card p-8 space-y-6">
      <button
        type="button"
        onClick={() => (window.location.href = '/business/policies')}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
      >
        ← Back to Policies
      </button>
      <h1 className="text-4xl font-heading text-white">
        Enterprise Insurance Solutions
      </h1>
      <p className="text-lg text-white/80">
        For large institutional portfolios, please contact us directly to design
        a customized insurance model tailored to your portfolio.
      </p>
      <p className="text-lg text-cyan-300">
        Email: pilot@surestack.tech
      </p>
    </div>
  );
}

