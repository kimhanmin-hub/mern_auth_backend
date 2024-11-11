const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const globalErrorHandler = require("./controller/errorController");
const userRouter = require("./routes/userRouters");
const AppError = require("./utils/appError");

const app = express();

app.use(cookieParser());

app.use(
    cors({
    origin: [
        "http://localhost:3000",
        "https://mern-auth-frontend-phi.vercel.app/",
    ],
    credentials: true,
})
);

app.use(express.json({limit: "10kb"}));
 
app.use('/api/v1/users',userRouter);


// 사용자 api url
app.all('*',(req,res,next)=>{
    next(new AppError(`${req.originalUrl} 라우터가 존재하지 않습니다.`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
