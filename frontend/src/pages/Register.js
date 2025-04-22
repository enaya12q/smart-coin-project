import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import gsap from 'gsap';

// مكونات
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Navbar = () => {
  return (
    <nav className="bg-secondary border-b border-gray-800">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="Smart Coin" className="h-10 w-10 mr-2" />
            <span className="text-xl font-bold text-primary">Smart Coin</span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/login" className="text-gray-300 hover:text-primary">
            تسجيل الدخول
          </Link>
          <Link to="/register" className="btn-primary">
            إنشاء حساب
          </Link>
        </div>
      </div>
    </nav>
  );
};

const Footer = () => {
  return (
    <footer className="bg-secondary border-t border-gray-800 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="flex items-center justify-center md:justify-start">
              <img src="/logo.png" alt="Smart Coin" className="h-8 w-8 mr-2" />
              <span className="text-lg font-bold text-primary">Smart Coin</span>
            </Link>
            <p className="text-gray-400 text-sm mt-2">المستقبل الذكي للعملات الرقمية</p>
          </div>
          <div className="flex space-x-6">
            <a href="https://t.me/smartcoin" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary">
              <i className="fab fa-telegram-plane text-xl"></i>
            </a>
            <a href="https://twitter.com/smartcoin" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary">
              <i className="fab fa-twitter text-xl"></i>
            </a>
            <a href="https://instagram.com/smartcoin" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary">
              <i className="fab fa-instagram text-xl"></i>
            </a>
          </div>
        </div>
        <div className="mt-6 border-t border-gray-800 pt-6 text-center">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Smart Coin. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
};

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { isAuthenticated, loading, error } = useSelector(state => state.auth);
  
  // التحقق من وجود رمز إحالة في الرابط
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setReferralCode(ref);
    }
  }, []);
  
  // إعادة التوجيه إذا كان المستخدم مسجل الدخول بالفعل
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  // تأثيرات حركية
  useEffect(() => {
    gsap.from('.register-card', { 
      duration: 1, 
      y: 50, 
      opacity: 0, 
      ease: 'power3.out' 
    });
    
    gsap.from('.register-title', { 
      duration: 1.2, 
      y: 20, 
      opacity: 0, 
      delay: 0.3, 
      ease: 'power3.out' 
    });
    
    gsap.from('.form-group', { 
      duration: 0.8, 
      y: 20, 
      opacity: 0, 
      stagger: 0.1, 
      delay: 0.5, 
      ease: 'power3.out' 
    });
  }, []);
  
  // مخطط التحقق
  const validationSchema = Yup.object({
    username: Yup.string()
      .min(3, 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل')
      .max(20, 'يجب أن يكون اسم المستخدم 20 حرفًا كحد أقصى')
      .required('اسم المستخدم مطلوب'),
    email: Yup.string()
      .email('البريد الإلكتروني غير صالح')
      .required('البريد الإلكتروني مطلوب'),
    password: Yup.string()
      .min(6, 'يجب أن تكون كلمة المرور 6 أحرف على الأقل')
      .required('كلمة المرور مطلوبة'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'كلمات المرور غير متطابقة')
      .required('تأكيد كلمة المرور مطلوب')
  });
  
  // معالجة التسجيل
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    const { username, email, password } = values;
    
    try {
      // await dispatch(register({ username, email, password, referralCode })).unwrap();
      resetForm();
      navigate('/dashboard');
    } catch (err) {
      console.error('فشل التسجيل:', err);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="register-card card max-w-md w-full">
          <h1 className="register-title text-2xl md:text-3xl font-bold text-primary neon-text mb-6 text-center">
            إنشاء حساب جديد
          </h1>
          
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          <Formik
            initialValues={{
              username: '',
              email: '',
              password: '',
              confirmPassword: ''
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form>
                <div className="form-group mb-4">
                  <label htmlFor="username" className="block text-gray-300 mb-2">اسم المستخدم</label>
                  <Field
                    type="text"
                    id="username"
                    name="username"
                    className="input-field"
                    placeholder="أدخل اسم المستخدم"
                  />
                  <ErrorMessage name="username" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                
                <div className="form-group mb-4">
                  <label htmlFor="email" className="block text-gray-300 mb-2">البريد الإلكتروني</label>
                  <Field
                    type="email"
                    id="email"
                    name="email"
                    className="input-field"
                    placeholder="أدخل البريد الإلكتروني"
                  />
                  <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                
                <div className="form-group mb-4">
                  <label htmlFor="password" className="block text-gray-300 mb-2">كلمة المرور</label>
                  <div className="relative">
                    <Field
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      className="input-field pr-10"
                      placeholder="أدخل كلمة المرور"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
                    </button>
                  </div>
                  <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                
                <div className="form-group mb-4">
                  <label htmlFor="confirmPassword" className="block text-gray-300 mb-2">تأكيد كلمة المرور</label>
                  <Field
                    type={showPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    className="input-field"
                    placeholder="أعد إدخال كلمة المرور"
                  />
                  <ErrorMessage name="confirmPassword" component="div" className="text-red-500 text-sm mt-1" />
                </div>
                
                {referralCode && (
                  <div className="form-group mb-4">
                    <label className="block text-gray-300 mb-2">رمز الإحالة</label>
                    <div className="input-field bg-gray-700 flex items-center">
                      <span className="text-gray-400">{referralCode}</span>
                    </div>
                    <p className="text-green-500 text-sm mt-1">تم تطبيق رمز الإحالة! ستحصل على مكافأة عند التسجيل.</p>
                  </div>
                )}
                
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting || loading ? (
                    <span className="flex items-center justify-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      جاري التسجيل...
                    </span>
                  ) : (
                    'إنشاء حساب'
                  )}
                </button>
              </Form>
            )}
          </Formik>
          
          <div className="mt-4 text-center">
            <p className="text-gray-400">
              لديك حساب بالفعل؟{' '}
              <Link to="/login" className="text-primary hover:text-primary-light">
                تسجيل الدخول
              </Link>
            </p>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              بالتسجيل، أنت توافق على{' '}
              <Link to="/terms" className="text-primary hover:text-primary-light">
                شروط الاستخدام
              </Link>
              {' '}و{' '}
              <Link to="/privacy" className="text-primary hover:text-primary-light">
                سياسة الخصوصية
              </Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Register;
