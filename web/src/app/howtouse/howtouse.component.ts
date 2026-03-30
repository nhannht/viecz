import { Component, ViewEncapsulation } from '@angular/core';
import { GuideChapterComponent } from '../shared/components/guide-chapter.component';
import { GuideStepComponent } from '../shared/components/guide-step.component';
import { GuideCalloutComponent } from '../shared/components/guide-callout.component';
import { GuideScreenshotComponent } from '../shared/components/guide-screenshot.component';
import { GuideTocComponent, type TocItem } from '../shared/components/guide-toc.component';
@Component({
  selector: 'app-howtouse',
  standalone: true,
  imports: [
    GuideChapterComponent,
    GuideStepComponent,
    GuideCalloutComponent,
    GuideScreenshotComponent,
    GuideTocComponent,
  ],
  templateUrl: './howtouse.component.html',
  styleUrl: './howtouse.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class HowToUseComponent {
  tocItems: TocItem[] = [
    { number: 1, title: 'Đăng ký tài khoản', anchor: 'ch1' },
    { number: 2, title: 'Đăng nhập', anchor: 'ch2' },
    { number: 3, title: 'Tìm việc trên bản đồ', anchor: 'ch3' },
    { number: 4, title: 'Đăng một công việc', anchor: 'ch4' },
    { number: 5, title: 'Ứng tuyển công việc', anchor: 'ch5' },
    { number: 6, title: 'Chấp nhận & Trò chuyện', anchor: 'ch6' },
    { number: 7, title: 'Thanh toán & Ví', anchor: 'ch7' },
    { number: 8, title: 'Hoàn thành công việc', anchor: 'ch8' },
  ];

  print() {
    window.print();
  }
}
