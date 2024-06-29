import { ScrollBox } from '@pixi/ui';
import { Signal } from 'typed-signals';

class TrackableScrollBox extends ScrollBox {
  onScroll: Signal<(value: number) => void> = new Signal();

  protected onMouseScroll(event: WheelEvent): void {
    const isVertical: boolean = this.options.type !== 'horizontal';
    const oldScrollPos = isVertical ? this.scrollY : this.scrollX;

    super.onMouseScroll(event);

    const newScrollPos = isVertical ? this.scrollY : this.scrollX;

    if (newScrollPos !== oldScrollPos) {
      this.onScroll?.emit(newScrollPos);
    }
  }

  get scrollHeight(): number {
    return this.list.height;
  }

  get scrollWidth(): number {
    return this.list.width;
  }
}

export {
  TrackableScrollBox
};