import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../features/auth/authSlice';
import telegramLogo from '../assets/telegram-logo.png';

const Login = ({ showNotification }) => {
  const [telegramId, setTelegramId] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { error } = useSelector(state => state.auth);
  
  const handleTelegramLogin = async () => {
    // في التطبيق الحقيقي، سنستخدم Telegram Login Widget
    // هنا نقوم بمحاكاة عملية تسجيل الدخول عبر التليجرام
    window.open(`${process.env.REACT_APP_TELEGRAM_BOT_URL}?start=login`, '_blank');
  };
  
  const handleManualLogin = async (e) => {
    e.preventDefault();
    
    if (!telegramId || !username) {
      showNotification('يرجى إدخال معرف التليجرام واسم المستخدم', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const resultAction = await dispatch(login({ telegramId, username }));
      
      if (login.fulfilled.match(resultAction)) {
        showNotification('تم تسجيل الدخول بنجاح', 'success');
        navigate('/dashboard');
      } else {
        showNotification(resultAction.payload?.message || 'فشل تسجيل الدخول', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء تسجيل الدخول', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="login-container w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center neon-border">
              <span className="text-4xl font-bold text-primary">SC</span>
            </div>
          </div>
          <h1 className="login-title text-3xl">سمارت كوين</h1>
          <p className="text-gray-400">المستقبل الذكي للعملات الرقمية</p>
        </div>
        
        <button 
          onClick={handleTelegramLogin}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 mb-6 transition-all duration-300"
          disabled={isLoading}
        >
          <img src={telegramLogo} alt="Telegram" className="w-6 h-6" />
          <span>تسجيل الدخول بتيليجرام</span>
        </button>
        
        <div className="login-divider">
          <span className="login-divider-text">أو</span>
        </div>
        
        <form onSubmit={handleManualLogin} className="mt-6">
          <div className="mb-4">
            <label htmlFor="telegramId" className="block text-gray-300 mb-2">معرف التليجرام</label>
            <input
              type="text"
              id="telegramId"
              className="input-field"
              placeholder="أدخل معرف التليجرام"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="username" className="block text-gray-300 mb-2">اسم المستخدم</label>
            <input
              type="text"
              id="username"
              className="input-field"
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            className="btn-primary w-full py-3"
            disabled={isLoading}
          >
            {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-gray-400">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="text-primary hover:underline">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
