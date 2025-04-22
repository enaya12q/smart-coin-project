import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getStorePackages, getStoreCards, addToCart, removeFromCart, clearCart, createPayment, verifyPayment } from '../features/store/storeSlice';

// مكونات
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';

const Store = ({ showNotification }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('packages');
  const [showCartModal, setShowCartModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const dispatch = useDispatch();
  
  const { user } = useSelector(state => state.auth);
  const { packages, cards, cart, loading, paymentUrl, transactionId } = useSelector(state => state.store);
  
  // تحميل بيانات المتجر عند تحميل الصفحة
  useEffect(() => {
    dispatch(getStorePackages());
    dispatch(getStoreCards());
  }, [dispatch]);
  
  // حساب إجمالي سعر سلة التسوق
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  // إضافة منتج إلى سلة التسوق
  const handleAddToCart = (item) => {
    dispatch(addToCart({ item, quantity: 1 }));
    showNotification('تمت إضافة المنتج إلى سلة التسوق', 'success');
  };
  
  // إزالة منتج من سلة التسوق
  const handleRemoveFromCart = (itemId) => {
    dispatch(removeFromCart(itemId));
  };
  
  // إنشاء طلب دفع
  const handleCreatePayment = async () => {
    if (!user || cart.length === 0) {
      showNotification('يرجى إضافة منتجات إلى سلة التسوق أولاً', 'error');
      return;
    }
    
    try {
      const resultAction = await dispatch(createPayment({
        userId: user.id,
        packageId: 'cart',
        amount: calculateTotal(),
        description: `شراء من المتجر: ${cart.length} منتج`
      }));
      
      if (createPayment.fulfilled.match(resultAction)) {
        showNotification('تم إنشاء طلب الدفع بنجاح', 'success');
        setShowCartModal(false);
        setShowPaymentModal(true);
        
        // فتح رابط الدفع في نافذة جديدة
        if (resultAction.payload.paymentUrl) {
          window.open(resultAction.payload.paymentUrl, '_blank');
        }
      } else {
        showNotification(resultAction.payload?.message || 'فشل إنشاء طلب الدفع', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء إنشاء طلب الدفع', 'error');
    }
  };
  
  // التحقق من حالة الدفع
  const handleVerifyPayment = async () => {
    if (!transactionId) {
      showNotification('لا يوجد معاملة للتحقق منها', 'error');
      return;
    }
    
    try {
      const resultAction = await dispatch(verifyPayment(transactionId));
      
      if (verifyPayment.fulfilled.match(resultAction)) {
        if (resultAction.payload.success && resultAction.payload.status === 'completed') {
          showNotification('تم التحقق من الدفع بنجاح وإكمال عملية الشراء', 'success');
          setShowPaymentModal(false);
          dispatch(clearCart());
        } else {
          showNotification(resultAction.payload.message || 'لم يتم التحقق من الدفع بعد', 'warning');
        }
      } else {
        showNotification(resultAction.payload?.message || 'فشل التحقق من حالة الدفع', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء التحقق من حالة الدفع', 'error');
    }
  };
  
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-grow p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-primary neon-text mb-6 text-center">
            متجر سمارت كوين
          </h1>
          
          {/* زر سلة التسوق */}
          <div className="flex justify-end mb-4">
            <button 
              className="btn-primary flex items-center gap-2"
              onClick={() => setShowCartModal(true)}
            >
              <span className="material-icons">shopping_cart</span>
              <span>{`سلة التسوق (${cart.length})`}</span>
            </button>
          </div>
          
          {/* تبويبات المتجر */}
          <div className="flex border-b border-gray-700 mb-6">
            <button 
              className={`py-2 px-4 ${activeTab === 'packages' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
              onClick={() => setActiveTab('packages')}
            >
              الحزم
            </button>
            <button 
              className={`py-2 px-4 ${activeTab === 'cards' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
              onClick={() => setActiveTab('cards')}
            >
              البطاقات
            </button>
          </div>
          
          {/* عرض الحزم */}
          {activeTab === 'packages' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages && packages.map(pkg => (
                <div key={pkg.id} className="store-card">
                  <div className="store-card-header">
                    <h3>{pkg.name}</h3>
                  </div>
                  <div className="store-card-body">
                    <p className="text-gray-300 mb-4">{pkg.description}</p>
                    <ul className="text-gray-400 mb-4">
                      {pkg.features && pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 mb-2">
                          <span className="text-primary">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="store-card-price">
                      {`${pkg.price} TON`}
                    </div>
                    <button 
                      className="btn-primary w-full"
                      onClick={() => handleAddToCart(pkg)}
                      disabled={loading}
                    >
                      إضافة إلى السلة
                    </button>
                  </div>
                </div>
              ))}
              
              {(!packages || packages.length === 0) && (
                <p className="text-gray-400 col-span-3 text-center py-4">
                  {loading ? 'جاري تحميل الحزم...' : 'لا توجد حزم متاحة حالياً'}
                </p>
              )}
            </div>
          )}
          
          {/* عرض البطاقات */}
          {activeTab === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cards && cards.map(card => (
                <div key={card.id} className="store-card">
                  <div className="store-card-header">
                    <h3>{card.name}</h3>
                  </div>
                  <div className="store-card-body">
                    <div className="flex justify-center mb-4">
                      <img 
                        src={card.image || 'https://via.placeholder.com/150'} 
                        alt={card.name} 
                        className="h-32 object-contain"
                      />
                    </div>
                    <p className="text-gray-300 mb-4">{card.description}</p>
                    <div className="store-card-price">
                      {`${card.price} SC`}
                    </div>
                    <button 
                      className="btn-primary w-full"
                      onClick={() => handleAddToCart(card)}
                      disabled={loading}
                    >
                      إضافة إلى السلة
                    </button>
                  </div>
                </div>
              ))}
              
              {(!cards || cards.length === 0) && (
                <p className="text-gray-400 col-span-3 text-center py-4">
                  {loading ? 'جاري تحميل البطاقات...' : 'لا توجد بطاقات متاحة حالياً'}
                </p>
              )}
            </div>
          )}
        </div>
      </main>
      
      {/* نافذة سلة التسوق */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-primary">
            <h2 className="text-xl font-bold text-primary mb-4">سلة التسوق</h2>
            
            {cart.length === 0 ? (
              <p className="text-gray-400 text-center py-4">سلة التسوق فارغة</p>
            ) : (
              <>
                <div className="max-h-60 overflow-y-auto mb-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 border-b border-gray-700">
                      <div>
                        <p className="text-gray-300">{item.name}</p>
                        <p className="text-gray-400 text-sm">{`${item.price} ${item.currency || 'SC'} × ${item.quantity}`}</p>
                      </div>
                      <button 
                        className="text-red-500 hover:text-red-400"
                        onClick={() => handleRemoveFromCart(item.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center font-bold text-lg mb-6">
                  <span className="text-gray-300">الإجمالي:</span>
                  <span className="text-primary">{`${calculateTotal()} TON`}</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button 
                    className="btn-primary"
                    onClick={handleCreatePayment}
                    disabled={loading}
                  >
                    {loading ? 'جاري المعالجة...' : 'إتمام الشراء'}
                  </button>
                  
                  <button 
                    className="text-gray-400 hover:text-gray-300"
                    onClick={() => setShowCartModal(false)}
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* نافذة الدفع */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-primary">
            <h2 className="text-xl font-bold text-primary mb-4">إتمام الدفع</h2>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-2">{`المبلغ الإجمالي: ${calculateTotal()} TON`}</p>
              
              {paymentUrl && (
                <div className="bg-gray-800 p-3 rounded-lg mb-4">
                  <p className="text-gray-300 mb-2">رابط الدفع:</p>
                  <div className="referral-link-container">
                    <div className="referral-link">{paymentUrl}</div>
                    <button 
                      className="copy-button"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentUrl);
                        showNotification('تم نسخ رابط الدفع', 'success');
                      }}
                    >
                      نسخ
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-3">
              {paymentUrl && (
                <>
                  <button 
                    className="btn-primary"
                    onClick={() => window.open(paymentUrl, '_blank')}
                  >
                    فتح رابط الدفع
                  </button>
                  
                  <button 
                    className="btn-secondary"
                    onClick={handleVerifyPayment}
                    disabled={loading}
                  >
                    {loading ? 'جاري التحقق...' : 'التحقق من حالة الدفع'}
                  </button>
                </>
              )}
              
              <button 
                className="text-gray-400 hover:text-gray-300 mt-2"
                onClick={() => setShowPaymentModal(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default Store;
