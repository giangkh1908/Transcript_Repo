/**
 * Dữ liệu mẫu của luồng. Số liệu ở đây là DỮ LIỆU MẪU của dự án demo, không
 * phải hằng số của sản phẩm — nối backend thì thay bằng API, kiểu dữ liệu
 * giữ nguyên (xem src/types.ts).
 */
import { S } from './copy';
import type { Project, ProjectRun, RiskyItem } from './types';

export const demoProjects: Project[] = [
  {
    id: 'website-ban-hang',
    name: 'Website bán hàng',
    statusLabel: 'Cần bạn xem 12 chỗ',
    tone: 'warn',
    stage: 'done',
  },
  {
    id: 'api-quan-ly-kho',
    name: 'API quản lý kho',
    statusLabel: 'Sạch — không cần sửa',
    tone: 'info',
    stage: 'clean',
  },
  {
    id: 'app-diem-danh',
    name: 'App điểm danh',
    statusLabel: 'Đã xong',
    tone: 'ok',
    stage: 'done',
  },
  {
    id: 'he-thong-hoa-don',
    name: 'Hệ thống hóa đơn',
    statusLabel: 'Không mở được',
    tone: 'danger',
    stage: 'failed',
  },
];

/** Chỉ số của dự án đang xử lý. */
export const demoNumbers = {
  totalFiles: 500,
  readFiles: 342,
  transformFiles: 187,
  transformFilesDone: 142,
  transformSymbols: 2431,
  transformSymbolsDone: 1923,
  currentFile: 'src/services/user_service.py',
};

/** Kết quả quét phần "chạy dự án" — thay bằng API khi nối backend. */
export const demoRun: ProjectRun = {
  kind: 'Python · Django',
  needs: 'Python 3.11 trở lên',
  install: { label: 'Cài các thư viện cần thiết', command: 'pip install -r requirements.txt' },
  start: { label: 'Khởi động dự án', command: 'python manage.py runserver' },
  address: 'http://127.0.0.1:8000',
  notes: [
    'Dự án cần tệp .env để kết nối cơ sở dữ liệu, nhưng trong dự án chỉ có tệp mẫu .env.example. Mình dùng tệp mẫu đó và một cơ sở dữ liệu tạm, nên dữ liệu bạn thấy khi chạy thử là dữ liệu mẫu.',
    'Dự án chưa có sẵn tài khoản quản trị. Mình tạo một tài khoản mẫu để bạn xem được cả trang quản trị.',
  ],
  usage: [
    'Mở địa chỉ bên trên bằng trình duyệt. Trang đầu là danh sách sản phẩm của cửa hàng.',
    'Bấm “Thêm vào giỏ” ở sản phẩm bạn muốn mua — số trên nút Giỏ hàng sẽ tăng lên.',
    'Bấm “Giỏ hàng” ở góc phải trên để xem lại, rồi bấm “Thanh toán” — đơn hàng được lưu vào cơ sở dữ liệu.',
    'Trang quản trị nằm ở đường dẫn /admin: thêm sửa sản phẩm và xem đơn hàng. Đăng nhập bằng tài khoản mẫu admin / admin123.',
  ],
  previewSrc: '/preview-demo.html',
};

/**
 * Những chỗ chạm vào cấu hình máy chủ. Nhóm an toàn thì hệ thống tự làm và báo
 * cáo lại ở màn kết quả; chỉ nhóm này mới hỏi người dùng.
 */
export const riskyItems: RiskyItem[] = [
  {
    key: 'DATABASE_URL',
    file: '.env.example',
    reason:
      'Tên này đang được 3 tệp cấu hình máy chủ dùng để kết nối cơ sở dữ liệu. Nếu đổi tên, máy chủ có thể không kết nối được nữa.',
  },
  {
    key: 'REDIS_HOST',
    file: 'docker-compose.yml',
    reason: 'Cùng lý do như trên: đây là tên hệ thống bên ngoài đang dùng để tìm bộ nhớ đệm.',
  },
  {
    key: 'JWT_SECRET',
    file: '.env.example',
    reason: 'Khoá ký phiên đăng nhập. Đổi tên sẽ làm toàn bộ người dùng đang đăng nhập bị đăng xuất.',
  },
  {
    key: 'SENTRY_DSN',
    file: 'deploy.yaml',
    reason: 'Địa chỉ dịch vụ ghi lỗi bên ngoài. Đổi tên là mất khả năng theo dõi lỗi trên máy chủ.',
  },
  {
    key: 'PAYMENT_API_KEY',
    file: 'deploy.yaml',
    reason: 'Khoá kết nối cổng thanh toán. Sai tên là hỏng luồng thanh toán của khách.',
  },
  {
    key: 'SMTP_PASSWORD',
    file: '.env.example',
    reason: 'Mật khẩu gửi email. Đổi tên sẽ làm hệ thống không gửi được email xác nhận đơn hàng.',
  },
  {
    key: 'S3_BUCKET_NAME',
    file: 'docker-compose.yml',
    reason: 'Tên kho chứa ảnh sản phẩm. Đổi tên là ảnh không tải lên được nữa.',
  },
  {
    key: 'AWS_REGION',
    file: 'deploy.yaml',
    reason: 'Vùng máy chủ của nhà cung cấp cloud. Đổi tên có thể làm dịch vụ gọi sai khu vực.',
  },
  {
    key: 'WEBHOOK_SIGNING_SECRET',
    file: '.env.example',
    reason: 'Bí mật dùng để xác thực dữ liệu gửi từ đối tác. Đổi tên là đối tác bị từ chối.',
  },
  {
    key: 'CORS_ALLOWED_ORIGINS',
    file: 'settings.py',
    reason: 'Danh sách tên miền được phép gọi API. Đổi tên có thể làm website chính không gọi được.',
  },
  {
    key: 'REDIS_PORT',
    file: 'docker-compose.yml',
    reason: 'Cổng kết nối bộ nhớ đệm do hạ tầng bên ngoài khai báo. Đổi tên là không khớp cấu hình.',
  },
  {
    key: 'SMTP_HOST',
    file: '.env.example',
    reason: 'Máy chủ gửi email do bộ phận hạ tầng cung cấp. Không nên đổi tên.',
  },
];

/** Trả lời cho ô hỏi đáp ở màn kết quả — dựa trên từ khoá, không gọi AI thật. */
export function answerFor(question: string): string {
  const q = question.toLowerCase();
  const a = S.result.answers;
  if (q.includes('thanh toán') || q.includes('payment')) return a.payment;
  if (q.includes('sản phẩm') || q.includes('giỏ') || q.includes('product')) return a.product;
  if (q.includes('tài liệu') || q.includes('doc')) return a.docs;
  return a.default;
}
