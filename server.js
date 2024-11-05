const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({path: "./config.env"});
const app = require('./app');

const db = process.env.DB;
// 어플레케이션을 데이터 베이스에 연결
mongoose
.connect(db)
.then(()=>{
    console.log("DB 연결 성공");
    })
    .catch((err) => {
        console.log(err);
    });

const port = process.env.PORT || 3000;

app.listen(port,()=>{
    console.log(`앱이 ${port}번 포트에서 실행중입니다.`);
})

