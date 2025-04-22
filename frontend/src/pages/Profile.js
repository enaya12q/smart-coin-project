import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUserProfile, updateUserProfile } from '../features/auth/authSlice';

// مكونات
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';

const Profile = ({ showNotification }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  
  const dispatch = useDispatch();
  
  const { user, loading } = useSelector(state => state.auth);
  
  // تحميل بيانات المستخدم عند تحميل الصفحة
  useEffect(() => {
    dispatch(getUserProfile());
  }, [dispatch]);
  
  // تحديث البيانات المحلية عند تغير بيانات المستخدم
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setTelegramUsername(user.telegramUsername || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);
  
  // تحديث الملف الشخصي
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!username) {
      showNotification('يرجى إدخال اسم المستخدم', 'error');
      return;
    }
    
    try {
      const resultAction = await dispatch(updateUserProfile({
        userId: user.id,
        username,
        email,
        telegramUsername,
        avatar
      }));
      
      if (updateUserProfile.fulfilled.match(resultAction)) {
        showNotification('تم تحديث الملف الشخصي بنجاح', 'success');
        setEditMode(false);
      } else {
        showNotification(resultAction.payload?.message || 'فشل تحديث الملف الشخصي', 'error');
      }
    } catch (error) {
      showNotification('حدث خطأ أثناء تحديث الملف الشخصي', 'error');
    }
  };
  
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-grow p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-primary neon-text mb-6 text-center">
            الملف الشخصي
          </h1>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">جاري تحميل البيانات...</p>
            </div>
          ) : (
            <div className="card">
              <div className="flex flex-col md:flex-row gap-8">
                {/* صورة الملف الشخصي */}
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden mb-4">
                    {avatar ? (
                      <img src={avatar} alt="الصورة الشخصية" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-primary">
                        {username ? username.charAt(0).toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                  
                  {editMode && (
                    <div className="w-full">
                      <label htmlFor="avatar" className="block text-gray-300 mb-2">رابط الصورة الشخصية</label>
                      <input
                        type="text"
                        id="avatar"
                        className="input-field"
                        placeholder="أدخل رابط الصورة"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                
                {/* معلومات الملف الشخصي */}
                <div className="flex-grow">
                  {editMode ? (
                    <form onSubmit={handleUpdateProfile}>
                      <div className="mb-4">
                        <label htmlFor="username" className="block text-gray-300 mb-2">اسم المستخدم</label>
                        <input
                          type="text"
                          id="username"
                          className="input-field"
                          placeholder="أدخل اسم المستخدم"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="email" className="block text-gray-300 mb-2">البريد الإلكتروني</label>
                        <input
                          type="email"
                          id="email"
                          className="input-field"
                          placeholder="أدخل البريد الإلكتروني"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      
                      <div className="mb-6">
                        <label htmlFor="telegramUsername" className="block text-gray-300 mb-2">اسم المستخدم في تيليجرام</label>
                        <input
                          type="text"
                          id="telegramUsername"
                          className="input-field"
                          placeholder="أدخل اسم المستخدم في تيليجرام"
                          value={telegramUsername}
                          onChange={(e) => setTelegramUsername(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={loading}
                        >
                          {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </button>
                        
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setEditMode(false)}
                        >
                          إلغاء
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-primary mb-4">معلومات المستخدم</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-400 mb-1">اسم المستخدم</p>
                            <p className="text-gray-200">{username || 'غير محدد'}</p>
                          </div>
                          
                          <div>
                            <p className="text-gray-400 mb-1">البريد الإلكتروني</p>
                            <p className="text-gray-200">{email || 'غير محدد'}</p>
                          </div>
                          
                          <div>
                            <p className="text-gray-400 mb-1">اسم المستخدم في تيليجرام</p>
                            <p className="text-gray-200">{telegramUsername || 'غير محدد'}</p>
                          </div>
                          
                          <div>
                            <p className="text-gray-400 mb-1">معرف المستخدم</p>
                            <p className="text-gray-200">{user?.id || 'غير محدد'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-primary mb-4">الإحصائيات</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="card bg-gray-800">
                            <div className="text-center">
                              <div className="text-gray-400 mb-1">تاريخ الانضمام</div>
                              <div className="text-gray-200">
                                {user?.joinDate ? new Date(user.joinDate).toLocaleDateString('ar-SA') : 'غير محدد'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="card bg-gray-800">
                            <div className="text-center">
                              <div className="text-gray-400 mb-1">المستوى</div>
                              <div className="text-primary font-bold">
                                {user?.level || 1}
                              </div>
                            </div>
                          </div>
                          
                          <div className="card bg-gray-800">
                            <div className="text-center">
                              <div className="text-gray-400 mb-1">الحالة</div>
                              <div className="text-green-500 font-bold">
                                {user?.status === 'active' ? 'نشط' : 'غير نشط'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        className="btn-primary"
                        onClick={() => setEditMode(true)}
                      >
                        تعديل الملف الشخصي
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Profile;
