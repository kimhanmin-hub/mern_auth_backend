module.exports = (err,req,res,next)=>{
    console.log('에러 상세 정보:', {
        name: err.name,
        message: err.message,
        stack: err.stack
    });
    
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "에러";

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
};

