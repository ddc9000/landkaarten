import {
  clampTrackX,
  maxTrackX,
  positionFromTrackX,
  projectFlick,
  selectLayerAt,
  snapTrackX,
  trackX,
  trackXForLayer,
  type Ruler,
} from "./timeline";

export type LayerMark = {
  timelineLabel: string;
  title: string;
  premium: boolean;
};

const FLICK_CAP = 2.2;

/**
 * Schuif- en flickgedrag van de liniaal. De rekening staat in `timeline.ts`.
 * Tijdens het slepen volgt de gekozen laag het middelpunt; loslaten klikt vast.
 */
export class TimelineRuler {
  private offset = 0;
  private currentId: string | null = null;
  private anim = 0;
  private wheelTimer = 0;
  private suppressClick = false;
  private readonly reduced: boolean;
  private drag: {
    id: number;
    originX: number;
    originOffset: number;
    lastX: number;
    lastT: number;
    vx: number;
    moved: boolean;
  } | null = null;

  constructor(
    private readonly viewport: HTMLElement,
    private readonly track: HTMLElement,
    private readonly needle: HTMLElement,
    private readonly ruler: Ruler,
    private readonly marks: ReadonlyMap<string, LayerMark>,
    private readonly onScrub: (layerId: string) => void,
  ) {
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.viewport.setAttribute("aria-valuemin", String(ruler.stops[0]?.year ?? ruler.startYear));
    this.viewport.setAttribute("aria-valuemax", String(ruler.stops.at(-1)?.year ?? ruler.endYear));
    this.viewport.setAttribute("aria-orientation", "horizontal");
    this.buildTicks();
    this.listen();
    const observer = new ResizeObserver(() => this.paint(false));
    observer.observe(this.viewport);
  }

  centerOn(layerId: string, animate: boolean): void {
    const x = trackXForLayer(this.ruler, layerId);
    if (!animate || this.reduced) {
      this.cancelAnim();
      this.offset = x;
      this.currentId = layerId;
      this.paint(false);
      this.markCurrent(layerId);
      return;
    }
    this.animateTo(x);
  }

  sync(layerId: string, outside: ReadonlySet<string>): void {
    this.markCurrent(layerId);
    for (const tick of this.track.querySelectorAll<HTMLElement>("[data-layer]")) {
      const id = tick.dataset.layer;
      tick.classList.toggle("outside", !!id && outside.has(id));
    }
  }

  private buildTicks(): void {
    this.track.replaceChildren();
    this.track.style.width = `${maxTrackX(this.ruler)}px`;

    const zone = document.createElement("div");
    zone.className = "future-zone";
    const futureStart = trackX(this.ruler, this.ruler.todayYear);
    zone.style.left = `${futureStart}px`;
    zone.style.width = `${maxTrackX(this.ruler) - futureStart}px`;
    this.track.append(zone);

    for (const tick of this.ruler.ticks) {
      const el = document.createElement("div");
      el.className = `tick ${tick.kind}`;
      el.style.left = `${trackX(this.ruler, tick.position)}px`;
      el.dataset.pos = String(tick.position);
      if (tick.layerId) {
        el.dataset.layer = tick.layerId;
        const mark = this.marks.get(tick.layerId);
        if (mark?.premium) el.classList.add("premium");
        el.setAttribute("role", "presentation");
      } else {
        el.setAttribute("aria-hidden", "true");
      }

      const stem = document.createElement("span");
      stem.className = "mark";
      el.append(stem);
      if (tick.label) {
        const label = document.createElement("span");
        label.className = "tick-label";
        label.textContent = tick.label;
        el.append(label);
      }
      this.track.append(el);
    }
  }

