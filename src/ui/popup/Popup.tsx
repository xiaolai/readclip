// import { useState } from 'react'

function Popup() {
  return (
    <div className="w-80 p-4 bg-white text-gray-900">
      <h1 className="text-xl font-bold mb-4">Save as PDF</h1>
      <p className="text-sm text-gray-600 mb-4">
        Right-click on any page and select "Save as PDF" to generate a clean PDF.
      </p>
      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
        onClick={() => window.close()}
      >
        Close
      </button>
    </div>
  )
}

export default Popup
