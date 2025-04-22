import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createTONWallet, getTONWalletInfo, linkExternalWallet, createPaymentLink } from '../features/wallet/tonSlice';

// مكونات
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import WithdrawalCountdown from '../components/WithdrawalCountdown';

const TONWallet = ({ showNotification }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [externalAddress, setExternalAddress] = useState('');
  const [walletType, setWalletType] = useState('tonkeeper');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentComment, setPaymentComment] = useState('');
  const [seedPhraseVisible, setSeedPhraseVisible] = useState(false);
  
  const dispatch = useDispatch();
  
  const { user } = useSelector(state => state.auth);
  const { tonWallet, seedPhrase, qrCode, paymentQrCode, paymentLink, loading } = useSelector(state => state.ton);
  const { withdrawalStatus } = useSelector(state => state.wallet);
  
  // تحميل معلومات المحفظة عند تحميل الصفحة
  useEffect(() => {
    if (user) {
      dispatch(getTONWalletInfo());
    }
  }, [dispatch, user]);
  
  // إنشاء محفظة TON جديدة
  const handleCreateWallet = async () => {
    try {
      const resultAction = await dispatch(createTONWallet());
      
      if (createTONWallet.fulfilled.match(resultAction)) {
        showNotification('تم إنشاء المحفظة بنجاح. احتفظ بالكلمات الاسترجاعية في مكان آمن.', 'success');
      } else {
        showNotification(resultAction.payload?.msg || 'فشل إنشاء المحفظة', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء إنشاء المحفظة', 'error');
    }
  };
  
  // ربط محفظة خارجية
  const handleLinkExternalWallet = async (e) => {
    e.preventDefault();
    
    if (!externalAddress) {
      showNotification('يرجى إدخال عنوان المحفظة', 'error');
      return;
    }
    
    try {
      const resultAction = await dispatch(linkExternalWallet({
        address: externalAddress,
        walletType
      }));
      
      if (linkExternalWallet.fulfilled.match(resultAction)) {
        showNotification('تم ربط المحفظة الخارجية بنجاح', 'success');
        setExternalAddress('');
      } else {
        showNotification(resultAction.payload?.msg || 'فشل ربط المحفظة الخارجية', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء ربط المحفظة الخارجية', 'error');
    }
  };
  
  // إنشاء رابط دفع
  const handleCreatePaymentLink = async (e) => {
    e.preventDefault();
    
    if (!paymentAmount) {
      showNotification('يرجى إدخال المبلغ', 'error');
      return;
    }
    
    try {
      const resultAction = await dispatch(createPaymentLink({
        amount: parseFloat(paymentAmount),
        comment: paymentComment
      }));
      
      if (createPaymentLink.fulfilled.match(resultAction)) {
        showNotification('تم إنشاء رابط الدفع بنجاح', 'success');
      } else {
        showNotification(resultAction.payload?.msg || 'فشل إنشاء رابط الدفع', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء إنشاء رابط الدفع', 'error');
    }
  };
  
  // نسخ النص إلى الحافظة
  const copyToClipboard = (text, message) => {
    navigator.clipboard.writeText(text).then(() => {
      showNotification(message, 'success');
    }).catch(() => {
      showNotification('فشل نسخ النص', 'error');
    });
  };
  
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-grow p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-primary neon-text mb-6 text-center">
            محفظة TON
          </h1>
          
          {!tonWallet ? (
            // إنشاء محفظة جديدة
            <div className="card mb-8">
              <h2 className="text-xl font-bold text-primary mb-4">إنشاء محفظة TON جديدة</h2>
              
              <p className="text-gray-300 mb-4">
                قم بإنشاء محفظة TON جديدة لإرسال واستقبال العملات الرقمية. سيتم إنشاء مفاتيح خاصة وعامة لمحفظتك.
              </p>
              
              <button
                className="btn-primary w-full"
                onClick={handleCreateWallet}
                disabled={loading}
              >
                {loading ? 'جاري إنشاء المحفظة...' : 'إنشاء محفظة TON'}
              </button>
            </div>
          ) : (
            // عرض معلومات المحفظة
            <>
              {/* بطاقة معلومات المحفظة */}
              <div className="card mb-8">
                <div className="flex flex-col md:flex-row items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-primary mb-2">محفظة TON الخاصة بك</h2>
                    <p className="text-3xl font-bold text-white mb-2">
                      {loading ? '...' : `${tonWallet.balance} TON`}
                    </p>
                    <p className="text-sm text-gray-400">
                      آخر تحديث: {new Date(tonWallet.lastBalanceUpdate).toLocaleString()}
                    </p>
                  </div>
                  
                  {/* مؤقت السحب */}
                  {withdrawalStatus && !withdrawalStatus.canWithdraw && (
                    <div className="mt-4 md:mt-0">
                      <WithdrawalCountdown withdrawalStatus={withdrawalStatus} />
                    </div>
                  )}
                </div>
                
                <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                  <div className="flex flex-col md:flex-row items-center justify-between">
                    <div>
                      <p className="text-gray-300 mb-2">عنوان المحفظة:</p>
                      <div className="flex items-center">
                        <p className="text-sm text-gray-400 mr-2 truncate max-w-xs">
                          {tonWallet.address}
                        </p>
                        <button
                          className="btn-icon"
                          onClick={() => copyToClipboard(tonWallet.address, 'تم نسخ عنوان المحفظة')}
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                      </div>
                    </div>
                    
                    {qrCode && (
                      <div className="mt-4 md:mt-0">
                        <img src={qrCode} alt="رمز QR لعنوان المحفظة" className="w-24 h-24" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* عرض الكلمات الاسترجاعية إذا كانت متاحة */}
                {seedPhrase && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-yellow-500">الكلمات الاسترجاعية (احتفظ بها في مكان آمن)</h3>
                      <button
                        className="btn-sm"
                        onClick={() => setSeedPhraseVisible(!seedPhraseVisible)}
                      >
                        {seedPhraseVisible ? 'إخفاء' : 'إظهار'}
                      </button>
                    </div>
                    
                    {seedPhraseVisible && (
                      <div className="p-4 bg-gray-800 rounded-lg">
                        <div className="grid grid-cols-3 gap-2">
                          {seedPhrase.map((word, index) => (
                            <div key={index} className="text-sm text-gray-300">
                              <span className="text-gray-500">{index + 1}.</span> {word}
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button
                            className="btn-sm"
                            onClick={() => copyToClipboard(seedPhrase.join(' '), 'تم نسخ الكلمات الاسترجاعية')}
                          >
                            نسخ الكلمات
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-red-500 text-sm mt-2">
                      تحذير: لن يتم عرض هذه الكلمات مرة أخرى. احتفظ بها في مكان آمن لاستعادة محفظتك في المستقبل.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* ربط محفظة خارجية */}
                <div className="card">
                  <h2 className="text-xl font-bold text-primary mb-4">ربط محفظة TON خارجية</h2>
                  
                  {tonWallet.externalWalletLinked ? (
                    <div>
                      <p className="text-green-500 mb-2">تم ربط محفظة خارجية</p>
                      <p className="text-gray-300 mb-2">النوع: {tonWallet.externalWalletType}</p>
                      <p className="text-gray-300 mb-4">العنوان: {tonWallet.externalWalletAddress}</p>
                      
                      <button
                        className="btn-secondary w-full"
                        onClick={() => dispatch(unlinkExternalWallet())}
                        disabled={loading}
                      >
                        إلغاء ربط المحفظة
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleLinkExternalWallet}>
                      <div className="mb-4">
                        <label htmlFor="externalAddress" className="block text-gray-300 mb-2">عنوان المحفظة</label>
                        <input
                          type="text"
                          id="externalAddress"
                          className="input-field"
                          placeholder="أدخل عنوان محفظة TON"
                          value={externalAddress}
                          onChange={(e) => setExternalAddress(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="walletType" className="block text-gray-300 mb-2">نوع المحفظة</label>
                        <select
                          id="walletType"
                          className="input-field"
                          value={walletType}
                          onChange={(e) => setWalletType(e.target.value)}
                        >
                          <option value="tonkeeper">Tonkeeper</option>
                          <option value="tonhub">Tonhub</option>
                          <option value="other">أخرى</option>
                        </select>
                      </div>
                      
                      <button
                        type="submit"
                        className="btn-primary w-full"
                        disabled={loading}
                      >
                        {loading ? 'جاري الربط...' : 'ربط المحفظة'}
                      </button>
                    </form>
                  )}
                </div>
                
                {/* إنشاء رابط دفع */}
                <div className="card">
                  <h2 className="text-xl font-bold text-primary mb-4">إنشاء رابط دفع</h2>
                  
                  <form onSubmit={handleCreatePaymentLink}>
                    <div className="mb-4">
                      <label htmlFor="paymentAmount" className="block text-gray-300 mb-2">المبلغ (TON)</label>
                      <input
                        type="number"
                        id="paymentAmount"
                        className="input-field"
                        placeholder="أدخل المبلغ"
                        min="0.01"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="paymentComment" className="block text-gray-300 mb-2">التعليق (اختياري)</label>
                      <input
                        type="text"
                        id="paymentComment"
                        className="input-field"
                        placeholder="أدخل تعليقًا للدفع"
                        value={paymentComment}
                        onChange={(e) => setPaymentComment(e.target.value)}
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="btn-primary w-full"
                      disabled={loading}
                    >
                      {loading ? 'جاري الإنشاء...' : 'إنشاء رابط دفع'}
                    </button>
                  </form>
                  
                  {paymentLink && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                      <p className="text-gray-300 mb-2">رابط الدفع:</p>
                      <div className="flex items-center">
                        <p className="text-sm text-gray-400 mr-2 truncate max-w-xs">
                          {paymentLink}
                        </p>
                        <button
                          className="btn-icon"
                          onClick={() => copyToClipboard(paymentLink, 'تم نسخ رابط الدفع')}
                        >
                          <i className="fas fa-copy"></i>
                        </button>
                      </div>
                      
                      {paymentQrCode && (
                        <div className="mt-4 flex justify-center">
                          <img src={paymentQrCode} alt="رمز QR لرابط الدفع" className="w-32 h-32" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TONWallet;
