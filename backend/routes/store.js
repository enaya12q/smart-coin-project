const express = require('express');
const router = express.Router();

// تاريخ انتهاء فترة القفل (48 يوم من الآن)
const LOCK_END_DATE = new Date();
LOCK_END_DATE.setDate(LOCK_END_DATE.getDate() + 48);

// التحقق مما إذا كانت فترة القفل لا تزال سارية
const isLockActive = () => {
  const now = new Date();
  return now < LOCK_END_DATE;
};

// التحقق مما إذا كان العنصر هو حزمة تعدين (مستثناة من القفل)
const isMiningPackage = (itemId) => {
  return ['basic', 'medium', 'premium'].includes(itemId);
};

// مسار الحصول على الحزم المتاحة
router.get('/packages', async (req, res) => {
  try {
    // سيتم تنفيذ منطق الحصول على الحزم المتاحة لاحقاً
    
    res.json({ 
      success: true, 
      packages: [
        {
          id: 'basic',
          name: 'الحزمة الأساسية',
          price: 0.339,
          description: 'حزمة أساسية لزيادة معدل التعدين',
          benefits: ['زيادة معدل التعدين بنسبة 10%', 'إمكانية التعدين مرتين يومياً']
        },
        {
          id: 'medium',
          name: 'الحزمة المتوسطة',
          price: 1.014,
          description: 'حزمة متوسطة لزيادة معدل التعدين',
          benefits: ['زيادة معدل التعدين بنسبة 25%', 'إمكانية التعدين 3 مرات يومياً']
        },
        {
          id: 'premium',
          name: 'الحزمة المتميزة',
          price: 1.69,
          description: 'حزمة متميزة لزيادة معدل التعدين',
          benefits: ['زيادة معدل التعدين بنسبة 50%', 'إمكانية التعدين 5 مرات يومياً']
        },
        {
          id: 'coin_pack',
          name: 'حزمة 3000 عملة',
          price: 3.0,
          description: 'احصل على 3000 عملة سمارت كوين مقابل 3 دولار',
          benefits: ['3000 عملة سمارت كوين', 'إضافة فورية إلى محفظتك']
        }
      ]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// مسار الحصول على البطاقات المتاحة
router.get('/cards', async (req, res) => {
  try {
    // التحقق مما إذا كانت فترة القفل لا تزال سارية
    const locked = isLockActive();
    
    // قائمة البطاقات
    const cards = [
      {
        id: 'google_play',
        name: 'بطاقة Google Play',
        price: 100,
        currency: 'Smart Coin',
        image: '/images/store/gift_card.png',
        locked: locked
      },
      {
        id: 'steam',
        name: 'بطاقة Steam',
        price: 150,
        currency: 'Smart Coin',
        image: '/images/store/gift_card.png',
        locked: locked
      },
      {
        id: 'amazon',
        name: 'بطاقة Amazon',
        price: 200,
        currency: 'Smart Coin',
        image: '/images/store/gift_card.png',
        locked: locked
      },
      {
        id: 'vip_membership',
        name: 'عضوية VIP',
        price: 500,
        currency: 'Smart Coin',
        image: '/images/store/vip_membership.png',
        locked: locked
      },
      {
        id: 'special_offer',
        name: 'عرض خاص',
        price: 300,
        currency: 'Smart Coin',
        image: '/images/store/special_offer.png',
        locked: locked
      }
    ];
    
    // إضافة معلومات عن تاريخ انتهاء القفل إذا كان نشطًا
    const response = { 
      success: true, 
      cards: cards
    };
    
    if (locked) {
      response.lockInfo = {
        active: true,
        endDate: LOCK_END_DATE.toISOString(),
        message: 'عذراً، الشراء غير متاح حالياً. سيتم إعادة فتح المتجر بعد 48 يوم.'
      };
    }
    
    res.json(response);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// مسار شراء حزمة
router.post('/purchase/package', async (req, res) => {
  try {
    const { userId, packageId, paymentMethod } = req.body;
    
    // التحقق مما إذا كانت فترة القفل لا تزال سارية وليست حزمة تعدين
    if (isLockActive() && !isMiningPackage(packageId) && packageId !== 'coin_pack') {
      return res.status(403).json({
        success: false,
        message: 'عذراً، الشراء غير متاح حالياً. سيتم إعادة فتح المتجر بعد 48 يوم.',
        lockEndDate: LOCK_END_DATE.toISOString()
      });
    }
    
    // سيتم تنفيذ منطق شراء الحزمة لاحقاً
    
    res.json({ 
      success: true, 
      message: 'تم شراء الحزمة بنجاح',
      orderId: 'order_123',
      packageDetails: {
        id: packageId,
        name: 'اسم الحزمة',
        price: 1.014
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

// مسار شراء بطاقة
router.post('/purchase/card', async (req, res) => {
  try {
    const { userId, cardId } = req.body;
    
    // التحقق مما إذا كانت فترة القفل لا تزال سارية
    if (isLockActive()) {
      return res.status(403).json({
        success: false,
        message: 'عذراً، الشراء غير متاح حالياً. سيتم إعادة فتح المتجر بعد 48 يوم.',
        lockEndDate: LOCK_END_DATE.toISOString()
      });
    }
    
    // سيتم تنفيذ منطق شراء البطاقة لاحقاً
    
    res.json({ 
      success: true, 
      message: 'تم شراء البطاقة بنجاح',
      orderId: 'order_456',
      cardDetails: {
        id: cardId,
        name: 'اسم البطاقة',
        code: 'XXXX-XXXX-XXXX-XXXX'
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('خطأ في الخادم');
  }
});

module.exports = router;
