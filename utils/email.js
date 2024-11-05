const nodemailer = require("nodemailer");

const sendEmail = async (options) =>{
    //메일 전송 객체 생성
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth:{
            user:process.env.EMAIL_USER,
            pass:process.env.EMAIL_PASS,
        }
    });

    const mailOptions = {
        from : `'Onettus 사이트' <min2000144@gmail.com>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
    };
    //이메일 전송 실행
    await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
