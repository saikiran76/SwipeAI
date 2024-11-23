import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './utils/appStore';
import PdfImageHandler from './components/pdfImageHandler';
import ExcelHandler from './components/ExcelHandler';

const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <div className="flex flex-col min-h-screen">
          <header className="bg-blue-600 text-white py-4 flex justify-center items-center gap-5">
            <img src="https://getswipe.in/static/img/brand_logo.svg" alt="Swipe Logo" className="size-16" />
            <h1 className="text-2xl font-bold text-center">Automated Data Extraction</h1>
          </header>
          <main className="flex-grow p-4">
            <nav className="mb-6 flex justify-center gap-4 mt-4">
              <a
                href="/pdf-image"
                className="px-4 py-2 rounded-full text-white bg-neutral-900 to-blue-600/80 hover:bg-gradient-to-r hover:from-blue-700/80 hover:to-orange-700/90 transition-all duration-500 hover:shadow-lg hover:text-black border border-gray-500/70"
              >
                PDF & Image
              </a>
              <a
                href="/excel"
                className="px-4 py-2 rounded-full text-white bg-neutral-900 hover:bg-gradient-to-r hover:from-orange-500/80 hover:to-green-500/90 transition-all duration-500 hover:shadow-lg hover:text-black border border-gray-500/70"
              >
                Excel
              </a>
            </nav>
            <Routes>
              <Route path="/" element={<Navigate to="/pdf-image" />} />
              <Route path="/pdf-image" element={<PdfImageHandler />} />
              <Route path="/excel" element={<ExcelHandler />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Provider>
  );
};

export default App;
