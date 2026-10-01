const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hero_slides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag TEXT,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  gradient TEXT,
  btn1_text TEXT,
  btn1_target TEXT,
  btn2_text TEXT,
  btn2_target TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'news', -- 'news' | 'event' | 'pr'
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  emoji TEXT DEFAULT '📰',
  image TEXT,
  date TEXT NOT NULL,
  location TEXT,
  featured INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_key TEXT NOT NULL, -- 'lead' | 'nbd' | 'uih' | 'nitx'
  name TEXT NOT NULL,
  role TEXT,
  description TEXT,
  photo TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// Migration: branches & branch_members (for older DBs)
try {
  db.exec('CREATE TABLE IF NOT EXISTS branches (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL DEFAULT \'bag\', name TEXT NOT NULL, description TEXT, image TEXT, sort_order INTEGER DEFAULT 0)');
  db.exec('CREATE TABLE IF NOT EXISTS branch_members (id INTEGER PRIMARY KEY AUTOINCREMENT, branch_id INTEGER NOT NULL, name TEXT NOT NULL, role TEXT, description TEXT, photo TEXT, date TEXT, sort_order INTEGER DEFAULT 0)');
} catch(e) {}

// Migration: add `description` column to members table if it doesn't exist yet
// (for databases created before this field was introduced)
const memberCols = db.prepare("PRAGMA table_info(members)").all().map(c => c.name);
if (!memberCols.includes('description')) {
  db.exec('ALTER TABLE members ADD COLUMN description TEXT');
}

// Seed default admin user if none exists
const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admin_users').get().c;
if (adminCount === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  console.log('Created default admin user -> username: admin / password: admin123 (please change it!)');
}

// Seed default content if empty
const newsCount = db.prepare('SELECT COUNT(*) AS c FROM news').get().c;
if (newsCount === 0) {
  const insertNews = db.prepare(`INSERT INTO news (type,title,summary,emoji,date,location,featured,sort_order)
    VALUES (?,?,?,?,?,?,?,?)`);
  insertNews.run('news', '2028 оны боловсролын салбарын эрс шинэчлэлт, хөгжлийн бодлого төлөвлөлтөд хамтарч ажиллана', '', '📢', '2026-02-23', null, 1, 1);
  insertNews.run('news', 'Ардчиллын үнэт зүйлийг түгээн дэлгэрүүлэх "Democracy tour" эхэллээ', '', '🌐', '2026-02-23', null, 0, 2);
  insertNews.run('news', 'Намд элсэж буй бизнес эрхлэгчдийн төлөөллийг хүлээн авч "Ардчиллын гэрэгэ"-ийг гардууллаа', '', '🤝', '2026-02-02', null, 0, 3);
  insertNews.run('event', 'Ардчилсан нам гишүүд, дэмжигчидтэй харилцах төвтэй боллоо', '', '📍', '2025-09-27', 'Улаанбаатар', 0, 1);
  insertNews.run('event', 'Ардчилсан намын даргын сонгуульд нэр дэвшигчид тодорлоо', '', '📍', '2025-08-30', 'Улаанбаатар', 0, 2);
  insertNews.run('pr', 'Ардчилсан намын тусгай мэдэгдэл: Хууль бусын томилгооны талаар', '', '📣', '2026-02-01', null, 0, 1);
}

const memberCount = db.prepare('SELECT COUNT(*) AS c FROM members').get().c;
if (memberCount === 0) {
  const insertM = db.prepare(`INSERT INTO members (group_key,name,role,description,sort_order) VALUES (?,?,?,?,?)`);
  insertM.run('lead', 'О.Цогтгэрэл', 'Намын дарга', 'Ардчилсан намын дарга. Олон жил төрийн болон хувийн хэвшилд удирдах ажил хийсэн туршлагатай.', 1);
  insertM.run('lead', 'Н.Ганибал', 'Ерөнхий НБД', 'Намын ерөнхий нарийн бичгийн дарга. Намын өдөр тутмын үйл ажиллагааг удирдан зохион байгуулдаг.', 2);
  insertM.run('uih', 'О.Цогтгэрэл', 'Монгол Улсын Их Хурлын гишүүн, УИХ дахь АН-ын бүлгийн дарга', '', 1);
  insertM.run('uih', 'Ж.Батсуурь', 'Монгол Улсын Их Хурлын гишүүн, УБХ-ны дарга', '', 2);
  insertM.run('uih', 'С.Одонтуяа', 'Монгол Улсын Их Хурлын гишүүн, УИХ-ын Дэд дарга', '', 3);
  insertM.run('uih', 'Н.Алтанхуяг', 'Монгол Улсын Их Хурлын гишүүн', '', 4);
  insertM.run('nitx', 'Б.Батзаяа', 'НИТХ-ын төлөөлөгч', '', 1);
}

const heroCount = db.prepare('SELECT COUNT(*) AS c FROM hero_slides').get().c;
if (heroCount === 0) {
  const insertH = db.prepare(`INSERT INTO hero_slides (tag,title,description,gradient,btn1_text,btn1_target,btn2_text,btn2_target,sort_order)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  insertH.run('Сүүлийн мэдээ', 'О.Цогтгэрэл: Хөдөлмөрлөсөн иргэдээ дэмждэг төрийг бий болгоно',
    'Халамжаар угждаг төрийн оронд иргэдийн хөдөлмөр, санаачлагыг дэмждэг, шударга ёст нийгэм байгуулна.',
    'linear-gradient(150deg,#0c2754 0%,#15428a 55%,#1554a3 100%)', 'Дэлгэрэнгүй', 'news', '', '', 1);
  insertH.run('Шагнал', 'Ардчилсан намын дээд шагнал "Их Эзэн Чингис хаан" одонгоор Н.Алтанхуяг шагнагдлаа',
    'Намын хөгжилд оруулсан онцгой хувь нэмрийг нь үнэлэн дээд шагнал гардуулав.',
    'linear-gradient(150deg,#1a0a30 0%,#3a1a5c 55%,#5b2d8a 100%)', '', '', '', '', 2);
  insertH.run('Democracy Tour', 'Ардчиллын үнэт зүйлийг түгээн дэлгэрүүлэх "Democracy Tour" эхэллээ',
    'Орон даяар иргэдтэй шууд уулзаж, ардчиллын үнэт зүйлсийг дэлгэрүүлэх аяллыг эхлүүллээ.',
    'linear-gradient(150deg,#06331f 0%,#0b5c38 55%,#138a55 100%)', '', '', '', '', 3);
}

// Seed default org branches if none exist
const orgCount = db.prepare("SELECT COUNT(*) AS c FROM branches WHERE type = 'org'").get().c;
if (orgCount === 0) {
  const insertB = db.prepare('INSERT INTO branches (type,name,description,sort_order) VALUES (?,?,?,?)');
  insertB.run('org', 'Дорнод аймгийн ардчилсан ахмадын холбоо', 'Судалгаа, сургалт, хөгжлийн байгууллага', 1);
  insertB.run('org', 'Дорнод аймгийн ардчилсан эмэгтэйчүүдийн холбоо', 'Судалгаа, сургалт, хөгжлийн байгууллага', 2);
  insertB.run('org', 'Дорнод аймгийн ардчилсан залуучуудын холбоо', 'Эмэгтэйчүүдийн эрхийг хамгаалах байгууллага', 3);
  insertB.run('org', 'Дорнод аймгийн ардчилсан оюутны холбоо', 'Залуу үеийн хөгжлийг дэмжих байгууллага', 4);
}

module.exports = db;
