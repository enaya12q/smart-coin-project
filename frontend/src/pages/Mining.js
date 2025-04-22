import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getMiningStatus, getMiningPackages, startMining, collectMiningReward } from '../features/mining/miningSlice';
import { createPayment, verifyPayment } from '../features/store/storeSlice';

// مكونات
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import MiningButton from '../components/MiningButton';
import Countdown from '../components/Countdown';

const Mining = ({ showNotification }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const dispatch = useDispatch();
  
  const { user } = useSelector(state => state.auth);
  const { 
    miningRate, 
    lastMiningTime, 
    dailyLimit, 
    todayMined, 
    miningActive, 
    miningPackages, 
    currentPackage, 
    loading 
  } = useSelector(state => state.mining);
  const { paymentUrl, transactionId } = useSelector(state => state.store);
  
  // تحميل بيانات التعدين عند تحميل الصفحة
  useEffect(() => {
    if (user) {
      dispatch(getMiningStatus(user.id));
      dispatch(getMiningPackages());
    }
  }, [dispatch, user]);
  
  // حساب نسبة التعدين اليومي
  const miningPercentage = (todayMined / dailyLimit) * 100;
  
  // حساب الوقت المتبقي للتعدين
  const getRemainingTime = () => {
    if (!lastMiningTime) return 0;
    
    const startTime = new Date(lastMiningTime).getTime();
    const endTime = startTime + 3600000; // ساعة واحدة بالمللي ثانية
    const now = Date.now();
    
    return Math.max(0, endTime - now);
  };
  
  // بدء التعدين
  const handleStartMining = async () => {
    if (!user) {
      showNotification('يرجى تسجيل الدخول أولاً', 'error');
      return;
    }
    
    if (miningActive) {
      showNotification('التعدين نشط بالفعل', 'warning');
      return;
    }
    
    if (todayMined >= dailyLimit) {
      showNotification('لقد وصلت إلى الحد اليومي للتعدين', 'warning');
      return;
    }
    
    try {
      const resultAction = await dispatch(startMining(user.id));
      
      if (startMining.fulfilled.match(resultAction)) {
        showNotification('تم بدء التعدين بنجاح', 'success');
      } else {
        showNotification(resultAction.payload?.message || 'فشل بدء التعدين', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء بدء التعدين', 'error');
    }
  };
  
  // جمع مكافأة التعدين
  const handleCollectReward = async () => {
    if (!user) {
      showNotification('يرجى تسجيل الدخول أولاً', 'error');
      return;
    }
    
    if (!miningActive) {
      showNotification('التعدين غير نشط', 'warning');
      return;
    }
    
    try {
      const resultAction = await dispatch(collectMiningReward(user.id));
      
      if (collectMiningReward.fulfilled.match(resultAction)) {
        showNotification(`تم جمع ${resultAction.payload.reward} SC بنجاح`, 'success');
      } else {
        showNotification(resultAction.payload?.message || 'فشل جمع المكافأة', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء جمع المكافأة', 'error');
    }
  };
  
  // شراء حزمة تعدين
  const handleBuyPackage = (pkg) => {
    setSelectedPackage(pkg);
    setShowPaymentModal(true);
  };
  
  // إنشاء طلب دفع
  const handleCreatePayment = async () => {
    if (!user || !selectedPackage) {
      showNotification('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
      return;
    }
    
    try {
      const resultAction = await dispatch(createPayment({
        userId: user.id,
        packageId: selectedPackage.id,
        amount: selectedPackage.price,
        description: `شراء حزمة تعدين: ${selectedPackage.name}`
      }));
      
      if (createPayment.fulfilled.match(resultAction)) {
        showNotification('تم إنشاء طلب الدفع بنجاح', 'success');
        
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
          showNotification('تم التحقق من الدفع بنجاح وتفعيل الحزمة', 'success');
          setShowPaymentModal(false);
          
          // تحديث بيانات التعدين
          dispatch(getMiningStatus(user.id));
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
            نظام التعدين
          </h1>
          
          {/* معلومات التعدين الحالية */}
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-primary mb-4">معلومات التعدين</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="card bg-gray-800">
                <div className="text-center">
                  <div className="text-gray-400 mb-1">معدل التعدين</div>
                  <div className="text-xl font-bold text-primary">
                    {loading ? '...' : `${miningRate} SC/ساعة`}
                  </div>
                </div>
              </div>
              
              <div className="card bg-gray-800">
                <div className="text-center">
                  <div className="text-gray-400 mb-1">الحد اليومي</div>
                  <div className="text-xl font-bold text-blue-500">
                    {loading ? '...' : `${dailyLimit} SC`}
                  </div>
                </div>
              </div>
              
              <div className="card bg-gray-800">
                <div className="text-center">
                  <div className="text-gray-400 mb-1">المعدن اليوم</div>
                  <div className="text-xl font-bold text-green-500">
                    {loading ? '...' : `${todayMined} SC`}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-300">التقدم اليومي</span>
                <span className="text-primary">{`${todayMined}/${dailyLimit} SC`}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-value" 
                  style={{ width: `${Math.min(miningPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
            
            {currentPackage && (
              <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-lg font-bold text-primary mb-2">الحزمة الحالية</h3>
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div>
                    <p className="text-gray-300">{currentPackage.name}</p>
                    <p className="text-gray-400 text-sm">{currentPackage.description}</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className="level-badge">{`معدل التعدين: ${currentPackage.miningRate} SC/ساعة`}</span>
                  </div>
                </div>
              </div>
            )}
            
            {miningActive ? (
              <div className="text-center">
                <p className="text-gray-300 mb-2">جاري التعدين...</p>
                <Countdown 
                  targetTime={new Date(lastMiningTime).getTime() + 3600000} 
                  onComplete={() => showNotification('اكتملت عملية التعدين! يمكنك جمع المكافأة الآن.', 'success')}
                />
                <button 
                  className="btn-primary mt-4"
                  onClick={handleCollectReward}
                  disabled={loading || getRemainingTime() > 0}
                >
                  {loading ? 'جاري التحميل...' : 'جمع المكافأة'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <MiningButton 
                  onClick={handleStartMining}
                  disabled={loading || todayMined >= dailyLimit}
                />
                <p className="text-gray-400 mt-2">
                  {todayMined >= dailyLimit 
                    ? 'لقد وصلت إلى الحد اليومي للتعدين' 
                    : 'انقر لبدء التعدين'}
                </p>
              </div>
            )}
          </div>
          
          {/* حزم التعدين */}
          <div className="card">
            <h2 className="text-xl font-bold text-primary mb-6">حزم التعدين</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {miningPackages && miningPackages.map(pkg => (
                <div key={pkg.id} className="store-card">
                  <div className="store-card-header">
                    <h3>{pkg.name}</h3>
                  </div>
                  <div className="store-card-body">
                    <p className="text-gray-300 mb-4">{pkg.description}</p>
                    <ul className="text-gray-400 mb-4">
                      <li className="flex items-center gap-2 mb-2">
                        <span className="text-primary">✓</span>
                        <span>{`معدل التعدين: ${pkg.miningRate} SC/ساعة`}</span>
                      </li>
                      <li className="flex items-center gap-2 mb-2">
                        <span className="text-primary">✓</span>
                        <span>{`الحد اليومي: ${pkg.dailyLimit} SC`}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        <span>{`المدة: ${pkg.duration} يوم`}</span>
                      </li>
                    </ul>
                    <div className="store-card-price">
                      {`${pkg.price} TON`}
                    </div>
                    <button 
                      className="btn-primary w-full"
                      onClick={() => handleBuyPackage(pkg)}
                      disabled={loading}
                    >
                      شراء الآن
                    </button>
                  </div>
                </div>
              ))}
              
              {(!miningPackages || miningPackages.length === 0) && (
                <p className="text-gray-400 col-span-3 text-center py-4">
                  {loading ? 'جاري تحميل الحزم...' : 'لا توجد حزم متاحة حالياً'}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* نافذة الدفع */}
      {showPaymentModal && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-primary">
            <h2 className="text-xl font-bold text-primary mb-4">تأكيد الشراء</h2>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-2">{`الحزمة: ${selectedPackage.name}`}</p>
              <p className="text-gray-300 mb-2">{`السعر: ${selectedPackage.price} TON`}</p>
              <p className="text-gray-300 mb-4">{`معدل التعدين: ${selectedPackage.miningRate} SC/ساعة`}</p>
              
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
              {!paymentUrl && (
                <button 
                  className="btn-primary"
                  onClick={handleCreatePayment}
                  disabled={loading}
                >
                  {loading ? 'جاري المعالجة...' : 'إنشاء طلب الدفع'}
                </button>
              )}
              
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

export default Mining;
