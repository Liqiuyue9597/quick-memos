// Minimal mock of the obsidian module for unit testing.
// Only types/classes referenced by testable code need stubs here.

// ---------------------------------------------------------------------------
// EventRef & Events base class
// ---------------------------------------------------------------------------

export interface EventRef {
  evtName: string;
  callback: Function;
}

export class Events {
  /** Internal handler map — exposed for test inspection. */
  _handlers: Map<string, Function[]> = new Map();

  on(name: string, callback: Function): EventRef {
    const list = this._handlers.get(name) ?? [];
    list.push(callback);
    this._handlers.set(name, list);
    return { evtName: name, callback };
  }

  off(name: string, callback: Function) {
    const list = this._handlers.get(name);
    if (!list) return;
    const idx = list.indexOf(callback);
    if (idx !== -1) list.splice(idx, 1);
  }

  trigger(name: string, ...args: unknown[]) {
    const list = this._handlers.get(name);
    if (!list) return;
    for (const cb of [...list]) {
      cb(...args);
    }
  }
}

// ---------------------------------------------------------------------------
// Component & ItemView
// ---------------------------------------------------------------------------

export class Component {
  _registeredEvents: EventRef[] = [];

  registerEvent(ref: EventRef) {
    this._registeredEvents.push(ref);
  }
}

export class ItemView extends Component {
  app: App;
  leaf: WorkspaceLeaf;

  contentEl: Record<string, Function> & { closest: Function; empty: Function; addClass: Function; createDiv: Function; createEl: Function; createSpan: Function; querySelector: Function; appendText: Function };

  constructor(leaf: WorkspaceLeaf) {
    super();
    this.leaf = leaf;
    this.app = leaf.app ?? ({} as App);

    // Stub DOM element with no-op methods that return themselves for chaining
    const stubEl: any = {
      addClass: () => stubEl,
      empty: () => stubEl,
      createDiv: () => stubEl,
      createEl: () => stubEl,
      createSpan: () => stubEl,
      closest: () => null,
      querySelector: () => null,
      appendText: () => stubEl,
      setText: () => stubEl,
      addEventListener: () => {},
      dataset: {},
    };
    this.contentEl = stubEl;
  }

  getViewType(): string {
    return "";
  }
  getDisplayText(): string {
    return "";
  }
  getIcon(): string {
    return "";
  }
}

// ---------------------------------------------------------------------------
// File types
// ---------------------------------------------------------------------------

export class TFile {
  path = "";
  name = "";
  basename = "";
  extension = "";
  stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder {
  path = "";
  children: unknown[] = [];
}

// ---------------------------------------------------------------------------
// WorkspaceLeaf
// ---------------------------------------------------------------------------

export class WorkspaceLeaf {
  app: App;
  view: any = null;

  constructor(app?: App) {
    this.app = app ?? ({} as App);
  }

  setViewState(_state: any) {
    return Promise.resolve();
  }

  openFile(_file: TFile) {
    return Promise.resolve();
  }

  detach() {}
}

// ---------------------------------------------------------------------------
// Workspace, Vault, MetadataCache
// ---------------------------------------------------------------------------

export class Workspace extends Events {
  getLeavesOfType(_type: string): WorkspaceLeaf[] {
    return [];
  }

  getLeaf(_mode?: string): WorkspaceLeaf {
    return new WorkspaceLeaf();
  }

  revealLeaf(_leaf: WorkspaceLeaf) {}

  openLinkText(_linktext: string, _sourcePath: string, _newLeaf?: boolean) {
    return Promise.resolve();
  }

  onLayoutReady(_cb: () => void) {}
}

export class Vault extends Events {
  /** Internal file map — test code populates this. */
  _files: Map<string, string> = new Map();
  /** Internal abstract-file map — test code populates this. */
  _abstractFiles: Map<string, TFile | TFolder> = new Map();

  getAbstractFileByPath(path: string): TFile | TFolder | null {
    return this._abstractFiles.get(path) ?? null;
  }

  read(file: TFile): Promise<string> {
    return Promise.resolve(this._files.get(file.path) ?? "");
  }

  getResourcePath(_file: TFile): string {
    return "";
  }

  create(_path: string, _content: string): Promise<TFile> {
    return Promise.resolve(new TFile());
  }

  createFolder(_path: string): Promise<void> {
    return Promise.resolve();
  }
}

export class MetadataCache extends Events {
  /** Internal cache map — test code populates this. */
  _cache: Map<string, any> = new Map();

  getFileCache(file: TFile): any | null {
    return this._cache.get(file.path) ?? null;
  }

  getFirstLinkpathDest(_linkpath: string, _sourcePath: string): TFile | null {
    return null;
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export class App {
  vault: Vault;
  metadataCache: MetadataCache;
  workspace: Workspace;

  constructor() {
    this.vault = new Vault();
    this.metadataCache = new MetadataCache();
    this.workspace = new Workspace();
  }
}

// ---------------------------------------------------------------------------
// UI stubs (unchanged from original)
// ---------------------------------------------------------------------------

export class Modal {
  app: unknown;
  constructor(app: unknown) {
    this.app = app;
  }
  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class FuzzySuggestModal<T> extends Modal {
  setPlaceholder(_text: string) {}
  getItems(): T[] {
    return [];
  }
  getItemText(_item: T): string {
    return "";
  }
  onChooseItem(_item: T): void {}
}

export class Notice {
  constructor(_message: string) {}
}

export class Platform {
  static isMobile = false;
}

export class Plugin extends Component {
  app: App;
  constructor(app?: App) {
    super();
    this.app = app ?? new App();
  }
  loadData(): Promise<any> {
    return Promise.resolve({});
  }
  saveData(_data: any): Promise<void> {
    return Promise.resolve();
  }
  registerView(_type: string, _factory: (leaf: WorkspaceLeaf) => ItemView) {}
  addCommand(_cmd: any) {}
  addRibbonIcon(_icon: string, _title: string, _cb: () => void) {}
  addSettingTab(_tab: any) {}
  registerObsidianProtocolHandler(_action: string, _handler: (params: any) => void) {}
  registerMarkdownPostProcessor(_processor: any) {}
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export function setIcon(_el: unknown, _icon: string): void {
  // no-op for testing
}

export function getLanguage(): string {
  return "en";
}

export function addIcon(_name: string, _svg: string): void {
  // no-op for testing
}
