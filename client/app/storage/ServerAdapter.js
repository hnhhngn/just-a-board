const API_URL = 'http://localhost:2502/api/boards';

/**
 * Hàm hỗ trợ xử lý response lỗi chung
 */
async function fetchWithErr(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }
    return res;
}

/**
 * Lấy danh sách metadata các Board.
 */
export async function getIndex() {
    const res = await fetchWithErr(API_URL);
    return await res.json();
}

/**
 * Tạo Board mới.
 */
export async function create(name = 'Board mới') {
    const res = await fetchWithErr(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    return await res.json();
}

/**
 * Xóa Board theo ID.
 */
export async function remove(id) {
    await fetchWithErr(`${API_URL}/${id}`, {
        method: 'DELETE'
    });
}

/**
 * Lưu dữ liệu Board.
 */
export async function save(id, jsonString) {
    await fetchWithErr(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString // Gửi trực tiếp raw JSON string
    });
}

/**
 * Đọc dữ liệu Board.
 */
export async function load(id) {
    // Trả về dạng JSON string chứ chưa parse vì BoardSerializer lo parse
    const res = await fetchWithErr(`${API_URL}/${id}`);
    return await res.text();
}

/**
 * Đổi tên Board.
 */
export async function rename(id, newName) {
    await fetchWithErr(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
    });
}
