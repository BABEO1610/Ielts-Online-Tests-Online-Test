import api from './api';

const BASE = '/library';

/**
 * Lấy danh sách tài liệu (có thể filter category)
 * @param {string} [category] - 'All' hoặc tên category cụ thể
 */
export async function fetchLibraryResources(paramsOrCategory) {
  let params = {};
  if (typeof paramsOrCategory === 'object' && paramsOrCategory !== null) {
    params = { ...paramsOrCategory };
  } else if (paramsOrCategory && paramsOrCategory !== 'All') {
    params.category = paramsOrCategory;
  }
  const res = await api.get(BASE, { params });
  return res.data; // { success, data, error, meta }
}

/**
 * Lấy danh sách tài liệu với nhiều tham số (search, resource_type, category)
 * Phục vụ cho giao diện học viên (ContentLibraryPage)
 */
export async function getLibraryResources(params = {}) {
  const query = {};
  if (params.category && params.category !== 'All') query.category = params.category;
  if (params.search) query.search = params.search;
  if (params.resource_type) query.resource_type = params.resource_type;
  
  const res = await api.get(BASE, { params: query });
  return res.data;
}

/**
 * Lấy chi tiết một tài liệu
 * @param {string} id - UUID
 */
export async function fetchLibraryResourceById(id) {
  const res = await api.get(`${BASE}/${id}`);
  return res.data;
}

/**
 * Tạo tài liệu mới — gửi multipart/form-data
 * @param {{ title: string, description?: string, category?: string }} fields
 * @param {File} file - file object từ input
 */
export async function createLibraryResource(fields, file) {
  const formData = new FormData();
  formData.append('title', fields.title);
  if (fields.description) formData.append('description', fields.description);
  if (fields.category) formData.append('category', fields.category);
  if (file) formData.append('file', file);

  const res = await api.post(BASE, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Cập nhật metadata tài liệu (và file nếu có)
 * @param {string} id
 * @param {{ title: string, description?: string, category?: string }} fields
 * @param {File} [file] - file object từ input (optional)
 */
export async function updateLibraryResource(id, fields, file) {
  const formData = new FormData();
  if (fields.title) formData.append('title', fields.title);
  if (fields.description) formData.append('description', fields.description);
  if (fields.category) formData.append('category', fields.category);
  if (file) formData.append('file', file);

  const res = await api.put(`${BASE}/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/**
 * Xóa tài liệu
 * @param {string} id
 */
export async function deleteLibraryResource(id) {
  const res = await api.delete(`${BASE}/${id}`);
  return res.data;
}
