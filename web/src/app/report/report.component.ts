import { Component, ElementRef, inject, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ReportInitComponent } from './report-init.component';

/**
 * Standalone report page rendering the HCMUS I&E 2025 competition report
 * as a styled A4 web page. Accessible at /report (no auth required).
 * Uses metro-meow editorial style: JetBrains Mono headings + Times New Roman body.
 * Scroll-triggered fade-in animations on sections and tables.
 */
@Component({
  selector: 'app-report',
  standalone: true,
  imports: [ReportInitComponent],
  encapsulation: ViewEncapsulation.None,
  styleUrl: './report.component.css',
  template: `
    <!-- Reading progress bar -->
    <div class="progress-bar" #progressBar></div>

    <!-- Toolbar — hidden in print -->
    <div class="no-print">
      <button (click)="printReport()">Export PDF</button>
      <button (click)="toggleDark()">{{ isDark ? 'Light' : 'Dark' }}</button>
      <span>Bản mô tả dự án Viecz — HCMUS I&amp;E 2025</span>
    </div>

    <article class="report">

      <!-- ==================== COVER PAGE ==================== -->
      <section class="cover">
        <div class="university">Đại học Quốc gia Thành phố Hồ Chí Minh</div>
        <div class="faculty">Trường Đại học Khoa học Tự nhiên</div>

        <div class="competition">Cuộc thi Sáng tạo – Khởi nghiệp HCMUS I&amp;E 2025</div>

        <!-- Hero illustration: students exchanging task card with metro lines -->
        <div class="hero-illustration">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
            <!-- Metro background lines -->
            <line x1="0" y1="40" x2="300" y2="40" stroke="currentColor" stroke-width="0.5" opacity="0.15"/>
            <line x1="0" y1="80" x2="300" y2="80" stroke="currentColor" stroke-width="0.5" opacity="0.15"/>
            <line x1="0" y1="120" x2="300" y2="120" stroke="currentColor" stroke-width="0.5" opacity="0.15"/>
            <line x1="0" y1="160" x2="300" y2="160" stroke="currentColor" stroke-width="0.5" opacity="0.15"/>
            <line x1="60" y1="0" x2="60" y2="200" stroke="currentColor" stroke-width="0.5" opacity="0.1"/>
            <line x1="150" y1="0" x2="150" y2="200" stroke="currentColor" stroke-width="0.5" opacity="0.1"/>
            <line x1="240" y1="0" x2="240" y2="200" stroke="currentColor" stroke-width="0.5" opacity="0.1"/>
            <!-- Metro station dots -->
            <circle cx="60" cy="40" r="3" fill="#c17f59" opacity="0.4"/>
            <circle cx="150" cy="80" r="3" fill="#c17f59" opacity="0.4"/>
            <circle cx="240" cy="120" r="3" fill="#c17f59" opacity="0.4"/>
            <!-- Student A (left) -->
            <circle cx="95" cy="65" r="14" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <line x1="95" y1="79" x2="95" y2="130" stroke="currentColor" stroke-width="1.5"/>
            <line x1="95" y1="130" x2="82" y2="165" stroke="currentColor" stroke-width="1.5"/>
            <line x1="95" y1="130" x2="108" y2="165" stroke="currentColor" stroke-width="1.5"/>
            <line x1="95" y1="92" x2="75" y2="115" stroke="currentColor" stroke-width="1.5"/>
            <line x1="95" y1="92" x2="120" y2="105" stroke="currentColor" stroke-width="1.5"/>
            <!-- Backpack on student A -->
            <rect x="100" y="85" width="8" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1" opacity="0.6"/>
            <!-- Student B (right) -->
            <circle cx="205" cy="65" r="14" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <line x1="205" y1="79" x2="205" y2="130" stroke="currentColor" stroke-width="1.5"/>
            <line x1="205" y1="130" x2="192" y2="165" stroke="currentColor" stroke-width="1.5"/>
            <line x1="205" y1="130" x2="218" y2="165" stroke="currentColor" stroke-width="1.5"/>
            <line x1="205" y1="92" x2="180" y2="105" stroke="currentColor" stroke-width="1.5"/>
            <line x1="205" y1="92" x2="225" y2="115" stroke="currentColor" stroke-width="1.5"/>
            <!-- Task card being exchanged -->
            <rect x="128" y="95" width="44" height="28" rx="3" fill="none" stroke="#c17f59" stroke-width="1.5"/>
            <line x1="134" y1="103" x2="160" y2="103" stroke="#c17f59" stroke-width="1" opacity="0.6"/>
            <line x1="134" y1="109" x2="155" y2="109" stroke="#c17f59" stroke-width="1" opacity="0.6"/>
            <line x1="134" y1="115" x2="148" y2="115" stroke="#c17f59" stroke-width="1" opacity="0.6"/>
            <!-- Check mark on card -->
            <polyline points="158,112 162,116 168,108" fill="none" stroke="#c17f59" stroke-width="1.5"/>
            <!-- Connection arrows -->
            <path d="M120,105 Q128,100 128,109" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3,2"/>
            <path d="M180,105 Q172,100 172,109" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3,2"/>
            <!-- Accent diagonal metro line -->
            <line x1="20" y1="180" x2="280" y2="20" stroke="#c17f59" stroke-width="0.5" opacity="0.2"/>
          </svg>
        </div>

        <div class="title-block">
          <div class="project-title">BẢN MÔ TẢ DỰ ÁN</div>
          <div class="subtitle">Viecz — Nền tảng trao đổi việc vặt</div>
        </div>

        <div class="team-info">
          <strong>Thành viên:</strong><br />
          Nguyễn Hữu Thiện Nhân — Quản trị và giám sát hệ thống<br />
          Trương Hoài Đức — Kết nối và xây dựng tiếng tăm cho thương hiệu<br />
          Thái Kha Bảo — Thiết kế đồ họa cho thương hiệu<br />
          Trần Gia Sang — Kỹ thuật viên
        </div>

        <div class="date">Tháng 3/2026</div>

        <!-- QR Code for https://viecz.fishcmus.io.vn (real, scannable) -->
        <div class="qr-code">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37 37" width="120" height="120" shape-rendering="crispEdges">
            <path fill="var(--color-bg, #f0ede8)" d="M0 0h37v37H0z"/>
            <path stroke="currentColor" d="M4 4.5h7m2 0h1m1 0h1m1 0h3m1 0h3m2 0h7M4 5.5h1m5 0h1m2 0h1m2 0h6m2 0h1m1 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m1 0h4m1 0h1m1 0h1m2 0h2m2 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m1 0h1m1 0h1m3 0h2m1 0h1m2 0h1m1 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h5m2 0h6m1 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m1 0h1m1 0h1m1 0h1m5 0h1m1 0h1m1 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M12 11.5h2m2 0h1m1 0h1m1 0h1m3 0h1M4 12.5h1m1 0h5m9 0h2m2 0h1m1 0h5M4 13.5h1m2 0h1m9 0h3m1 0h4m1 0h3m3 0h1M6 14.5h1m2 0h3m1 0h1m1 0h1m1 0h5m2 0h4M5 15.5h5m7 0h1m1 0h1m4 0h3m1 0h2m1 0h1M4 16.5h1m4 0h3m2 0h3m1 0h2m1 0h3m1 0h1m3 0h2M4 17.5h3m1 0h1m2 0h3m1 0h1m3 0h10m3 0h1M4 18.5h4m1 0h2m1 0h1m1 0h1m1 0h1m4 0h1m2 0h1m1 0h5M5 19.5h1m1 0h1m3 0h5m2 0h1m1 0h1m1 0h2m1 0h4m2 0h1M6 20.5h2m1 0h2m1 0h1m1 0h3m3 0h2m7 0h2M4 21.5h6m1 0h1m1 0h2m1 0h4m3 0h6m1 0h1m1 0h1M4 22.5h1m3 0h1m1 0h2m1 0h2m2 0h5m5 0h2m1 0h1M4 23.5h1m1 0h4m2 0h3m2 0h1m1 0h1m2 0h1m2 0h2m4 0h1M4 24.5h1m1 0h2m1 0h2m1 0h1m1 0h1m3 0h2m1 0h1m1 0h6m1 0h3M12 25.5h1m6 0h4m1 0h1m3 0h5M4 26.5h7m2 0h1m2 0h1m4 0h1m1 0h2m1 0h1m1 0h3M4 27.5h1m5 0h1m1 0h1m1 0h2m2 0h1m1 0h1m1 0h3m3 0h1m2 0h1M4 28.5h1m1 0h3m1 0h1m1 0h1m1 0h2m4 0h1m1 0h1m1 0h5m1 0h1m1 0h1M4 29.5h1m1 0h3m1 0h1m1 0h4m2 0h2m1 0h4m4 0h2M4 30.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h2m1 0h3m3 0h7M4 31.5h1m5 0h1m3 0h1m1 0h4m1 0h6m2 0h1m1 0h1M4 32.5h7m1 0h1m2 0h2m2 0h1m3 0h1m3 0h4"/>
          </svg>
          <div class="qr-label">Quét để truy cập Viecz</div>
        </div>
      </section>

      <!-- ==================== 1. TÊN DỰ ÁN ==================== -->
      <section class="section fade-in">
        <h2><span class="node">1</span>Tên dự án</h2>
        <p><strong>Viecz — Nền tảng trao đổi việc vặt</strong></p>
      </section>

      <!-- ==================== 2. LĨNH VỰC ==================== -->
      <section class="section fade-in">
        <h2><span class="node">2</span>Lĩnh vực</h2>
        <p>Ứng dụng đổi mới xã hội (ứng dụng công nghệ thông tin và chuyển đổi số)</p>
      </section>

      <!-- ==================== 3. VẤN ĐỀ VÀ NHU CẦU ==================== -->
      <section class="section fade-in">
        <h2><span class="node">3</span>Vấn đề và nhu cầu mà dự án hướng tới</h2>

        <h3>3.1. Câu chuyện thực tế</h3>
        <p>
          Hãy tưởng tượng bạn là một sinh viên năm hai. <strong>Giữa trưa nắng 40 độ,
          bạn đứng một mình trước ký túc xá với 20 kg đồ đạc. Bạn cùng phòng đi vắng.
          Gọi ai?</strong> Ngại quá. Bạn ước có thể đăng một dòng: "cần người giúp khiêng
          đồ, 30 phút, 50k" — và ai đó gần đây nhận ngay.
        </p>
        <p>
          Hay một tình huống khác: <strong>11 giờ đêm, mai thi Speaking.</strong> Bạn muốn
          tìm ai đó luyện nói tiếng Anh 30 phút — không cần gia sư chuyên nghiệp, không cần
          lịch cố định, chỉ cần một người cũng đang rảnh và sẵn lòng giúp. Thuê gia sư thì
          sao? 200k/giờ cho một buổi trò chuyện — với mức lương part-time
          <span class="stat">14.000–30.000 VND/giờ</span>&nbsp;[3], đó là cả một buổi đi làm.
        </p>
        <p>
          Những tình huống này không phải chuyện hiếm. Đây là đời sống hàng ngày của hơn
          <span class="stat">2 triệu</span> sinh viên Việt Nam. Và hiện tại, chưa có cách
          nào thực sự tiện lợi để giải quyết.
        </p>

        <h3>3.2. Bối cảnh</h3>
        <p>
          Việt Nam hiện có hơn <span class="stat">2.15 triệu sinh viên đại học</span>&nbsp;[1],
          con số này dự kiến vượt <span class="stat">3 triệu vào năm 2030</span>&nbsp;[7].
          Phần lớn sinh viên có nhu cầu kiếm thêm thu nhập, nhưng cơ hội làm thêm truyền
          thống thường đòi hỏi cam kết thời gian dài hoặc kỹ năng chuyên môn.
        </p>
        <p>
          Trong khi đó, xung quanh họ có rất nhiều việc nhỏ cần người giúp — những việc
          chỉ mất 15 phút đến vài giờ, không cần bằng cấp, chỉ cần sự sẵn lòng. Nhưng
          không có công cụ nào kết nối hai bên một cách nhanh chóng và đáng tin cậy.
        </p>

        <h3>3.3. Vấn đề cụ thể</h3>
        <p>Để dễ hình dung, hãy xem hai phía của vấn đề:</p>
        <p>
          <strong>Phía người cần giúp:</strong> Khi cần ai đó giúp một việc nhỏ — khiêng
          đồ, in bài, luyện nói tiếng Anh — sinh viên thường chỉ có một cách: đăng lên
          nhóm Zalo lớp rồi chờ. Không biết ai sẽ trả lời, không biết giá bao nhiêu, và
          quan trọng nhất là không có gì đảm bảo nếu người kia nhận tiền rồi biến mất.
        </p>
        <p>
          <strong>Phía người muốn giúp:</strong> Nhiều sinh viên có thời gian rảnh và muốn
          kiếm thêm, nhưng không biết tìm việc ở đâu. Grab, Gojek yêu cầu xe máy. Fiverr,
          Upwork cần kỹ năng chuyên môn và thanh toán quốc tế. Không có nền tảng nào phục
          vụ những việc đơn giản như giao đồ ăn từ căng-tin hay giữ chỗ thư viện — những
          việc mà bất kỳ sinh viên nào cũng có thể làm.
        </p>

        <h3>3.4. Khoảng trống thị trường</h3>
        <p>
          Nói cách khác, hiện tại chưa có nền tảng nào tại Việt Nam kết nối sinh viên với
          nhau cho những việc vặt hàng ngày:
        </p>
        <ul>
          <li>
            <strong>Nhóm Zalo/Facebook:</strong> Miễn phí và phổ biến, nhưng không có thanh
            toán, không đánh giá, tin nhắn dễ bị trôi. Bạn đăng xong và hy vọng ai đó nhìn thấy.
          </li>
          <li>
            <strong>Tiệm dịch vụ:</strong> Đắt, không linh hoạt. Thuê người ngoài luôn tốn
            gấp đôi so với nhờ sinh viên giúp.
          </li>
          <li>
            <strong>Nhờ miệng:</strong> Phạm vi hẹp, phụ thuộc vào mối quan hệ cá nhân.
            Không phải ai cũng thoải mái nhờ vả.
          </li>
        </ul>
        <p>
          Chỉ <span class="stat">40%</span> người đi làm tại Việt Nam còn muốn gắn bó với
          công việc văn phòng truyền thống — phần lớn đã quen với việc làm linh hoạt&nbsp;[8].
          Nhưng các nền tảng hiện tại chỉ phục vụ tài xế, freelancer chuyên nghiệp, hoặc
          người bán hàng online. Chưa ai nghĩ đến sinh viên — nhóm người vừa cần giúp đỡ,
          vừa sẵn sàng giúp người khác, nhưng thiếu một công cụ để kết nối.
        </p>
      </section>

      <!-- ==================== 4. GIẢI PHÁP ==================== -->
      <section class="section fade-in">
        <h2><span class="node">4</span>Giải pháp / Sản phẩm / Công nghệ</h2>

        <h3>4.1. Tổng quan giải pháp</h3>
        <p>
          Viecz giải quyết vấn đề trên bằng một cách rất đơn giản: cho phép sinh viên đăng
          việc cần làm và tìm người làm ngay — có trả công hoặc không. Nhanh, tiện, có trách
          nhiệm.
        </p>
        <p>
          Nền tảng được thiết kế từ đầu cho điện thoại (mobile-first), vì đó là thiết bị
          sinh viên dùng mọi lúc. Đồng thời, Viecz cũng hoạt động đầy đủ trên laptop qua
          trình duyệt web. Ứng dụng Android đang thử nghiệm nội bộ, phiên bản iOS sẽ phát
          triển trong tương lai.
        </p>

        <h3>4.2. Tính năng chính</h3>
        <p>Để bạn dễ hình dung cách Viecz hoạt động, hãy theo dõi một ví dụ:</p>
        <ol>
          <li>
            <strong>Đăng việc:</strong> Bạn cần ai giúp dọn phòng KTX. Mở Viecz, đăng việc
            trong 30 giây — mô tả ngắn, vị trí, thời gian, và mức trả công (hoặc không trả
            công cũng được).
          </li>
          <li>
            <strong>Tìm người trên bản đồ:</strong> Ngay lập tức, những sinh viên xung
            quanh bạn thấy việc này hiện lên trên bản đồ — họ biết việc ở đâu, bao xa, cần
            làm gì. Không cần lướt feed, không cần chờ admin duyệt.
          </li>
          <li>
            <strong>Chọn và kết nối:</strong> Người quan tâm ứng tuyển, bạn xem hồ sơ và
            chọn. Hai bên chat trực tiếp ngay trong ứng dụng để chốt chi tiết.
          </li>
          <li>
            <strong>Thanh toán an toàn:</strong> Nếu có trả công, tiền được nền tảng giữ hộ
            (escrow) cho đến khi việc hoàn thành — không bên nào phải lo bị quỵt. Nếu không
            trả công, chỉ cần xác nhận hoàn thành là xong.
          </li>
        </ol>
        <p>
          Điểm quan trọng là toàn bộ quá trình này diễn ra rất nhanh — từ lúc đăng đến lúc
          có người nhận thường chỉ tính bằng phút, nhờ việc kết nối dựa trên vị trí thực
          (bản đồ) thay vì danh sách tĩnh.
        </p>

        <h3>4.3. Kiến trúc công nghệ</h3>
        <p>
          Viecz được xây dựng hoàn toàn bằng công nghệ mã nguồn mở. Điều này quan trọng
          vì hai lý do: thứ nhất, tiết kiệm chi phí bản quyền — phù hợp với dự án sinh
          viên tự chủ tài chính; thứ hai, cộng đồng mã nguồn mở cung cấp tài liệu và hỗ
          trợ phong phú, giúp đội ngũ nhỏ vẫn có thể xây dựng sản phẩm chất lượng.
        </p>

        <table class="fade-in">
          <thead>
            <tr>
              <th>Thành phần</th>
              <th>Công nghệ</th>
              <th>Lý do chọn</th>
            </tr>
          </thead>
          <tbody>
            <tr data-detail="Go (Gin) được chọn vì hiệu năng cao, biên dịch thành binary đơn, dễ deploy. Một server Go xử lý hàng nghìn request/giây với RAM chỉ ~50MB.">
              <td data-label="Thành phần"><strong>Backend</strong></td>
              <td data-label="Công nghệ">Go (Gin)</td>
              <td data-label="Lý do chọn">Hiệu năng cao, một server phục vụ được nhiều người dùng, tiết kiệm chi phí</td>
            </tr>
            <tr data-detail="PostgreSQL hỗ trợ JSONB, full-text search, và transaction ACID. Meilisearch bổ sung tìm kiếm typo-tolerant với latency dưới 50ms.">
              <td data-label="Thành phần"><strong>Cơ sở dữ liệu</strong></td>
              <td data-label="Công nghệ">PostgreSQL + Meilisearch</td>
              <td data-label="Lý do chọn">PostgreSQL cho dữ liệu tin cậy; Meilisearch cho tìm kiếm tức thì, tự sửa lỗi chính tả</td>
            </tr>
            <tr data-detail="Angular 21 với Server-Side Rendering giúp trang tải lần đầu dưới 1.5 giây. Signal-based reactivity giảm bundle size và tăng tốc cập nhật UI.">
              <td data-label="Thành phần"><strong>Web</strong></td>
              <td data-label="Công nghệ">Angular 21 (SSR)</td>
              <td data-label="Lý do chọn">Server-Side Rendering giúp trang tải nhanh và Google index được (quan trọng cho SEO)</td>
            </tr>
            <tr data-detail="Jetpack Compose cho phép xây dựng UI declarative, giảm 40% code so với XML truyền thống. Hilt dependency injection đảm bảo testability.">
              <td data-label="Thành phần"><strong>Android</strong></td>
              <td data-label="Công nghệ">Kotlin + Jetpack Compose</td>
              <td data-label="Lý do chọn">Ứng dụng native, mượt mà, theo chuẩn Material Design 3 của Google</td>
            </tr>
            <tr data-detail="PayOS tích hợp trực tiếp ngân hàng Việt Nam, hỗ trợ QR code thanh toán. Phí giao dịch 0% giai đoạn đầu, sau đó chỉ 1.1% + 1,100 VND/giao dịch.">
              <td data-label="Thành phần"><strong>Thanh toán</strong></td>
              <td data-label="Công nghệ">PayOS</td>
              <td data-label="Lý do chọn">Cổng thanh toán Việt Nam — sinh viên chuyển khoản ngân hàng nội địa, không cần thẻ quốc tế</td>
            </tr>
          </tbody>
        </table>

        <p>
          Ngoài ra, chat real-time qua WebSocket (tin nhắn đến ngay, không cần refresh),
          bản đồ dùng MapTiler (miễn phí cho dự án nhỏ), và toàn bộ hạ tầng được bảo vệ
          bởi Cloudflare (chống DDoS, tăng tốc tải trang).
        </p>

        <h3>4.4. Danh mục dịch vụ</h3>
        <p>
          Để cho thấy phạm vi ứng dụng của Viecz, đây là một số loại việc phổ biến mà sinh
          viên có thể đăng:
        </p>

        <table class="fade-in">
          <thead>
            <tr>
              <th>Nhóm</th>
              <th>Ví dụ</th>
              <th>Giá đề xuất</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Nhóm"><strong>Việc vặt</strong></td>
              <td data-label="Ví dụ">In ấn, giao đồ, mua hộ, giữ chỗ thư viện</td>
              <td data-label="Giá đề xuất"><span class="stat">5.000–30.000 VND</span></td>
            </tr>
            <tr>
              <td data-label="Nhóm"><strong>Học thuật</strong></td>
              <td data-label="Ví dụ">Gia sư, thiết kế slide, review CV, dịch tài liệu</td>
              <td data-label="Giá đề xuất"><span class="stat">30.000–200.000 VND</span></td>
            </tr>
            <tr>
              <td data-label="Nhóm"><strong>Kỹ năng</strong></td>
              <td data-label="Ví dụ">Chụp ảnh, edit video, thiết kế đồ họa, hỗ trợ IT</td>
              <td data-label="Giá đề xuất"><span class="stat">50.000–500.000 VND</span></td>
            </tr>
            <tr>
              <td data-label="Nhóm"><strong>Đời sống</strong></td>
              <td data-label="Ví dụ">Dọn phòng KTX, giao đồ ăn đêm</td>
              <td data-label="Giá đề xuất"><span class="stat">20.000–100.000 VND</span></td>
            </tr>
          </tbody>
        </table>

        <p>
          Lưu ý: mức giá hoàn toàn do người đăng quyết định — Viecz chỉ đề xuất khoảng
          tham khảo để hai bên dễ thỏa thuận.
        </p>
      </section>

      <!-- ==================== 5. KHÁCH HÀNG VÀ THỊ TRƯỜNG ==================== -->
      <section class="section fade-in">
        <h2><span class="node">5</span>Khách hàng và thị trường mục tiêu</h2>

        <h3>5.1. Khách hàng mục tiêu</h3>
        <p>
          Viecz phục vụ sinh viên đại học tại TP.HCM — cả người cần thuê lẫn người muốn
          nhận việc. Điều thú vị là hầu hết sinh viên sẽ đóng cả hai vai trò tùy lúc: hôm
          nay cần người giúp khiêng đồ, ngày mai nhận việc thiết kế slide cho người khác.
          Đây là đặc điểm quan trọng của mô hình — mỗi người dùng mới vừa là "cầu" vừa là
          "cung", nên nền tảng phát triển nhanh hơn so với mô hình một chiều.
        </p>
        <p>Cụ thể hơn:</p>
        <ul>
          <li>
            <strong>Sinh viên năm 3–4</strong> bận thực tập, thường cần người giúp nhanh
            những việc lặt vặt.
          </li>
          <li>
            <strong>Sinh viên năm 1–2</strong> có thời gian rảnh, muốn kiếm thêm thu nhập
            linh hoạt.
          </li>
          <li>
            <strong>Sinh viên có kỹ năng</strong> (thiết kế, ngoại ngữ, lập trình) có thể
            nhận việc chuyên môn hơn với giá cao hơn.
          </li>
        </ul>
        <p>
          Về lâu dài, nền tảng có thể mở rộng ra giảng viên, cán bộ trường, và cộng đồng
          xung quanh khu đại học.
        </p>

        <h3>5.2. Quy mô thị trường</h3>
        <p>
          Việt Nam có hơn <span class="stat">2.15 triệu sinh viên đại học</span>&nbsp;[1],
          với mục tiêu vượt <span class="stat">3 triệu vào năm 2030</span>&nbsp;[7], phân
          bổ tại 243 trường trên cả nước. Riêng TP.HCM tập trung khoảng
          <span class="stat">500.000</span> sinh viên — đây là thị trường khởi điểm của Viecz.
        </p>
        <p>
          Chúng tôi muốn thành thật: chúng tôi không ước tính thị trường theo cách nhân số
          sinh viên với một con số chi tiêu tưởng tượng. Thay vào đó, mục tiêu rất cụ
          thể — nếu pilot tại ĐHKHTN thu hút được vài trăm người dùng thường xuyên trong
          học kỳ đầu, đó là cơ sở thực tế để mở rộng sang các trường lân cận.
        </p>

        <h3>5.3. Phân tích đối thủ cạnh tranh</h3>
        <p>
          Để hiểu vị trí của Viecz, hãy so sánh với những gì đang có trên thị trường:
        </p>

        <table class="fade-in">
          <thead>
            <tr>
              <th>Nền tảng</th>
              <th>Đối tượng</th>
              <th>Điểm mạnh</th>
              <th>Hạn chế khi so với Viecz</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Nền tảng"><strong>Nhóm Zalo/Facebook</strong></td>
              <td data-label="Đối tượng">Sinh viên</td>
              <td data-label="Điểm mạnh">Miễn phí, phổ biến</td>
              <td data-label="Hạn chế">Không có bản đồ, không escrow, không đánh giá, tin dễ trôi</td>
            </tr>
            <tr>
              <td data-label="Nền tảng"><strong>TaskRabbit</strong> (Mỹ)</td>
              <td data-label="Đối tượng">Người lớn</td>
              <td data-label="Điểm mạnh">Hệ thống hoàn chỉnh</td>
              <td data-label="Hạn chế">Không hoạt động tại Việt Nam, yêu cầu thẻ tín dụng quốc tế, phí <span class="stat">22.5%</span></td>
            </tr>
            <tr>
              <td data-label="Nền tảng"><strong>Grab/Gojek</strong></td>
              <td data-label="Đối tượng">Tài xế</td>
              <td data-label="Điểm mạnh">Scale lớn, có bản đồ</td>
              <td data-label="Hạn chế">Yêu cầu phương tiện, không hỗ trợ micro-task, không escrow cho dịch vụ tự do</td>
            </tr>
            <tr>
              <td data-label="Nền tảng"><strong>Fiverr/Upwork</strong></td>
              <td data-label="Đối tượng">Freelancer</td>
              <td data-label="Điểm mạnh">Global reach</td>
              <td data-label="Hạn chế">Chỉ dịch vụ online, không local/physical, thanh toán USD, không bản đồ</td>
            </tr>
          </tbody>
        </table>

        <p><strong>Vậy Viecz khác biệt ở đâu?</strong> Ba điểm chính:</p>

        <p>
          <strong>Nhanh và tiện lợi.</strong> Đăng việc trong 30 giây, người gần bạn thấy
          ngay trên bản đồ. Không cần lướt feed dài, không cần chờ admin duyệt bài. Từ lúc
          đăng đến lúc có người nhận — tính bằng phút, không phải giờ. Đây là điều mà nhóm
          Zalo hay Facebook không thể làm được, vì bản chất chúng là công cụ chat, không
          phải nền tảng việc vặt.
        </p>
        <p>
          <strong>Mobile-first, bản đồ là trung tâm.</strong> Khác với hầu hết các nền tảng
          hiển thị danh sách kéo dài, Viecz đặt bản đồ thời gian thực làm giao diện chính.
          Bạn mở ứng dụng và thấy ngay: việc nào gần mình, bao xa, ai đang cần giúp. Hơn
          <span class="stat">95%</span> sinh viên Việt Nam sở hữu smartphone&nbsp;[5] — Viecz
          được thiết kế cho cách họ thực sự dùng thiết bị: nhanh, một tay, đang di chuyển.
        </p>
        <p>
          <strong>Xây dựng cho môi trường Việt Nam.</strong> Đây là điểm mà các nền tảng
          quốc tế không thể cạnh tranh. Viecz dùng PayOS — cổng thanh toán Việt Nam, hỗ trợ
          chuyển khoản ngân hàng nội địa. Sinh viên không cần thẻ tín dụng, không cần PayPal,
          không cần tài khoản USD. Giao diện hoàn toàn tiếng Việt, escrow giữ tiền hộ phù
          hợp với thói quen thanh toán của người Việt. Và mức phí dự kiến chỉ
          <span class="stat">10–15%</span> (so với 22.5% của TaskRabbit) — vì chúng tôi hiểu
          sinh viên Việt Nam không có nhiều tiền.
        </p>
        <p>
          Tóm lại, hiện tại chưa có nền tảng nào tại Việt Nam kết hợp được cả ba yếu tố:
          <strong>tốc độ kết nối theo vị trí</strong>, <strong>thanh toán escrow nội
          địa</strong>, và <strong>trải nghiệm mobile-first</strong> cho micro-task.
        </p>
      </section>

      <!-- ==================== 6. TÍNH KHẢ THI ==================== -->
      <section class="section fade-in">
        <h2><span class="node">6</span>Thuyết minh tính khả thi</h2>

        <h3>6.1. Tính khả thi kỹ thuật</h3>
        <p>
          Điều đầu tiên cần nói rõ: Viecz không phải ý tưởng trên giấy. Sản phẩm đang chạy
          thật, ngay bây giờ, tại
          <strong>https://viecz.fishcmus.io.vn</strong>. Toàn bộ tính năng đã mô tả ở Mục 4
          đều hoạt động: đăng việc, ứng tuyển, thanh toán, chat, tìm kiếm, bản đồ. Ứng dụng
          Android đang thử nghiệm nội bộ.
        </p>
        <p>Về mặt kỹ thuật, hệ thống được xây dựng theo tiêu chuẩn phần mềm chuyên nghiệp:</p>
        <ul>
          <li>
            <strong>Test coverage trên <span class="stat">70%</span></strong> — nghĩa là phần
            lớn code đã được kiểm thử tự động, giảm rủi ro lỗi khi cập nhật.
          </li>
          <li>
            <strong>Tự khởi động lại</strong> khi gặp sự cố — người dùng hầu như không bị
            gián đoạn.
          </li>
          <li>
            <strong>Theo dõi lỗi tự động</strong> (GlitchTip + Prometheus) — đội ngũ biết
            khi nào có vấn đề trước cả người dùng, và có thể xử lý ngay.
          </li>
        </ul>

        <h3>6.2. Tính khả thi kinh tế</h3>
        <p>
          Nguồn thu chính là phí hoa hồng từ mỗi giao dịch có trả công — khoảng
          <span class="stat">10–15%</span> giá trị việc. Để dễ hình dung: một việc 50.000 VND,
          nền tảng giữ lại khoảng 7.500 VND, người nhận việc được 42.500 VND. So với TaskRabbit
          (<span class="stat">22.5%</span>), mức phí này thấp hơn đáng kể và phù hợp hơn với
          túi tiền sinh viên.
        </p>
        <p>
          Hiện tại Viecz chưa thu phí — giai đoạn pilot tập trung hoàn toàn vào việc thu hút
          người dùng và cải thiện sản phẩm dựa trên phản hồi thực. Mô hình doanh thu sẽ được
          kích hoạt khi đã có lượng giao dịch ổn định và người dùng đã quen với nền tảng.
        </p>

        <h3>6.3. Chi phí và vận hành</h3>
        <p>
          Một lợi thế lớn của Viecz là chi phí vận hành cực thấp nhờ đội ngũ tự phát triển
          và sử dụng hoàn toàn công nghệ mã nguồn mở:
        </p>
        <ul>
          <li><strong>VPS (server duy nhất):</strong> <span class="stat">~150.000 VND/tháng</span></li>
          <li><strong>Cloudflare CDN + bảo mật:</strong> Miễn phí</li>
          <li><strong>PayOS (thanh toán):</strong> Miễn phí giai đoạn đầu</li>
          <li><strong>Tổng chi phí vận hành hiện tại:</strong> khoảng <span class="stat">200.000 VND/tháng</span></li>
        </ul>
        <p>
          Dự kiến năm đầu tiên, bao gồm server, domain, và chi phí marketing nhỏ (poster, sự
          kiện tại trường): khoảng <span class="stat">10 triệu VND</span>. Con số này rất thấp
          so với một startup thông thường — và hoàn toàn nằm trong khả năng tự chủ của đội ngũ
          sinh viên.
        </p>

        <h3>6.4. Nhân lực</h3>
        <table class="fade-in">
          <thead>
            <tr>
              <th>Thành viên</th>
              <th>Vai trò</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Thành viên"><strong>Nguyễn Hữu Thiện Nhân</strong></td>
              <td data-label="Vai trò">Quản trị và giám sát hệ thống</td>
            </tr>
            <tr>
              <td data-label="Thành viên"><strong>Trương Hoài Đức</strong></td>
              <td data-label="Vai trò">Kết nối và xây dựng tiếng tăm cho thương hiệu</td>
            </tr>
            <tr>
              <td data-label="Thành viên"><strong>Thái Kha Bảo</strong></td>
              <td data-label="Vai trò">Thiết kế đồ họa cho thương hiệu</td>
            </tr>
            <tr>
              <td data-label="Thành viên"><strong>Trần Gia Sang</strong></td>
              <td data-label="Vai trò">Kỹ thuật viên</td>
            </tr>
          </tbody>
        </table>

        <h3>6.5. Lộ trình</h3>
        <ul>
          <li>
            <strong>MVP hoàn thành</strong> (10/2025 – 02/2026): Toàn bộ tính năng cốt lõi
            đã hoạt động — đăng việc, ứng tuyển, thanh toán, chat, tìm kiếm, bản đồ.
          </li>
          <li>
            <strong>Pilot tại ĐHKHTN</strong> (HK2/2026): Cho sinh viên thật dùng, thu thập
            phản hồi, sửa lỗi, cải thiện trải nghiệm.
          </li>
          <li>
            <strong>Mở rộng</strong> (nếu pilot thành công): Triển khai sang các trường lân
            cận tại TP.HCM.
          </li>
        </ul>
        <p>
          Chúng tôi cố ý giữ lộ trình ngắn và cụ thể — không hứa hẹn những gì chưa chắc
          chắn. Nếu pilot không hiệu quả, chúng tôi sẽ điều chỉnh sản phẩm thay vì mở rộng
          bằng mọi giá.
        </p>
      </section>

      <!-- ==================== 7. TÁC ĐỘNG ==================== -->
      <section class="section fade-in">
        <h2><span class="node">7</span>Ước tính tác động và lợi ích</h2>

        <h3>7.1. Tác động kinh tế</h3>
        <p>
          Sinh viên nhận việc qua Viecz có thể kiếm thêm vài trăm nghìn đến vài triệu mỗi
          tháng, tùy thời gian rảnh — và quan trọng là không ảnh hưởng lịch học, vì các việc
          trên Viecz linh hoạt về thời gian và địa điểm.
        </p>
        <p>
          Phía người thuê cũng được lợi rõ rệt. Ví dụ: thuê thiết kế poster tại tiệm thường
          tốn <span class="stat">200–500k</span>, nhưng nhờ sinh viên thiết kế qua Viecz chỉ
          <span class="stat">50–150k</span> — và sinh viên thiết kế vẫn được trả công xứng
          đáng. Không có trung gian tốn phí, không có chi phí mặt bằng — chỉ hai sinh viên
          giúp nhau.
        </p>
        <p>
          Nếu pilot thành công tại ĐHKHTN với vài trăm người dùng trong học kỳ đầu, đó đã là
          tín hiệu thực tế để mở rộng sang các trường khác tại TP.HCM.
        </p>

        <h3>7.2. Tác động xã hội</h3>
        <p>
          Ngoài kinh tế, Viecz còn tạo ra một giá trị khó đo bằng tiền: <strong>xây dựng thói
          quen giúp nhau có tổ chức</strong> trong cộng đồng sinh viên.
        </p>
        <p>
          Khi nhận một việc trên Viecz, sinh viên phải học cách giao tiếp rõ ràng, thương
          lượng giá cả, giữ cam kết thời gian, và chịu trách nhiệm với kết quả. Đây là những
          kỹ năng mềm mà giảng đường ít dạy nhưng nhà tuyển dụng luôn hỏi — và Viecz tạo
          ra môi trường thực hành tự nhiên cho chúng.
        </p>
        <p>
          Quan trọng hơn, Viecz xây dựng một văn hóa tương trợ khác với "nhờ vả": không dựa
          trên quen biết hay nể nang, mà dựa trên cam kết rõ ràng và sự tin tưởng được hệ
          thống bảo đảm. Bất kỳ sinh viên nào cũng có thể giúp và được giúp — bất kể khoa,
          khóa, hay mối quan hệ cá nhân.
        </p>
      </section>

      <!-- ==================== TÀI LIỆU THAM KHẢO ==================== -->
      <section class="section fade-in">
        <h2><span class="node">*</span>Tài liệu tham khảo</h2>
        <div class="references">
          <p>[1] Statista. "Number of university students in Vietnam from 2013 to 2021." February 2024.</p>
          <p>[2] VietnamNet. "Zalo's number of users hits 78.3 million." August 2025.</p>
          <p>[3] Quora. "What is the pay range for part-time university student jobs in Vietnam?"</p>
          <p>[4] Global Angle. "Vietnam's Education Sector 2025." July 2025.</p>
          <p>[5] Edtech Agency. "Vietnam aiming for 100% smartphone used by the end of 2024." March 2024.</p>
          <p>[6] StatCounter. "Market share of mobile operating systems in Vietnam 2024."</p>
          <p>[7] Sài Gòn Giải Phóng. "Vietnam's university student count to surpass 3 million by 2030." March 2025.</p>
          <p>[8] Vietnam Briefing. "Vietnam's Gig Economy for Foreign Firms." October 2023.</p>
          <p>[9] InfoStride. "TaskRabbit Business and Revenue Model." May 2025.</p>
          <p>[10] Appscrip. "TaskRabbit Business Model and Revenue." December 2024.</p>
          <p>[11] IEEE Xplore. "A Cross-platform Errand Service Application for Campus." 2022.</p>
        </div>
      </section>

      <!-- ==================== FOOTER ==================== -->
      <div class="report-footer">
        <p>Dự án Viecz — Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM — Tháng 3/2026</p>
      </div>

    </article>

    @defer (on idle) {
      <report-init />
    }
  `,
})
export class ReportComponent {
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  isDark = isPlatformBrowser(this.platformId) && localStorage.getItem('report-dark') === '1';

  printReport(): void {
    window.print();
  }

  toggleDark(): void {
    this.isDark = !this.isDark;
    const host = this.el.nativeElement;
    host.classList.toggle('dark', this.isDark);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('report-dark', this.isDark ? '1' : '0');
    }
  }
}
