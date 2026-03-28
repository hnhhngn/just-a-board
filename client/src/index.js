import { bootstrap } from './app.js';

bootstrap().catch((err) => {
  console.error("Lỗi khi khởi chạy ứng dụng:", err);
});
