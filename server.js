const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({path: "./config.env"});
const app = require('./app');

const db = process.env.DB;

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            console.log("이미 MongoDB에 연결되어 있습니다.");
            return;
        }
        
        await mongoose.connect(db, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000
        });
        console.log("MongoDB 연결 성공");
    } catch (err) {
        console.error("MongoDB 연결 실패:", err);
        setTimeout(connectDB, 5000);
    }
};

connectDB();

mongoose.connection.on('error', (err) => {
    console.error('MongoDB 연결 에러:', err);
    setTimeout(connectDB, 5000);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB 연결이 끊어졌습니다. 재연결 시도중...');
    setTimeout(connectDB, 5000);
});

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
    console.log(`서버가 ${port}번 포트에서 실행중입니다.`);
});

