const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // الحصول على التوكن من الهيدر
  const token = req.header('x-auth-token');

  // التحقق من وجود التوكن
  if (!token) {
    return res.status(401).json({ msg: 'لا يوجد توكن، تم رفض الوصول' });
  }

  try {
    // التحقق من صحة التوكن
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // إضافة بيانات المستخدم إلى الطلب
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'التوكن غير صالح' });
  }
};
