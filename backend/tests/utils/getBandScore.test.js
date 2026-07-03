// getBandScore.test.js
const { getBandScore } = require('../../src/utils/scoring.js'); // Đường dẫn tới file chứa hàm của bạn

describe('Unit Testing cho hàm getBandScore - Method 1', () => {

    // =========================================================================
    // KIỂM THỬ HỘP TRẮNG / HỘP ĐEN (BẪY LỖI GIÁ TRỊ BIÊN)
    // =========================================================================

    test('TC01 - Path 1: rawScore nhỏ hơn giới hạn dưới (< 0) phải ném ra lỗi', () => {
        expect(() => {
            getBandScore('listening', -1);
        }).toThrow('Raw score must be between 0 and 40');
    });

    test('TC02 - Path 2: rawScore vượt quá giới hạn trên (> 40) phải ném ra lỗi', () => {
        expect(() => {
            getBandScore('reading', 45);
        }).toThrow('Raw score must be between 0 and 40');
    });

    // =========================================================================
    // KIỂM THỬ ĐỘ PHỦ ĐƯỜNG DẪN CƠ BẢN (BASIC PATH COVERAGE)
    // =========================================================================

    test('TC03 - Path 3: Luồng xử lý hợp lệ cho kỹ năng listening', () => {
        // Giả sử hàm calculateListeningBand trả về giá trị band score tương ứng
        const result = getBandScore('listening', 30);
        expect(result).toBeDefined(); // Đảm bảo hàm có tính toán và trả về kết quả
    });

    test('TC04 - Path 4: Luồng xử lý hợp lệ cho kỹ năng reading', () => {
        const result = getBandScore('reading', 30);
        expect(result).toBeDefined();
    });

    test('TC05 - Path 5: Luồng xử lý hợp lệ cho kỹ năng khác (writing/speaking)', () => {
        const result = getBandScore('writing', 30);
        expect(result).toBe(0.0); // Khớp chuẩn xác với giá trị return 0.0 trong code logic
    });
});