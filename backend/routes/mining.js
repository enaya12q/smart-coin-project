const express = require('express');
const router = express.Router();

// مسار تعدين العملات
router.post('/mine', async (req, res) => {
  try {
    const { telegramId } = req.body;
    
    // سيتم تنفيذ منطق التعدين لاحقاً
    // التحقق من وقت آخر عملية تعدين للمستخدم
    
    // للاختبار، نفترض أن المستخدم يمكنه التعدين
    const canMine = true;
    
    if (canMine) {
      res.json({ 
        success: true, 
        message: 'تم التعدين بنجاح',
        reward: process.env.MINE_REWARD,
        newBalance: 125 // قيمة مؤقتة للاختبار
      });
    } else {
      res.json({ 
        success: false, 
        message: 'لا يمكنك التعدين الآن، يجب الانتظار',
        remainingTime: 12 // قيمة مؤقتة للاختبار
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// مسار الحصول على إحصائيات التعدين
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // سيتم تنفيذ منطق الحصول على إحصائيات التعدين لاحقاً
    
    res.json({ 
      success: true, 
      stats: {
        totalMined: 250,
        lastMiningTime: new Date(),
        miningRate: 25,
        miningLevel: 1
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

module.exports = router;
