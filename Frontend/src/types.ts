/**
 * Kiểu dữ liệu của luồng xử lý dự án — hợp đồng giữa các màn hình.
 *
 * Dữ liệu thật của các kiểu này sẽ do backend trả về; bản hiện tại là dữ liệu
 * mẫu trong src/demo.ts.
 */

/** Tám trạng thái màn hình. Người dùng luôn bắt đầu từ 'landing'. */
export type Stage =
  | 'landing'
  | 'reading'
  | 'result'
  | 'working'
  | 'done'
  | 'clean'
  | 'failed'
  | 'run';

/** Trạng thái viết bằng chữ, màu chỉ là kênh phụ (không dùng màu đơn độc). */
export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'muted';

export interface Project {
  id: string;
  name: string;
  statusLabel: string;
  tone: Tone;
  /** Màn hình mở ra khi bấm vào dự án này trong danh sách gần đây. */
  stage: Stage;
}

/** Một chỗ chạm vào cấu hình máy chủ — nhóm DUY NHẤT hệ thống hỏi người dùng. */
export interface RiskyItem {
  key: string;
  file: string;
  reason: string;
}

export interface RunCommand {
  /** Việc lệnh này làm, viết cho người không biết lập trình. */
  label: string;
  command: string;
}

/** Kết quả quét phần "chạy dự án": cần cài gì, chạy lệnh nào, mở ra ở đâu. */
export interface ProjectRun {
  kind: string;
  needs: string;
  install: RunCommand;
  start: RunCommand;
  address: string;
  /** Điều cần biết trước khi chạy — nói rõ cái gì là tạm, cái gì là thật. */
  notes: string[];
  /** Hướng dẫn sử dụng cho người dùng cuối, không dùng thuật ngữ. */
  usage: string[];
  /** Khung xem trước trỏ vào đâu; khi nối backend là cổng của dự án đang chạy. */
  previewSrc: string;
}
