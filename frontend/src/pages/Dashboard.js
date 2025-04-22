import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getUserProfile } from '../features/auth/authSlice';
import { getBalance, getTransactions } from '../features/wallet/walletSlice';
import { getMiningStatus } from '../features/mining/miningSlice';
import { getReferralInfo } from '../features/referral/referralSlice';

// مكونات
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import MiningButton from '../components/MiningButton';
import Countdown from '../components/Countdown';
import TransactionList from '../components/TransactionList';

const Dashboard = ({ showNotification }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useDispatch();
  
  const { user } = useSelector(state => state.auth);
  const { balance, transactions } = useSelector(state => state.wallet);
  const { miningRate, lastMiningTime, dailyLimit, todayMined, miningActive } = useSelector(state => state.mining);
  const { totalReferrals, totalEarnings } = useSelector(state => state.referral);
  
  // محاكاة تحميل البيانات عند تحميل الصفحة
  React.useEffect(() => {
    if (user) {
      dispatch(getBalance(user.id));
      dispatch(getTransactions(user.id));
      dispatch(getMiningStatus(user.id));
      dispatch(getReferralInfo(user.id));
    } else {
      dispatch(getUserProfile());
    }
  }, [dispatch, user]);
  
  // حساب نسبة التعدين اليومي
  const miningPercentage = (todayMined / dailyLimit) * 100;
  
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-grow p-4">
        <div className="container mx-auto">
          {/* ترحيب */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-primary neon-text mb-2">
              مرحباً بك في سمارت كوين
            </h1>
            <p className="text-gray-300">
              المستقبل الذكي للعملات الرقمية
            </p>
          </div>
          
          {/* بطاقات الإحصائيات */}
          <div className="grid-dashboard mb-8">
            <StatCard
              title="رصيدك الحالي"
              value={`${balance} SC`}
              icon="wallet"
              color="primary"
              link="/wallet"
            />
            
            <StatCard
              title="معدل التعدين"
              value={`${miningRate} SC/ساعة`}
              icon="pickaxe"
              color="green"
              link="/mining"
            />
            
            <StatCard
              title="إجمالي الإحالات"
              value={totalReferrals}
              icon="users"
              color="blue"
              link="/referral"
            />
            
            <StatCard
              title="أرباح الإحالات"
              value={`${totalEarnings} SC`}
              icon="coins"
              color="yellow"
              link="/referral"
            />
          </div>
          
          {/* قسم التعدين */}
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-primary mb-4">التعدين اليومي</h2>
            
            <div className="mb-4">
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
            
            {miningActive ? (
              <div className="text-center">
                <p className="text-gray-300 mb-2">جاري التعدين...</p>
                <Countdown 
                  targetTime={new Date(lastMiningTime).getTime() + 3600000} 
                  onComplete={() => showNotification('اكتملت عملية التعدين! يمكنك جمع المكافأة الآن.', 'success')}
                />
                <button 
                  className="btn-primary mt-4"
                  onClick={() => {
                    // في التطبيق الحقيقي، سنستدعي collectMiningReward
                    showNotification('تم جمع مكافأة التعدين بنجاح!', 'success');
                  }}
                >
                  جمع المكافأة
                </button>
              </div>
            ) : (
              <div className="text-center">
                <MiningButton 
                  onClick={() => {
                    // في التطبيق الحقيقي، سنستدعي startMining
                    showNotification('تم بدء عملية التعدين بنجاح!', 'success');
                  }}
                />
                <p className="text-gray-400 mt-2">انقر لبدء التعدين</p>
              </div>
            )}
            
            <div className="mt-4 text-center">
              <Link to="/mining" className="text-primary hover:underline">
                عرض المزيد من خيارات التعدين
              </Link>
            </div>
          </div>
          
          {/* آخر المعاملات */}
          <div className="card">
            <h2 className="text-xl font-bold text-primary mb-4">آخر المعاملات</h2>
            
            {transactions && transactions.length > 0 ? (
              <TransactionList transactions={transactions.slice(0, 5)} />
            ) : (
              <p className="text-gray-400 text-center py-4">لا توجد معاملات حتى الآن</p>
            )}
            
            <div className="mt-4 text-center">
              <Link to="/wallet" className="text-primary hover:underline">
                عرض جميع المعاملات
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
