-- ============================================================
-- COD CRM — Seeder: Algeria's 69 Wilayas
-- ============================================================
-- Official numbering (01–58) + new wilayas (59–69)
-- 2019 administrative reform added wilayas 49–58
-- 2024 reform proposal added wilayas 59–69
-- Shipping zones: zone_1 (central), zone_2 (east/west), zone_3 (south)
-- ============================================================

INSERT INTO `wilayas` (`id`, `code`, `name`, `ar_name`, `shipping_zone`) VALUES
-- ── Original 48 Wilayas ──────────────────────────────────
(1,  '01', 'Adrar',             'أدرار',           'zone_3'),
(2,  '02', 'Chlef',             'الشلف',           'zone_2'),
(3,  '03', 'Laghouat',          'الأغواط',         'zone_3'),
(4,  '04', 'Oum El Bouaghi',    'أم البواقي',      'zone_2'),
(5,  '05', 'Batna',             'باتنة',           'zone_2'),
(6,  '06', 'Béjaïa',            'بجاية',           'zone_2'),
(7,  '07', 'Biskra',            'بسكرة',           'zone_2'),
(8,  '08', 'Béchar',            'بشار',            'zone_3'),
(9,  '09', 'Blida',             'البليدة',          'zone_1'),
(10, '10', 'Bouira',            'البويرة',          'zone_1'),
(11, '11', 'Tamanrasset',       'تمنراست',         'zone_3'),
(12, '12', 'Tébessa',           'تبسة',            'zone_2'),
(13, '13', 'Tlemcen',           'تلمسان',          'zone_2'),
(14, '14', 'Tiaret',            'تيارت',           'zone_2'),
(15, '15', 'Tizi Ouzou',        'تيزي وزو',        'zone_1'),
(16, '16', 'Alger',             'الجزائر',          'zone_1'),
(17, '17', 'Djelfa',            'الجلفة',           'zone_2'),
(18, '18', 'Jijel',             'جيجل',            'zone_2'),
(19, '19', 'Sétif',             'سطيف',            'zone_2'),
(20, '20', 'Saïda',             'سعيدة',           'zone_2'),
(21, '21', 'Skikda',            'سكيكدة',          'zone_2'),
(22, '22', 'Sidi Bel Abbès',    'سيدي بلعباس',     'zone_2'),
(23, '23', 'Annaba',            'عنابة',           'zone_2'),
(24, '24', 'Guelma',            'قالمة',           'zone_2'),
(25, '25', 'Constantine',       'قسنطينة',         'zone_2'),
(26, '26', 'Médéa',             'المدية',           'zone_1'),
(27, '27', 'Mostaganem',        'مستغانم',         'zone_2'),
(28, '28', "M'sila",            'المسيلة',          'zone_2'),
(29, '29', 'Mascara',           'معسكر',           'zone_2'),
(30, '30', 'Ouargla',           'ورقلة',           'zone_3'),
(31, '31', 'Oran',              'وهران',           'zone_2'),
(32, '32', 'El Bayadh',         'البيض',           'zone_3'),
(33, '33', 'Illizi',            'إليزي',           'zone_3'),
(34, '34', 'Bordj Bou Arréridj','برج بوعريريج',   'zone_2'),
(35, '35', 'Boumerdès',         'بومرداس',         'zone_1'),
(36, '36', 'El Tarf',           'الطارف',           'zone_2'),
(37, '37', 'Tindouf',           'تندوف',           'zone_3'),
(38, '38', 'Tissemsilt',        'تيسمسيلت',        'zone_2'),
(39, '39', 'El Oued',           'الوادي',           'zone_3'),
(40, '40', 'Khenchela',         'خنشلة',           'zone_2'),
(41, '41', 'Souk Ahras',        'سوق أهراس',       'zone_2'),
(42, '42', 'Tipaza',            'تيبازة',           'zone_1'),
(43, '43', 'Mila',              'ميلة',            'zone_2'),
(44, '44', 'Aïn Defla',         'عين الدفلى',       'zone_1'),
(45, '45', 'Naâma',             'النعامة',          'zone_3'),
(46, '46', 'Aïn Témouchent',    'عين تموشنت',      'zone_2'),
(47, '47', 'Ghardaïa',          'غرداية',          'zone_3'),
(48, '48', 'Relizane',          'غليزان',          'zone_2'),

-- ── 2019 Wilayas (49–58) ─────────────────────────────────
(49, '49', 'El M''Ghair',       'المغير',           'zone_3'),
(50, '50', 'El Meniaa',         'المنيعة',          'zone_3'),
(51, '51', 'Ouled Djellal',     'أولاد جلال',       'zone_3'),
(52, '52', 'Bordj Baji Mokhtar','برج باجي مختار',  'zone_3'),
(53, '53', 'Béni Abbès',        'بني عباس',        'zone_3'),
(54, '54', 'Timimoun',          'تيميمون',         'zone_3'),
(55, '55', 'Touggourt',         'تقرت',            'zone_3'),
(56, '56', 'Djanet',            'جانت',            'zone_3'),
(57, '57', 'In Salah',          'عين صالح',        'zone_3'),
(58, '58', 'In Guezzam',        'عين قزام',        'zone_3'),

-- ── New Wilayas (59–69) ──────────────────────────────────
(59, '59', 'El Meghaier',       'المقيّر',          'zone_3'),
(60, '60', 'Hassi Messaoud',    'حاسي مسعود',      'zone_3'),
(61, '61', 'Bou Saâda',         'بوسعادة',         'zone_2'),
(62, '62', 'Aflou',             'أفلو',            'zone_3'),
(63, '63', 'Barika',            'بريكة',           'zone_2'),
(64, '64', 'El Menéa',          'المنيعة الجديدة',  'zone_3'),
(65, '65', 'Reggane',           'رقان',            'zone_3'),
(66, '66', 'Aïn Oussera',       'عين وسارة',       'zone_2'),
(67, '67', 'Touggourt Sud',     'تقرت الجنوبية',    'zone_3'),
(68, '68', 'Metlili',           'متليلي',          'zone_3'),
(69, '69', 'Beni Ounif',        'بني ونيف',        'zone_3')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `ar_name` = VALUES(`ar_name`);
