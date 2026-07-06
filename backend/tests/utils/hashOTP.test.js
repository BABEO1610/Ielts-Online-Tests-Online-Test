// hashOTP.test.js
const { hashOTP } = require('../../src/utils/password.util.js'); // Đã sửa đường dẫn chuẩn hướng về thư mục src

describe('Unit Testing cho hàm hashOTP - Method 2', () => {

    // =========================================================================
    // KIỂM THỬ HỘP TRẮNG / HỘP ĐEN: BẪY LỖI CÁC TRƯỜNG HỢP DỮ LIỆU RỖNG
    // =========================================================================

    test('TC02-01 - Path 1: otp là undefined phải ném ra lỗi hệ thống', () => {
        expect(() => {
            hashOTP(undefined);
        }).toThrow('OTP must be provided');
    });

    test('TC02-02 - Path 2: otp là null phải ném ra lỗi hệ thống', () => {
        expect(() => {
            hashOTP(null);
        }).toThrow('OTP must be provided');
    });

    test('TC02-03 - Path 3: otp là một chuỗi rỗng (\'\') phải ném ra lỗi hệ thống', () => {
        expect(() => {
            hashOTP('');
        }).toThrow('OTP must be provided');
    });

    // =========================================================================
    // KIỂM THỬ ĐỘ PHỦ ĐƯỜNG DẪN CƠ BẢN (BASIC PATH COVERAGE)
    // =========================================================================

    test('TC02-04 - Path 4: otp hợp lệ phải được mã hóa SHA-256 thành công và trả về mã Hex chuẩn', () => {
        const inputOTP = '123456';
        // Chuỗi băm SHA-256 chính xác của '123456' dạng Hexadecimal
        const expectedHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

        const result = hashOTP(inputOTP);

        expect(result).toBe(expectedHash); // So sánh khớp hoàn toàn dữ liệu đầu ra với mong đợi
    });
});