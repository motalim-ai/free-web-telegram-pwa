-- Demo store so the app has something to show on first run. Safe to run twice.
-- The AI replaces this file with demo data that matches the user's own idea.
-- Pictures come from public/demo (drawn by scripts/demo-art.py); replace them from the dashboard.
INSERT OR IGNORE INTO settings (id, name, tagline, logo_key, color, currency, delivery_fee, free_shipping_over, announcement, whatsapp, transfer_info, is_open)
VALUES (1, 'بيت البن', 'محمصة مختصة، نحمّص طلبك كل أسبوع', '/brand/mark.svg', '#0f5c4d', 'ر.س', 25, 199,
        'توصيل لجميع مدن المملكة، والشحن مجاني للطلبات فوق 199 ر.س', '',
        'تحويل بنكي إلى مصرف الراجحي
الآيبان: SA00 0000 0000 0000 0000 0000
باسم: مؤسسة بيت البن (غيّر هذه البيانات من الإعدادات)', 1);

INSERT OR IGNORE INTO categories (id, name, image_key, sort) VALUES
  (1, 'قهوة مختصة', '/demo/cat-beans.svg', 0),
  (2, 'القهوة السعودية', '/demo/cat-saudi.svg', 1),
  (3, 'أدوات التحضير', '/demo/cat-tools.svg', 2),
  (4, 'بكجات وهدايا', '/demo/cat-gifts.svg', 3);

INSERT OR IGNORE INTO products (id, category_id, name, description, price, old_price, images, available, sort) VALUES
  (1, 1, 'إثيوبي يرغاتشيفي 250 جم', 'نكهة الياسمين والليمون مع حلاوة العسل. تحميص فاتح، مناسب للـ V60 والكيمكس.', 79, NULL, '["/demo/bag-ethiopia.svg"]', 1, 0),
  (2, 1, 'كولومبي هويلا 250 جم', 'شوكولاتة وكراميل مع حموضة هادئة. تحميص متوسط يناسب كل طرق التحضير.', 69, NULL, '["/demo/bag-colombia.svg"]', 1, 1),
  (3, 1, 'برازيلي سانتوس 250 جم', 'بندق وكاكاو بقوام ثقيل. ممتاز مع الحليب.', 55, 65, '["/demo/bag-brazil.svg"]', 1, 2),
  (4, 1, 'خلطة الإسبريسو 1 كجم', 'خلطة برازيلي وإثيوبي لكوب متوازن بكريما كثيفة. الأوفر للمقاهي والمنازل.', 149, 175, '["/demo/bag-espresso.svg"]', 1, 3),
  (5, 2, 'قهوة سعودية شقراء بالهيل 500 جم', 'تحميص أشقر مع هيل وزعفران، مطحونة وجاهزة للدلة.', 59, NULL, '["/demo/bag-saudi.svg"]', 1, 4),
  (6, 2, 'بن خولاني 250 جم', 'بن خولاني من جبال جازان، تحميص متوسط بطعم فواكه مجففة.', 85, NULL, '["/demo/bag-khawlani.svg"]', 1, 5),
  (7, 2, 'دلة قهوة سعودية', 'دلة نحاسية بلون ذهبي، سعة 1 لتر.', 129, NULL, '["/demo/dallah.svg"]', 1, 6),
  (8, 3, 'قمع V60 سيراميك', 'قمع تقطير سيراميك يحافظ على حرارة القهوة أثناء الاستخلاص.', 89, NULL, '["/demo/v60.svg"]', 1, 7),
  (9, 3, 'فلاتر V60 (100 ورقة)', 'فلاتر ورقية بيضاء مقاس 02.', 25, NULL, '["/demo/filters.svg"]', 1, 8),
  (10, 3, 'مطحنة يدوية', 'تروس فولاذية بـ 24 درجة طحن، من الإسبريسو إلى الفرنش برس.', 299, NULL, '["/demo/grinder.svg"]', 0, 9),
  (11, 4, 'بكج التذوق (3 أكياس 100 جم)', 'إثيوبي وكولومبي وبرازيلي في علبة هدية، لتجرب الفرق بين المناطق.', 199, 230, '["/demo/bundle-tasting.svg"]', 1, 10);

INSERT OR IGNORE INTO banners (id, image_key, title, subtitle, button_text, link, sort) VALUES
  (1, '/demo/banner-roast.svg', 'تحميص هذا الأسبوع', 'إثيوبي يرغاتشيفي بنكهة الياسمين والليمون', 'اطلبه الآن', '/p/1', 0),
  (2, '/demo/banner-saudi.svg', 'قهوتك السعودية كل صباح', 'شقراء بالهيل والزعفران، جاهزة للدلة', 'تسوّق القهوة السعودية', '/c/2', 1),
  (3, '/demo/banner-gift.svg', 'بكج التذوق بخصم 13%', 'ثلاثة أكياس مختارة في علبة هدية', 'اكتشف البكج', '/p/11', 2);
