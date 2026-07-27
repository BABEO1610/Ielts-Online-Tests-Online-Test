/**
 * ==========================================
 * UTILS: TRÍCH XUẤT TÊN NGƯỜI DÙNG (User Resolver)
 * ==========================================
 * Nhiệm vụ: Đọc Database hoặc Token để tìm ra tên gọi (Tên hiển thị) của người dùng hiện tại,
 * giúp chatbot có thể gọi tên người dùng một cách thân thiện (ví dụ: Chào Nam!).
 */
const { pool } = require('../../db/pool');

const MAX_DISPLAY_NAME_LENGTH = 40;

const PROFILE_SOURCES = [
  { table: 'profiles', fields: ['preferred_name', 'display_name', 'full_name', 'username'] },
  { table: 'users', fields: ['preferred_name', 'display_name', 'full_name', 'username'] },
  { table: 'students', fields: ['preferred_name', 'display_name', 'full_name', 'username'] },
  { table: 'tutors', fields: ['preferred_name', 'display_name', 'full_name', 'username'] },
  { table: 'admins', fields: ['preferred_name', 'display_name', 'full_name', 'username'] },
];

// Kết quả mặc định trả về nếu không tìm thấy tên (gọi chung là "bạn")
const emptyResult = (reason = 'missing_user') => ({
  displayName: 'bạn',
  fullName: null,
  source: null,
  fallbackUsed: true,
  fallbackReason: reason,
  dbError: null,
});

// Làm sạch tên: Xóa các thẻ HTML < >, loại bỏ khoảng trắng thừa, chặn lấy địa chỉ email làm tên
const cleanName = (value) => {
  const text = String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (!text || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return null;
  return text;
};

// Giới hạn độ dài tên không quá 40 ký tự
const limitName = (value) => value.length > MAX_DISPLAY_NAME_LENGTH
  ? value.slice(0, MAX_DISPLAY_NAME_LENGTH).trim()
  : value;

// Chuyển đổi tên đầy đủ (Nguyễn Văn Nam) thành tên gọi ngắn (Nam)
const toDisplayName = (fullName) => {
  const parts = fullName.split(' ').filter(Boolean);
  return limitName(parts.length > 1 ? parts[parts.length - 1] : fullName);
};

// Đóng gói đối tượng chứa tên để trả về
const buildNameResult = ({ fullName, source }) => ({
  displayName: toDisplayName(fullName),
  fullName: limitName(fullName),
  source,
  fallbackUsed: false,
  fallbackReason: null,
  dbError: null,
});

// Lấy ID người dùng từ JWT
const getUserId = (user = {}) => user?.id || user?.sub || null;

// Lấy Metadata từ Supabase/JWT
const getMetadata = (user = {}) => user?.user_metadata || user?.userMetadata || {};

// Truy vấn lấy danh sách các cột trong một bảng DB
const readColumns = async (table) => {
  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return new Set(result.rows.map((row) => row.column_name));
};

// Truy vấn DB lấy tên người dùng từ các bảng profile/users
const readProfileName = async ({ table, fields, userId }) => {
  const columns = await readColumns(table);
  if (!columns.has('id')) return null;
  const selected = fields.filter((field) => columns.has(field));
  if (!selected.length) return null;

  const result = await pool.query(
    `SELECT ${selected.map((field) => `"${field}"`).join(', ')}
     FROM "${table}"
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return null;
  const field = selected.find((name) => cleanName(row[name]));
  return field ? { value: cleanName(row[field]), source: `${table}.${field}` } : null;
};

// Nếu DB không có, thử tìm tên trong Metadata của JWT Token
const resolveMetadataName = (user = {}) => {
  const metadata = getMetadata(user);
  const candidates = [
    ['auth.user_metadata.full_name', metadata.full_name],
    ['auth.user_metadata.name', metadata.name],
    ['username', user.username || metadata.username],
  ];
  const match = candidates.find(([, value]) => cleanName(value));
  return match ? { value: cleanName(match[1]), source: match[0] } : null;
};

// Hàm chính: Gom tất cả lại, dò tìm trong DB trước, DB thất bại thì dò trong Token
const resolveUserDisplayName = async (user) => {
  const userId = getUserId(user);
  if (!userId) return emptyResult('missing_user');

  try {
    for (const source of PROFILE_SOURCES) {
      const profileName = await readProfileName({ ...source, userId });
      if (profileName) return buildNameResult({ fullName: profileName.value, source: profileName.source });
    }
  } catch (error) {
    return { ...emptyResult('db_error'), dbError: { code: error.code || null, message: error.message || null } };
  }

  const metadataName = resolveMetadataName(user);
  if (metadataName) return buildNameResult({ fullName: metadataName.value, source: metadataName.source });
  return emptyResult('no_valid_name');
};

module.exports = {
  resolveUserDisplayName,
  cleanName,
};
