import { FiShield, FiClock, FiCheck } from 'react-icons/fi';

export default function PendingApproval() {
  return (
    <div className="z-0 min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-200/30 to-orange-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      <div className="max-w-lg w-full text-center space-y-8 relative z-10">
        {/* Main icon with animated ring */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute w-24 h-24 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-full animate-ping"></div>
          <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full shadow-lg border border-yellow-200/50 backdrop-blur-sm">
            <FiShield className="text-yellow-600 text-3xl drop-shadow-sm" />
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center justify-center space-x-4 py-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">Submitted</span>
          </div>
          <div className="w-8 h-px bg-gradient-to-r from-green-300 to-yellow-300"></div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-yellow-700">Under Review</span>
          </div>
          <div className="w-8 h-px bg-gray-200"></div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <span className="text-sm font-medium text-gray-500">Approved</span>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Awaiting Admin Approval
            </h1>
            <p className="text-gray-600 leading-relaxed text-lg">
              Your identity and business documents have been submitted. Our team will review your details and notify you once your account is approved.
            </p>
          </div>

          {/* Progress animation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Review Progress</span>
              <span>Processing...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse" style={{width: '65%'}}></div>
            </div>
          </div>

          {/* Additional info */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50/50 rounded-xl">
              <FiClock className="text-blue-600 text-lg" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900">Review Time</p>
                <p className="text-xs text-blue-600">1-3 business days</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50/50 rounded-xl">
              <FiCheck className="text-green-600 text-lg" />
              <div className="text-left">
                <p className="text-sm font-medium text-green-900">Documents</p>
                <p className="text-xs text-green-600">Successfully uploaded</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer message */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">
            You'll receive an email notification once the review is complete.
          </p>
          <p className="text-xs text-gray-400">
            Need help? Contact our support team at  <a href="https://wa.me//+233506632349">SM_Jay</a>
          </p>
        </div>
      </div>
    </div>
  );
}