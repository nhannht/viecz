import type { WhaleSceneContext } from './whale-scene.constants';

/** Structured log panel in the debug popup window */
export class WhaleDebugLog {
  panel: HTMLDivElement | null = null;
  private content: HTMLDivElement | null = null;
  entries: Record<string, unknown>[] = [];
  private lastSample = 0;
  private readonly SAMPLE_MS = 500;
  private readonly MAX_ENTRIES = 200;

  init(doc: Document): void {
    const panel = doc.createElement('div');
    panel.style.cssText =
      'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;';

    const header = doc.createElement('div');
    header.style.cssText =
      'display:flex;justify-content:space-between;align-items:center;' +
      'padding:8px 10px;border-bottom:1px solid #444488;flex-shrink:0;';

    const title = doc.createElement('span');
    title.textContent = 'Structured Log (every 500ms)';
    title.style.cssText = 'color:#8888cc;font-weight:bold;';
    header.appendChild(title);

    const btnGroup = doc.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:6px;';

    const btnStyle =
      'padding:2px 8px;background:#333366;color:#aabbdd;border:1px solid #555588;' +
      'border-radius:3px;cursor:pointer;font-family:monospace;font-size:10px;';

    const copyBtn = doc.createElement('button');
    copyBtn.textContent = 'Copy JSON';
    copyBtn.style.cssText = btnStyle;
    copyBtn.addEventListener('click', () => this.copyLog(doc));

    const exportBtn = doc.createElement('button');
    exportBtn.textContent = 'Export .json';
    exportBtn.style.cssText = btnStyle;
    exportBtn.addEventListener('click', () => this.exportLog(doc));

    const clearBtn = doc.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = btnStyle;
    clearBtn.addEventListener('click', () => this.clear());

    btnGroup.appendChild(copyBtn);
    btnGroup.appendChild(exportBtn);
    btnGroup.appendChild(clearBtn);
    header.appendChild(btnGroup);
    panel.appendChild(header);

    const content = doc.createElement('div');
    content.style.cssText =
      'overflow-y:auto;padding:6px 10px;flex:1;min-height:0;' +
      'white-space:pre;line-height:1.5;';
    panel.appendChild(content);

    this.panel = panel;
    this.content = content;
  }

  update(ctx: WhaleSceneContext, vx: number, vy: number, vz: number, showLogPanel: boolean, popupDoc: Document | null): void {
    if (!this.content || !showLogPanel) return;

    const now = performance.now();
    if (now - this.lastSample < this.SAMPLE_MS) return;
    this.lastSample = now;

    const doc = popupDoc ?? document;

    const entry: Record<string, unknown> = {
      t: +(now / 1000).toFixed(2),
      pos: { x: +ctx.whalePos.x.toFixed(3), y: +ctx.whalePos.y.toFixed(3), z: +ctx.whalePos.z.toFixed(3) },
      vel: { x: +vx.toFixed(5), y: +vy.toFixed(5), z: +vz.toFixed(5) },
      rot: ctx.modelGroup ? {
        y: +(ctx.modelGroup.rotation.y * 180 / Math.PI).toFixed(1),
        x: +(ctx.modelGroup.rotation.x * 180 / Math.PI).toFixed(1),
      } : null,
      dir: ctx.activeDir,
      entering: ctx.enteringScene,
      reacting: ctx.isReacting,
      weights: {
        fwd: +(ctx.dirActions.forward?.getEffectiveWeight() ?? 0).toFixed(3),
        left: +(ctx.dirActions.left?.getEffectiveWeight() ?? 0).toFixed(3),
        right: +(ctx.dirActions.right?.getEffectiveWeight() ?? 0).toFixed(3),
        up: +(ctx.dirActions.up?.getEffectiveWeight() ?? 0).toFixed(3),
        down: +(ctx.dirActions.down?.getEffectiveWeight() ?? 0).toFixed(3),
        surface: +(ctx.surfaceAction?.getEffectiveWeight() ?? 0).toFixed(3),
        gulp: +(ctx.gulpAction?.getEffectiveWeight() ?? 0).toFixed(3),
      },
      swimRange: { x: +ctx.swimRangeX.toFixed(2), y: +ctx.swimRangeY.toFixed(2), z: +ctx.swimRangeZ.toFixed(2) },
      target: { x: +ctx.whaleTarget.x.toFixed(3), y: +ctx.whaleTarget.y.toFixed(3), z: +ctx.whaleTarget.z.toFixed(3) },
    };

    this.entries.push(entry);
    if (this.entries.length > this.MAX_ENTRIES) this.entries.shift();

    const line = doc.createElement('div');
    line.textContent = JSON.stringify(entry);
    line.style.borderBottom = '1px solid #222244';
    line.style.padding = '2px 0';
    this.content.appendChild(line);

    while (this.content.childNodes.length > this.MAX_ENTRIES) {
      this.content.removeChild(this.content.firstChild!);
    }

    this.content.scrollTop = this.content.scrollHeight;
  }

  clear(): void {
    this.entries = [];
    if (this.content) this.content.textContent = '';
  }

  private copyLog(doc: Document): void {
    const json = JSON.stringify(this.entries, null, 2);
    const ta = doc.createElement('textarea');
    ta.value = json;
    ta.style.cssText = 'position:fixed;left:-9999px;';
    doc.body.appendChild(ta);
    ta.select();
    doc.execCommand('copy');
    ta.remove();
    console.log(`[whale:debug] Copied ${this.entries.length} log entries to clipboard`);
  }

  private exportLog(doc: Document): void {
    const json = JSON.stringify(this.entries, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = `whale-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    doc.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  destroy(): void {
    this.panel = null;
    this.content = null;
    this.entries = [];
  }
}
