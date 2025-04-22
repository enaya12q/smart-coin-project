import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';

// الصفحات
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import TONWallet from './pages/TONWallet';
import Mining from './pages/Mining';
import Store from './pages/Store';
import Referral from './pages/Referral';
import Profile from './pages/Profile';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/ton-wallet" element={<TONWallet />} />
          <Route path="/mining" element={<Mining />} />
          <Route path="/store" element={<Store />} />
          <Route path="/referral" element={<Referral />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;
