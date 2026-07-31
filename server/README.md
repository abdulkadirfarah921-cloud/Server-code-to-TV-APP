# TITAN PANEL — نظام إدارة اشتراكات احترافي

## نبذة
TITAN PANEL هو لوحة تحكم احترافية لإدارة اشتراكات تطبيق TITAN TV. داعم لـ Node.js + Express + MongoDB + React + Tailwind CSS.

## الأمان
- Hash قوي بـ bcrypt (12 rounds)
- JWT Tokens مع صلاحيات (ADMIN / MODERATOR / USER)
- تشفير AES-256 للبيانات الحساسة في MongoDB
- Rate Limiting على جميع الـ APIs
- Helmet + CORS محسن

## الحساب الافتراضي (عند التشغيل الأول)
قم بتحديث ملف `.env` ثم شغّل الأمر التالي لتوليد الحساب:

```bash
cd server
npm install
# عدّل .env بحسب رغبتك (مثال: ADMIN_USERNAME=SHADOWKING, ADMIN_PASSWORD=SHADOWKING_TV_FREEAPP-49578Y588bs538)
npm run setup:admin
```

## هيكل الميزات (10,000 ميزة — تم تغطية الأساسية + إطار التوسيع)

### A. إدارة المستخدمين
1. إنشاء يوزر + باس + تحديد عدد الأيام
2. تمديد الاشتراك / إيقاف / حذف
3. بحث باسم المستخدم
4. معرفة آخر دخول + نوع الجهاز
5. حظر جهاز معين
6. رسائل جماعية (إشعارات)
7. تصدير Excel لكل المستخدمين

### B. إدارة الأكواد
1. توليد دفعة (1000 كود) — عبر `POST /api/admin/codes/batch`
2. كل كود = 1 شهر / 3 شهور / سنة
3. الكود استخدام مرة واحدة فقط (`used`)
4. معرفة من استخدم الكود ومتى (`usedBy`, `usedAt`)

### C. إدارة السيرفر
1. إحصائيات لايف: متصلون في آخر 5 دقائق
2. مراقبة CPU / RAM (Memory Usage)
3. إعادة تشغيل السيرفر من اللوحة
4. سجل العمليات Log كامل
5. نسخ احتياطي تلقائي كل 24 ساعة (`node-cron`)

### D. إدارة المحتوى
1. إضافة / حذف قنوات مجانية (`/channels`)
2. ترتيب القنوات (`sortOrder`)
3. إضافة إعلانات داخل التطبيق (`adsEnabled`)
4. إرسال إشعار لكل المستخدمين (`/notifications`)

### E. الدفع والدعم
1. إطار ربط Google Play / Apple (`/support/contact` — قابل للتوسيع)
2. صفحة دعم واتساب: `+90 534 872 45 47`
3. نظام تذاكر دعم فني (`/tickets`)

### F. ميزات إضافية (إطار قابل للتوسيع)
- ثيمات للوحة (أسود / أحمر فاخر — موجود حالياً)
- API للمبرمجين (REST كامل)
- 2FA (ممكن إضافته عبر `speakeasy` في المستقبل)
- لغات متعددة (i18n — جاهز عبر `Cairo` / `Tajawal`)
- صلاحيات المشرفين (`MODERATOR`)
- تشفير قاعدة البيانات (AES)
- حماية من الهجمات (Rate Limit + Helmet)

## التقنية
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Frontend:** React 18 + Tailwind CSS (CDN)
- **Auth:** JWT + bcryptjs
- **DB Security:** AES-256-CBC للتشفير

## خطوات التشغيل

```bash
# 1. الملف الخلفي
cd server
npm install

# 2. إعداد قاعدة البيانات (تأكد من تشغيل MongoDB)
# Mongod يعمل افتراضياً على localhost:27017

# 3. إعداد .env
cp ../.env .env   # ثم عدّل القيم

# 4. تشغيل السيرفر
npm start

# (اختياري) تشغيل نسخ احتياطي كل 24 ساعة:
node scripts/backupCron.js

# 5. الملف الأمامي
cd ../client
npm install
npm run dev
```

## ملاحظات أمان مهمة
- لا تستخدم كلمات المرور الافتراضية في الإنتاج.
- غيّر `JWT_SECRET` و `DB_ENCRYPT_KEY` فوراً.
- استخدم MongoDB Atlas أو حمايته بـ IP Whitelist.
- قدّم HTTPS في الإنتاج.

## الملفات الرئيسية
- `server/server.js`: نقطة الدخول
- `server/routes/auth.js`: تسجيل الدخول + الأكواد
- `server/routes/admin.js`: جميع ميزات الأدمن
- `client/src/App.jsx`: لو Recommended مع كل الأقسام
- `.env`: الإعدادات الحساسة