  private listen(): void {
    this.viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      this.cancelAnim();
      this.suppressClick = false;
      window.clearTimeout(this.wheelTimer);
      this.viewport.setPointerCapture(event.pointerId);
      this.drag = {
        id: event.pointerId,
        originX: event.clientX,
        originOffset: this.offset,
        lastX: event.clientX,
        lastT: event.timeStamp,
        vx: 0,
        moved: false,
      };
    });

    this.viewport.addEventListener("pointermove", (event) => {
      if (!this.drag || event.pointerId !== this.drag.id) return;
      const dx = event.clientX - this.drag.originX;
      if (Math.abs(dx) > 6) this.drag.moved = true;
      const dt = event.timeStamp - this.drag.lastT;
      if (dt > 0 && dt < 48) this.drag.vx = -(event.clientX - this.drag.lastX) / dt;
      else if (dt >= 48) this.drag.vx = 0;
      this.drag.lastX = event.clientX;
      this.drag.lastT = event.timeStamp;
      this.offset = clampTrackX(this.ruler, this.drag.originOffset - dx);
      this.paint(true);
    });

    const endDrag = (event: PointerEvent) => {
      if (!this.drag || event.pointerId !== this.drag.id) return;
      const drag = this.drag;
      this.drag = null;
      if (!drag.moved) return;
      this.suppressClick = true;
      const capped = Math.max(-FLICK_CAP, Math.min(FLICK_CAP, drag.vx));
      const projected = projectFlick(this.offset, capped, 0, maxTrackX(this.ruler));
      this.animateTo(snapTrackX(this.ruler, projected));
    };

    this.viewport.addEventListener("pointerup", endDrag);
    this.viewport.addEventListener("pointercancel", endDrag);

    this.viewport.addEventListener("click", (event) => {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      const rect = this.track.getBoundingClientRect();
      const x = event.clientX - rect.left;
      if (x < -8 || x > maxTrackX(this.ruler) + 8) return;
      this.animateTo(snapTrackX(this.ruler, x));
    });

    this.viewport.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        this.cancelAnim();
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        this.offset = clampTrackX(this.ruler, this.offset + delta);
        this.paint(true);
        window.clearTimeout(this.wheelTimer);
        this.wheelTimer = window.setTimeout(() => {
          this.animateTo(snapTrackX(this.ruler, this.offset));
        }, 140);
      },
      { passive: false },
    );

    this.viewport.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      event.stopPropagation();
      const dir = event.key === "ArrowLeft" ? -1 : 1;
      const index = this.ruler.stops.findIndex((stop) => stop.layerId === this.currentId);
      const next = this.ruler.stops[index + dir];
      if (!next) return;
      this.animateTo(trackX(this.ruler, next.position));
    });
  }

  private animateTo(x: number): void {
    const target = clampTrackX(this.ruler, x);
    this.cancelAnim();
    if (this.reduced || Math.abs(target - this.offset) < 0.5) {
      this.offset = target;
      this.paint(true);
      return;
    }
    const from = this.offset;
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / 320);
      const eased = 1 - (1 - t) ** 3;
      this.offset = from + (target - from) * eased;
      this.paint(true);
      if (t < 1) this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  }

  private cancelAnim(): void {
    if (this.anim) cancelAnimationFrame(this.anim);
    this.anim = 0;
  }

  private paint(notify: boolean): void {
    const pad = this.viewport.clientWidth / 2;
    this.track.style.transform = `translate3d(${pad - this.offset}px,0,0)`;
    if (!notify) return;
    const id = selectLayerAt(this.ruler, positionFromTrackX(this.ruler, this.offset));
    if (id === this.currentId) return;
    this.currentId = id;
    this.markCurrent(id);
    this.pulse();
    this.onScrub(id);
  }

  private markCurrent(layerId: string): void {
    this.currentId = layerId;
    for (const tick of this.track.querySelectorAll<HTMLElement>("[data-layer]")) {
      const on = tick.dataset.layer === layerId;
      tick.classList.toggle("is-current", on);
    }
    const mark = this.marks.get(layerId);
    const stop = this.ruler.stops.find((item) => item.layerId === layerId);
    this.viewport.setAttribute("aria-valuenow", String(stop?.year ?? ""));
    this.viewport.setAttribute(
      "aria-valuetext",
      mark ? `${mark.timelineLabel}, ${mark.title}` : layerId,
    );
  }

  private pulse(): void {
    this.needle.classList.remove("hit");
    void this.needle.offsetWidth;
    this.needle.classList.add("hit");
    if (this.reduced) return;
    navigator.vibrate?.(12);
  }
}
