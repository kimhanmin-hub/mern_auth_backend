const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({path: "./config.env"});
const app = require('./app');

const db = process.env.DB;

mongoose.connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
})
.then(() => {
    console.log("MongoDB 연결 성공");
})
.catch((err) => {
    console.error("MongoDB 연결 실패:", err);
    process.exit(1);
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB 연결 에러:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB 연결이 끊어졌습니다. 재연결 시도중...');
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`서버가 ${port}번 포트에서 실행중입니다.`);
});

