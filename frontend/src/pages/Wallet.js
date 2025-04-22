import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getBalance, getTransactions, getWithdrawalStatus } from '../features/wallet/walletSlice';

// مكونات
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import TransactionList from '../components/TransactionList';
import WithdrawalCountdown from '../components/WithdrawalCountdown';

const Wallet = ({ showNotification }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  
  const dispatch = useDispatch();
  
  const { user } = useSelector(state => state.auth);
  const { balance, transactions, canWithdraw, withdrawalStatus, loading } = useSelector(state => state.wallet);
  
  // تحميل بيانات المحفظة عند تحميل الصفحة
  useEffect(() => {
    if (user) {
      dispatch(getBalance());
      dispatch(getTransactions());
      dispatch(getWithdrawalStatus());
    }
  }, [dispatch, user]);
  
  // تحويل عملات
  const handleTransfer = async (e) => {
    e.preventDefault();
    
    if (!transferAmount || !transferRecipient) {
      showNotification('يرجى إدخال المبلغ واسم المستخدم المستلم', 'error');
      return;
    }
    
    if (parseFloat(transferAmount) <= 0) {
      showNotification('يجب أن يكون المبلغ أكبر من صفر', 'error');
      return;
    }
    
    try {
      const resultAction = await dispatch(transferFunds({
        recipient: transferRecipient,
        amount: parseFloat(transferAmount),
        description: transferDescription
      }));
      
      if (transferFunds.fulfilled.match(resultAction)) {
        showNotification('تم التحويل بنجاح', 'success');
        setTransferAmount('');
        setTransferRecipient('');
        setTransferDescription('');
        
        // تحديث الرصيد والمعاملات
        dispatch(getBalance());
        dispatch(getTransactions());
      } else {
        showNotification(resultAction.payload?.msg || 'فشل التحويل', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء التحويل', 'error');
    }
  };
  
  // طلب سحب
  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    if (!withdrawAmount || !withdrawAddress) {
      showNotification('يرجى إدخال المبلغ وعنوان المحفظة', 'error');
      return;
    }
    
    if (parseFloat(withdrawAmount) <= 0) {
      showNotification('يجب أن يكون المبلغ أكبر من صفر', 'error');
      return;
    }
    
    try {
      const resultAction = await dispatch(withdrawFunds({
        amount: parseFloat(withdrawAmount),
        walletAddress: withdrawAddress
      }));
      
      if (withdrawFunds.fulfilled.match(resultAction)) {
        showNotification('تم إرسال طلب السحب بنجاح وسيتم مراجعته', 'success');
        setWithdrawAmount('');
        setWithdrawAddress('');
        
        // تحديث الرصيد والمعاملات
        dispatch(getBalance());
        dispatch(getTransactions());
      } else {
        showNotification(resultAction.payload?.msg || 'فشل طلب السحب', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء طلب السحب', 'error');
    }
  };
  
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-grow p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-primary neon-text mb-6 text-center">
            المحفظة
          </h1>
          
          {/* بطاقة الرصيد */}
          <div className="card mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-primary mb-2">رصيدك الحالي</h2>
                <p className="text-3xl font-bold text-white">
                  {loading ? '...' : `${balance} SC`}
                </p>
              </div>
              
              {/* مؤقت السحب */}
              {withdrawalStatus && !canWithdraw && (
                <div className="mt-4 md:mt-0">
                  <WithdrawalCountdown withdrawalStatus={withdrawalStatus} />
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* نموذج التحويل */}
            <div className="card">
              <h2 className="text-xl font-bold text-primary mb-4">تحويل العملات</h2>
              
              <form onSubmit={handleTransfer}>
                <div className="mb-4">
                  <label htmlFor="transferRecipient" className="block text-gray-300 mb-2">اسم المستخدم المستلم</label>
                  <input
                    type="text"
                    id="transferRecipient"
                    className="input-field"
                    placeholder="أدخل اسم المستخدم المستلم"
                    value={transferRecipient}
                    onChange={(e) => setTransferRecipient(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="transferAmount" className="block text-gray-300 mb-2">المبلغ</label>
                  <input
                    type="number"
                    id="transferAmount"
                    className="input-field"
                    placeholder="أدخل المبلغ"
                    min="1"
                    step="0.01"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="transferDescription" className="block text-gray-300 mb-2">الوصف (اختياري)</label>
                  <input
                    type="text"
                    id="transferDescription"
                    className="input-field"
                    placeholder="أدخل وصفاً للتحويل"
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                  />
                </div>
                
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={loading}
                >
                  {loading ? 'جاري التحويل...' : 'تحويل'}
                </button>
              </form>
            </div>
            
            {/* نموذج السحب */}
            <div className="card">
              <h2 className="text-xl font-bold text-primary mb-4">سحب العملات</h2>
              
              {!canWithdraw ? (
                <div className="text-center py-4">
                  <p className="text-yellow-500 mb-4">
                    لا يمكن السحب قبل مرور 40 يوم من تاريخ التسجيل
                  </p>
                  
                  <WithdrawalCountdown withdrawalStatus={withdrawalStatus} showTitle={false} />
                  
                  <p className="text-gray-400 mt-4">
                    يرجى الانتظار حتى انتهاء المدة المحددة لتتمكن من سحب عملاتك
                  </p>
                </div>
              ) : (
                <form onSubmit={handleWithdraw}>
                  <div className="mb-4">
                    <label htmlFor="withdrawAmount" className="block text-gray-300 mb-2">المبلغ</label>
                    <input
                      type="number"
                      id="withdrawAmount"
                      className="input-field"
                      placeholder="أدخل المبلغ"
                      min="10"
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      required
                    />
                    <p className="text-gray-400 text-sm mt-1">الحد الأدنى للسحب هو 10 عملات</p>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="withdrawAddress" className="block text-gray-300 mb-2">عنوان المحفظة</label>
                    <input
                      type="text"
                      id="withdrawAddress"
                      className="input-field"
                      placeholder="أدخل عنوان محفظة TON"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={loading}
                  >
                    {loading ? 'جاري إرسال الطلب...' : 'طلب سحب'}
                  </button>
                </form>
              )}
            </div>
          </div>
          
          {/* قائمة المعاملات */}
          <div className="card">
            <h2 className="text-xl font-bold text-primary mb-4">المعاملات الأخيرة</h2>
            
            <TransactionList transactions={transactions} loading={loading} />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Wallet;
