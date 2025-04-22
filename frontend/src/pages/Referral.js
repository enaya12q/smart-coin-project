import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getReferralInfo, getReferrals, generateReferralCode } from '../features/referral/referralSlice';

// مكونات
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';

const Referral = ({ showNotification }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const dispatch = useDispatch();
  
  const { user } = useSelector(state => state.auth);
  const { referralCode, referralLink, referrals, totalReferrals, totalEarnings, loading } = useSelector(state => state.referral);
  
  // تحميل بيانات الإحالة عند تحميل الصفحة
  useEffect(() => {
    if (user) {
      dispatch(getReferralInfo(user.id));
      dispatch(getReferrals(user.id));
    }
  }, [dispatch, user]);
  
  // إنشاء رمز إحالة جديد
  const handleGenerateReferralCode = async () => {
    if (!user) {
      showNotification('يرجى تسجيل الدخول أولاً', 'error');
      return;
    }
    
    try {
      const resultAction = await dispatch(generateReferralCode(user.id));
      
      if (generateReferralCode.fulfilled.match(resultAction)) {
        showNotification('تم إنشاء رمز إحالة جديد بنجاح', 'success');
      } else {
        showNotification(resultAction.payload?.message || 'فشل إنشاء رمز إحالة جديد', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء إنشاء رمز إحالة جديد', 'error');
    }
  };
  
  // نسخ رابط الإحالة إلى الحافظة
  const handleCopyReferralLink = () => {
    if (!referralLink) {
      showNotification('لا يوجد رابط إحالة للنسخ', 'error');
      return;
    }
    
    navigator.clipboard.writeText(referralLink)
      .then(() => {
        showNotification('تم نسخ رابط الإحالة بنجاح', 'success');
      })
      .catch(() => {
        showNotification('فشل نسخ رابط الإحالة', 'error');
      });
  };
  
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-grow p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-primary neon-text mb-6 text-center">
            نظام الإحالة
          </h1>
          
          {/* معلومات الإحالة */}
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-primary mb-6">معلومات الإحالة</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="card bg-gray-800">
                <div className="text-center">
                  <div className="text-gray-400 mb-1">إجمالي الإحالات</div>
                  <div className="text-3xl font-bold text-primary">
                    {loading ? '...' : totalReferrals}
                  </div>
                </div>
              </div>
              
              <div className="card bg-gray-800">
                <div className="text-center">
                  <div className="text-gray-400 mb-1">إجمالي الأرباح</div>
                  <div className="text-3xl font-bold text-green-500">
                    {loading ? '...' : `${totalEarnings} SC`}
                  </div>
                </div>
              </div>
            </div>
            
            {/* رمز الإحالة */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-300 mb-2">رمز الإحالة الخاص بك</h3>
              
              {referralCode ? (
                <div className="referral-code-container">
                  <div className="referral-code">{referralCode}</div>
                  <button 
                    className="btn-primary"
                    onClick={handleGenerateReferralCode}
                    disabled={loading}
                  >
                    تجديد
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-4">
                    {loading ? 'جاري التحميل...' : 'لا يوجد رمز إحالة حالياً'}
                  </p>
                  <button 
                    className="btn-primary"
                    onClick={handleGenerateReferralCode}
                    disabled={loading}
                  >
                    إنشاء رمز إحالة
                  </button>
                </div>
              )}
            </div>
            
            {/* رابط الإحالة */}
            {referralLink && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-300 mb-2">رابط الإحالة الخاص بك</h3>
                <div className="referral-link-container">
                  <div className="referral-link">{referralLink}</div>
                  <button 
                    className="copy-button"
                    onClick={handleCopyReferralLink}
                  >
                    نسخ
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  شارك هذا الرابط مع أصدقائك للحصول على مكافآت
                </p>
              </div>
            )}
            
            {/* مكافآت الإحالة */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-bold text-primary mb-4">مكافآت الإحالة</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-gray-300">احصل على 15 عملة Smart Coin لكل صديق يسجل باستخدام رابط الإحالة الخاص بك</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-gray-300">احصل على 5% من إجمالي تعدين أصدقائك</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-gray-300">احصل على 3% من مشتريات أصدقائك من المتجر</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* قائمة الإحالات */}
          <div className="card">
            <h2 className="text-xl font-bold text-primary mb-4">قائمة الإحالات</h2>
            
            {loading ? (
              <p className="text-center py-4">جاري تحميل الإحالات...</p>
            ) : referrals && referrals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-2 px-4 text-right">المستخدم</th>
                      <th className="py-2 px-4 text-right">تاريخ الانضمام</th>
                      <th className="py-2 px-4 text-right">الأرباح</th>
                      <th className="py-2 px-4 text-right">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map(referral => (
                      <tr key={referral.id} className="border-b border-gray-700">
                        <td className="py-3 px-4">{referral.username}</td>
                        <td className="py-3 px-4">{new Date(referral.joinDate).toLocaleDateString('ar-SA')}</td>
                        <td className="py-3 px-4">{`${referral.earnings} SC`}</td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${referral.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                            {referral.status === 'active' ? 'نشط' : 'غير نشط'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">لا توجد إحالات حتى الآن</p>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Referral;
