/**
 * Chuỗi hiển thị của chế độ Đơn giản — tiếng Việt 100%, không thuật ngữ.
 * Không viết chuỗi trực tiếp trong JSX. Quy tắc ngôn ngữ: frontend-v2.md §8.
 */
export const S = {
  app: { name: 'Trợ lý dự án' },

  header: {
    toDark: 'Đang ở giao diện sáng — bấm để chuyển sang tối',
    toLight: 'Đang ở giao diện tối — bấm để chuyển sang sáng',
  },

  sidebar: {
    newProject: 'Dự án mới',
    recent: 'GẦN ĐÂY',
  },

  landing: {
    title: 'Bạn muốn làm gì với dự án này?',
    sub1: 'Kéo thả thư mục dự án vào đây, hoặc dán link GitHub.',
    sub2: 'Không cần biết gì về lập trình — hệ thống sẽ tự đọc và giải thích.',
    placeholder: 'Dán link GitHub, hoặc kéo thả thư mục dự án vào đây…',
    pickFolder: 'Chọn thư mục',
    pickZip: 'Chọn tệp .zip',
    send: 'Bắt đầu đọc dự án',
    orPick: 'hoặc chọn nhanh một việc',
    settings: {
      doc: ['Tài liệu: Tiếng Việt', 'Tài liệu: Song ngữ', 'Tài liệu: Giữ nguyên'],
      comment: ['Chú thích: Tiếng Việt', 'Chú thích: Giữ nguyên'],
      safety: ['An toàn: Cao nhất', 'An toàn: Cân bằng'],
    },
    cards: {
      docs: {
        title: 'Dịch chú thích và viết tài liệu tiếng Việt',
        before: '1.842 chú thích · 8 tài liệu · ',
        bold: 'an toàn, không sửa code',
        after: '',
      },
      rename: {
        title: 'Đổi tên biến tiếng Trung sang tiếng Anh',
        before: '217 tên · ',
        bold: '',
        italic: 'có 12 chỗ hệ thống sẽ hỏi bạn trước',
        after: '',
      },
      all: {
        title: 'Làm tất cả những việc trên',
        badge: 'KHUYÊN DÙNG',
        sub: 'Tự chọn cách an toàn nhất · chỉ hỏi bạn 12 chỗ có rủi ro',
      },
    },
    note: {
      before: 'Bạn ',
      bold: 'không cần cấu hình gì thêm',
      after: ' — hệ thống sẽ hỏi bạn trước khi làm việc gì có rủi ro.',
    },
  },

  reading: {
    title: 'Đang đọc dự án của bạn…',
    readOf: (a: number, b: number) => `Đã đọc ${a} / ${b} tệp`,
    about: 'Còn khoảng 1 phút',
    steps: [
      'Đã mở và đọc toàn bộ tệp trong dự án',
      'Đã nhận ra dự án này viết bằng ngôn ngữ gì',
      'Đang tìm những tên biến cần đổi…',
      'Sắp xếp lại chú thích và viết tài liệu tiếng Việt',
      'Xem cách cài đặt và khởi động để bạn chạy thử được',
    ],
    cancel: 'Huỷ',
  },

  result: {
    title: 'Mình đã hiểu dự án của bạn',
    bullets: [
      {
        before: 'Đây là một ',
        bold: 'website bán hàng',
        after:
          ' viết bằng Python. Khách xem sản phẩm, bỏ vào giỏ rồi thanh toán; đơn hàng được lưu vào cơ sở dữ liệu.',
      },
      {
        before: 'Có ',
        bold: '217 tên biến và hàm',
        after: ' đang viết bằng tiếng Trung, nên người mới đọc code rất khó hiểu.',
      },
      {
        before: 'Có ',
        bold: '1.842 chú thích',
        after:
          ' cần dịch sang tiếng Việt. Trong đó có chỗ ảnh hưởng tới máy chủ — mình sẽ hỏi bạn trước khi đổi.',
      },
    ],
    start: 'Bắt đầu xử lý — an toàn',
    details: 'Xem chi tiết',
    hint: 'Bạn có thể hỏi mình bất cứ điều gì về dự án này',
    askPlaceholder: 'Hỏi về dự án này… ví dụ “Phần thanh toán nằm ở đâu?”',
    answers: {
      payment:
        'Phần thanh toán nằm trong thư mục services, có một tệp riêng xử lý việc trừ tiền và ghi hoá đơn. Khi đổi tên biến, mình sẽ giữ nguyên tên các khoá kết nối cổng thanh toán để không làm hỏng luồng thanh toán.',
      product:
        'Sản phẩm và giỏ hàng nằm ở nhóm tệp api. Khách xem sản phẩm, thêm vào giỏ, rồi bấm thanh toán; đơn hàng sau đó được lưu xuống cơ sở dữ liệu.',
      docs: 'Hiện dự án chưa có tài liệu tiếng Việt. Mình có thể viết 8 tệp: giới thiệu, cách cài đặt, cách dùng và mô tả kiến trúc.',
      default:
        'Mình trả lời dựa trên những gì đã đọc được trong dự án. Bạn hỏi cụ thể hơn một chút — ví dụ tên màn hình, tên chức năng, hoặc tệp bạn quan tâm — thì mình trả lời sát hơn.',
    },
  },

  working: {
    title: 'Đang xử lý…',
    files: (a: number, b: number) => `Tệp: ${a} / ${b}`,
    symbols: (a: string, b: string) => `Tên biến và hàm: ${a} / ${b}`,
    current: (path: string) => `Đang làm: ${path}`,
    applying: 'Đang áp dụng thay đổi',
    cancel: 'Huỷ',
  },

  done: {
    title: 'Xong rồi! Dự án của bạn đã sẵn sàng.',
    sub: 'Mình đã làm xong trong 4 phút, và đã tự kiểm tra lại toàn bộ.',
    checks: [
      { before: 'Đã đổi tên ', bold: '217', after: ' biến và hàm' },
      { before: 'Đã dịch ', bold: '1.842', after: ' chú thích sang tiếng Việt' },
      { before: 'Đã viết ', bold: '8', after: ' tài liệu tiếng Việt' },
      { before: 'Đã kiểm tra: dự án ', bold: 'vẫn chạy tốt', after: ', không lỗi' },
    ],
    needTitle: (n: number) => `Còn ${n} chỗ cần bạn quyết định`,
    needPill: 'CẦN XEM',
    needSub:
      'Những chỗ này ảnh hưởng tới máy chủ hoặc cấu hình bên ngoài, nên mình không tự đổi. Nếu bạn không chắc, cứ giữ nguyên — an toàn nhất.',
    inFile: (file: string) => `trong tệp ${file}`,
    keep: 'Giữ nguyên (khuyên dùng)',
    change: 'Vẫn đổi tên',
    more: (n: number) => `Xem ${n} chỗ còn lại ›`,
    less: 'Thu gọn ›',
    reviewTitle: 'Xem lại từng thay đổi mình đã làm',
    reviewSub: '217 thay đổi đã áp dụng — không cần xem nếu bạn tin mình.',
    reviewAction: 'Xem danh sách ›',
    download: 'Tải dự án về máy (.zip)',
    report: 'Mở báo cáo chi tiết (PDF)',
    run: 'Chạy thử',
    runTitle: 'Chạy thử dự án ngay trên trình duyệt',
    runSub:
      'Mình đã biết cách cài đặt và khởi động dự án này. Bạn xem được giao diện trước khi tải về máy.',
    safe: 'Bản gốc vẫn được giữ nguyên, không bị ghi đè',
    applied: (decided: number, total: number) =>
      `Bạn đã quyết định ${decided} / ${total} chỗ. ${total - decided} chỗ còn lại đang giữ nguyên.`,
    demoNotice: 'Bản demo chưa nối backend nên chưa xuất được tệp thật. Nút này sẽ hoạt động khi nối API.',
  },

  run: {
    title: 'Mình đã xem cách chạy dự án này',
    sub: 'Mình đọc tệp hướng dẫn và các tệp cấu hình trong dự án để biết cần cài gì, chạy bằng lệnh nào và mở ra ở đâu.',
    kindLabel: 'Dự án viết bằng',
    needsLabel: 'Máy cần có',
    howTitle: 'Cách cài đặt và khởi động',
    howSub:
      'Hai lệnh dưới đây là tất cả những gì cần làm nếu bạn muốn tự chạy trên máy mình. Bấm để sao chép rồi dán vào cửa sổ dòng lệnh.',
    copy: 'Sao chép',
    copied: 'Đã sao chép',
    addressNote: (address: string) =>
      `Chạy xong, mở trình duyệt vào ${address} là thấy giao diện dự án.`,
    start: 'Chạy dự án',
    note: {
      before: 'Chạy thử ',
      bold: 'không sửa gì',
      after: ' trong dự án của bạn — bản gốc vẫn nguyên vẹn.',
    },
    starting: {
      title: 'Đang chạy dự án của bạn…',
      steps: [
        'Đang cài các thư viện cần thiết',
        'Đang chuẩn bị dữ liệu mẫu để bạn xem thử',
        'Đang khởi động dự án',
        'Đang mở giao diện',
      ],
      about: 'Còn khoảng 20 giây',
      cancel: 'Huỷ',
    },
    running: {
      title: 'Dự án đang chạy',
      pill: 'ĐANG CHẠY',
      frameTitle: 'Giao diện dự án đang chạy',
      openTab: 'Mở trong tab mới',
      stop: 'Dừng dự án',
    },
    usageTitle: 'Cách sử dụng',
    demoNotice:
      'Bản demo chưa nối backend: khung bên trên hiển thị một trang mẫu, khi nối API sẽ hiển thị đúng giao diện dự án của bạn đang chạy.',
  },

  clean: {
    title: 'Dự án của bạn đã sạch rồi!',
    sub: {
      before: 'Mình đã đọc hết 428 tệp và ',
      bold: 'không tìm thấy gì cần sửa',
      after: '. Bạn không cần làm gì cả.',
    },
    checks: [
      { before: 'Đã đọc toàn bộ ', bold: '428', after: ' tệp' },
      { before: 'Tên biến và hàm đều đã là ', bold: 'tiếng Anh', after: '' },
      { before: 'Chú thích đã rõ ràng, ', bold: 'không cần dịch', after: '' },
      { before: 'Cấu hình an toàn, ', bold: 'không có gì rủi ro', after: '' },
    ],
    nextTitle: 'Việc duy nhất mình vẫn có thể làm cho bạn',
    nextSub:
      'Dự án này chưa có tài liệu tiếng Việt. Nếu bạn muốn người khác trong công ty đọc hiểu, mình viết cho bạn.',
    offerTitle: 'Viết tài liệu tiếng Việt cho dự án',
    offerSub:
      '8 tệp: giới thiệu dự án, cách cài đặt, cách sử dụng, mô tả kiến trúc. Không sửa một dòng code nào.',
    write: 'Viết tài liệu tiếng Việt',
    ask: 'Hỏi mình về dự án này',
    note: {
      before: 'Mình ',
      bold: 'không sửa những thứ không cần sửa',
      after: ' — dự án của bạn vốn đã tốt.',
    },
    demoNotice: 'Bản demo chưa nối backend nên chưa tạo được tài liệu thật.',
  },

  failed: {
    title: 'Mình không mở được dự án này',
    sub: {
      before: 'Link bạn dán đang ở chế độ ',
      bold: 'riêng tư (private)',
      after: ', nên mình không có quyền xem nội dung bên trong.',
    },
    sub2: 'Dự án của bạn không bị ảnh hưởng gì — mình chỉ chưa đọc được nó thôi.',
    retry: 'Thử lại',
    pickFolder: 'Chọn thư mục trên máy',
    other: 'Dán link khác',
    helpTitle: 'Không chắc link của bạn đang ở chế độ nào?',
    helpBody:
      'Mở link đó bằng trình duyệt bình thường. Nếu bạn xem được nội dung thì mình cũng xem được — chỉ cần dán lại link. Còn nếu bạn phải đăng nhập mới xem được, hãy dùng cách ',
    helpCode: 'Chọn thư mục trên máy',
    techTitle: 'Xem chi tiết kỹ thuật',
    techBody: 'HTTP 403 · repository is private · github.com/congty/website-ban-hang',
    note: { before: 'Không có gì bị hỏng cả. Dự án của bạn vẫn ', bold: 'nguyên vẹn', after: ' ở chỗ cũ.' },
  },

  settings: {
    // Nút mở Cài đặt — SettingsModal, một bộ config key + credential store.
    open: 'Cài đặt',
  },
} as const;
