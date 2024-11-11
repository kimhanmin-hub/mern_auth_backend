module.exports = (err,req,res,next)=>{
    console.log('에러 발생 시간:', new Date().toISOString());
    console.log('요청 URL:', req.originalUrl);
    console.log('에러 상세 정보:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
        status: err.status
    });
    
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "에러";

    // MongoDB 연결 관련 에러 특별 처리
    if (err.name === 'MongooseServerSelectionError' || 
        err.name === 'MongooseError' || 
        err.name === 'MongoError' ||
        err.name === 'MongoNetworkError') {
        console.error('MongoDB 상세 에러:', {
            name: err.name,
            message: err.message,
            code: err.code,
            stack: err.stack
        });
        err.message = '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.';
        err.statusCode = 500;
    }

    // 이메일 전송 관련 에러 처리 추가
    if (err.message && err.message.includes('email')) {
        err.message = '이메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.';
        err.statusCode = 500;
    }

    // 개발 환경에서만 상세 에러 정보 전송
    const errorResponse = {
        status: err.status,
        message: err.message,
        error: process.env.NODE_ENV === 'development' ? {
            stack: err.stack,
            name: err.name,
            code: err.code
        } : {}
    };

    res.status(err.statusCode).json(errorResponse);
};

