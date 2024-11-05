const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
    username: {
        type: String,
        required: [true, "아이디를 입력하세요."],
        trim: true,
        minlength: 3,
        maxlength: 30,
        index: true,
    },
    email: {
        type: String,
        required: [true, "이메일을 입력하세요."],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, "유효한 이메일을 입력하세요."]
    },
    password: {
        type: String,
        required: [true, "비밀번호를 입력하세요."],
        minlength: 8,
        select: false,
    },
    //비밀번호 확인
    passwordConfirm: {
        type: String,
        required: [true, " 입력하신 비밀번호가 맞는지 확인하세요."],
        validate: {
            validator: function (el) {
                return el === this.password;
            },
            message: "비밀번호가 일치하지 않습니다."
        },
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    otp: {
        type: String,
        default: null,
    },
    //otp 만료 시간
    otpExpires: {
        type: Date,
        default: null,
    },

    //비밀번호 재설정
    resetPasswordOTP :{
        type: String,
        default: null,
    },
    //비밀번호 재설정 OTP 만료 시간
    resetPasswordOTPExpires:{
        type: Date,
        default: null,
    },
    //계정 생성 시간
    createdAt: {
        type: Date,
        default: Date.now,
    },
},
{
    //생성 및 수정 시간 자동 추가
    timestamps: true,
});

// 미들웨어: 데이터가 저장되기 전에 실행되는 함수
userSchema.pre('save', async function (next){
    // 비밀번호가 수정되지 않았다면 다음 미들웨어로 넘어감
    if(!this.isModified('password')) return next()
        // 비밀번호를 bcrypt를 사용하여 해시화(암호화)
        this.password = await bcrypt.hash(this.password, 12);
        // 비밀번호 확인 필드를 제거 (보안상 해시된 비밀번호만 저장)
        this.passwordConfirm = undefined;
        next();
});

// 인스턴스 메서드: 비밀번호 확인을 위한 메서드
userSchema.methods.correctPassword = async function (password, userPassword){
    // 입력된 비밀번호와 저장된 해시 비밀번호를 비교
    // password: 사용자가 입력한 평문 비밀번호
    // userPassword: DB에 저장된 해시화된 비밀번호
    return await bcrypt.compare(password, userPassword);
};

const User = mongoose.model("User", userSchema);
module.exports = User;


