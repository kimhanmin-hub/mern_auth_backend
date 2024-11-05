class AppError extends Error {
    constructor(message, statusCode) {
        // super(message)는 부모 클래스(Error)의 생성자를 호출
        super(message)
        this.statusCode = statusCode;
        // 상태 코드가 4로 시작하면 "fail" (클라이언트 에러)
        // 5로 시작하면 "error" (서버 에러)로 설정
        this.status = `${statusCode}`.startsWith("4") ? "클라이언트 에러" : "서버 에러";
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;

