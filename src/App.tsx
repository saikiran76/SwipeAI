import { Provider } from 'react-redux';
import { store } from './utils/appStore';
import TabLayout from './components/TabLayout';

const App = () => {
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-50 font-sans">
        <header className="bg-white shadow">
          <div className="flex justify-center items-center gap-6 max-w-7xl mx-auto py-6 px-4">
            <img src="https://getswipe.in/static/img/brand_logo.svg" alt="Swipe Logo" className="size-24" />
            <h1 className="text-3xl font-bold text-gray-900">
              Invoice Management System
            </h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <TabLayout />
        </main>
      </div>
    </Provider>
  );
};

export default App;
