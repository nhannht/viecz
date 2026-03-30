import { Component, ViewEncapsulation } from '@angular/core';
import { GuideChapterComponent } from '../shared/components/guide-chapter.component';
import { GuideStepComponent } from '../shared/components/guide-step.component';
import { GuideCalloutComponent } from '../shared/components/guide-callout.component';
import { GuideTocComponent, type TocItem } from '../shared/components/guide-toc.component';
@Component({
  selector: 'app-howtouse',
  standalone: true,
  imports: [
    GuideChapterComponent,
    GuideStepComponent,
    GuideCalloutComponent,
    GuideTocComponent,
  ],
  templateUrl: './howtouse.component.html',
  styleUrl: './howtouse.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class HowToUseComponent {
  tocItems: TocItem[] = [
    { number: 1, title: 'Đăng ký & Đăng nhập', anchor: 'ch1' },
    { number: 2, title: 'Tìm việc trên Chợ việc', anchor: 'ch2' },
    { number: 3, title: 'Đăng một công việc', anchor: 'ch3' },
    { number: 4, title: 'Ứng tuyển công việc', anchor: 'ch4' },
    { number: 5, title: 'Chấp nhận & Trò chuyện', anchor: 'ch5' },
    { number: 6, title: 'Thanh toán & Ví', anchor: 'ch6' },
    { number: 7, title: 'Hoàn thành công việc', anchor: 'ch7' },
  ];

  print() {
    window.print();
  }
}
