function Popup() {
  return (
    <div className="w-80 p-4 bg-white text-gray-900">
      <h1 className="text-xl font-bold mb-4">Reader Mode</h1>
      <p className="text-sm text-gray-600 mb-4">
        Click the toolbar icon to open Reader Mode in the side panel.
        You can also right-click and select "Save as PDF".
      </p>
      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
        onClick={() => window.close()}
        aria-label="Close popup"
      >
        Close
      </button>
    </div>
  )
}

export default Popup
