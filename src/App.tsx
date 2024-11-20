import { Provider } from 'react-redux';
import { store } from './utils/appStore';
import TabLayout from './components/TabLayout';

const App = () => {
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4">
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
