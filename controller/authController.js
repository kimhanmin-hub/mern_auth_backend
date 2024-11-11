const User = require("../model/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/email");
const generateOTP = require("../utils/generateOTP");
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');


// JWT 토큰 생성
const signToken = (id) => {
    return jwt.sign({ id },
        process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN, // 토큰 만료 시간
    });
}

// 토큰 생성 후 쿠키로 보냄
const createSendToken = (user, statusCode, res, message) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: true, // HTTPS 필수
        sameSite: 'none', // cross-site 쿠키 허용
        domain: '.vercel.app' // Vercel 도메인
    };
    // 쿠키에 토큰 저장
    res.cookie("token", token, cookieOptions);
    
    //정보 숨기기
    user.password = undefined;
    user.passwordConfirm = undefined;
    user.otp = undefined;

    res.status(statusCode).json({
        status: "success",
        message,
        token,
        data:{
            user,
        }
    });
};
//회원 가입 처리 함수
exports.signup = catchAsync(async (req, res, next) => {
    try {
        const { email, password, passwordConfirm, username } = req.body;
        console.log('회원가입 요청 데이터:', { email, username });

        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.error('MongoDB 연결 상태:', mongoose.connection.readyState);
            return next(new AppError('데이터베이스 연결 오류', 500));
        }

        const existingUser = await User.findOne({ email }).maxTimeMS(5000);
        if (existingUser) {
            return next(new AppError("이미 존재하는 이메일입니다.", 400));
        }

        const otp = generateOTP();
        console.log('생성된 OTP:', otp);

        const newUser = await User.create({
            username,
            email,
            password,
            passwordConfirm,
            otp,
            otpExpires: Date.now() + 24 * 60 * 60 * 1000
        });

        await sendEmail({
            email: newUser.email,
            subject: "회원 가입 인증 메일",
            html: `<h1>인증번호는 ${otp}입니다.</h1>`
        });

        createSendToken(newUser, 200, res, "회원 가입 성공");
    } catch (error) {
        console.error('회원가입 처리 중 에러:', error);
        return next(new AppError(error.message || "회원가입 처리 중 오류가 발생했습니다.", 500));
    }
});

exports.verifyAccount = catchAsync(async (req, res, next) => {
    const { otp } = req.body;

    if(!otp){
        return next(new AppError("otp번호가 일치하지 않습니다.", 400));
    }

    const user = req.user;

    if(user.otp !== otp){
        return next(new AppError('인증번호가 일치하지 않습니다.', 400));
    }

    if(Date.now() > user.otpExpires){
        return next(new AppError('인증 시간이 만료되었습니다.', 400));
    }


    //데이터 정리(Clean up): OTP 인증이 완료된 후에는 더 이상 해당 OTP와 만료 시간이 필요하지 않습니다. 이미 사용된 OTP 정보를 데이터베이스에 계속 보관하는 것은 불필요합니다.
    //보안: 한 번 사용된 OTP는 즉시 제거하는 것이 보안상 좋은 관행입니다. 만약 OTP 정보가 남아있다면, 데이터베이스가 노출되었을 때 이전에 사용된 OTP 정보가 유출될 수 있습니다.
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save({validateBeforeSave:false})

    createSendToken(user, 200, res, "이메일 인증 완료");
    
});

exports.resendOTP = catchAsync(async (req, res, next) => {
    const {email} = req.user;
        
    if(!email){
        return next(new AppError('이메일이 존재하지 않습니다.', 400));
    }

    const user = await User.findOne({email});
    if(!user){
        return next(new AppError('존재하지 않는 아이디입니다. 회원가입을 해주세요', 404));
    }

    if(user.isVerified){
        return next(new AppError('이미 존재하는 계정입니다.', 400));
    }

    const newOtp = generateOTP();
    user.otp = newOtp;
    user.otpExpires = Date.now() + 24 * 60 * 60 * 1000;


    await user.save({validateBeforeSave:false});

    try{
        await sendEmail({
            email: user.email,
            subject: "인증번호 재전송",
            html: `<h1>인증번호는 ${newOtp}입니다.</h1>`
        });

        res.status(200).json({
            status:'success',
            message:'인증번호 재전송 완료',
        });
    }catch(error){
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({validateBeforeSave:false});
        return next(new AppError('이메일 전송에 실패하였습니다. 다시 시도해주세요', 500));
    }
});

// 로그인 처리 함수
exports.login = catchAsync(async (req, res, next) => {
    // 요청 본문에서 이메일과 비밀번호 추출
    const {email, password} = req.body;
 
    // 이메일이나 비밀번호가 없으면 에러
    if(!email || !password){
     return next(new AppError('이메일과 비밀번호를 입력해주세요.', 400));
    }
    // 이메일로 사용자 찾기 (+password는 기본적으로 숨겨진 password 필드를 가져오라는 의미)
    const user = await User.findOne({email}).select('+password');
 
    // 사용자가 없거나 비밀번호가 일치하지 않으면 에러
    // correctPassword는 userModel에 정의된 비밀번호 확인 메서드
    if(!user || !(await user.correctPassword(password, user.password))){
     return next(new AppError('이메일 또는 비밀번호가 일치하지 않습니다.', 401));
    }
 
    // 로그인 성공시 JWT 토큰 생성하고 쿠키에 저장
    createSendToken(user, 200, res, "로그인 성공");
 });
 
 // 로그아웃 처리 함수
 exports.logout = catchAsync(async (req, res, next) => {
     // 쿠키에 저장된 토큰을 무효화
     // 만료시간을 10초로 설정하고 'logout'이라는 의미없는 값으로 덮어씌움
     res.cookie('token', 'logout', {
         expires: new Date(Date.now() + 10 * 1000), // 10초 후 만료
         httpOnly: true, // JavaScript에서 쿠키 접근 불가
         secure: process.env.NODE_ENV === 'production', // HTTPS에서만 작동
     });
 
     // 로그아웃 성공 응답
     res.status(200).json({
         status: 'success',
         message: '로그아웃 성공',
     });
 });

 exports.forgetPassword = catchAsync(async (req, res, next) => {
    const {email} = req.body;
    const user = await User.findOne({email});

    if(!user){
        return next(new AppError('존재하지 않는 사용자입니다.', 404));
    }

    const otp = generateOTP();

    //OTP 생성
    user.resetPasswordOTP=otp;
    user.resetPasswordOTPExpires=Date.now() + 300000; //5분

    await user.save({validateBeforeSave:false});

    try{
        await sendEmail({
            email: user.email,
            subject: '비밀번호 재설정 인증 메일(5분간 유효합니다.)',
            html: `<h1>재인증번호는 ${otp}입니다.</h1>`
        });

        res.status(200).json({
            status: 'success',
            message: '인증번호 전송 완료',
        })

    }catch(error){
        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpires = undefined;
        await user.save({validateBeforeSave:false});

        return next(new AppError('이메일 전송에 실패하였습니다. 다시 시도해주세요.', 500));
    }
 });

exports.resetPassword = catchAsync(async (req, res, next) => {
    const {email, otp, password, passwordConfirm} = req.body;

    const user = await User.findOne({
        email,
        resetPasswordOTP:otp,
        resetPasswordOTPExpires:{$gt:Date.now()},
    });

    if(!user) return next(new AppError('유효하지 않은 인증번호이거나 인증 시간이 만료되었습니다.', 404));

    user.password = password;
    user.passwordConfirm = passwordConfirm;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;

    await user.save({validateBeforeSave:false});

    createSendToken(user, 200, res, '비밀번호 재설정이 완료되었습니다.');
});

