type Listener = () => void;

class LocalMap<K extends string, V> {
  private store: Map<K, V>;
  private listeners: Listener[] = [];

  constructor(initialValues?: Iterable<readonly [K, V]>) {
    this.store = new Map<K, V>(initialValues);
  }

  get(key: K): V | undefined {
    return this.store.get(key);
  }

  set(key: K, value: V): this {
    this.store.set(key, value);
    this.notifyListeners();
    return this;
  }

  delete(key: K): boolean {
    const result = this.store.delete(key);
    if (result) {
      this.notifyListeners();
    }
    return result;
  }

  has(key: K): boolean {
    return this.store.has(key);
  }

  clear(): void {
    this.store.clear();
    this.notifyListeners();
  }

  get size(): number {
    return this.store.size;
  }

  entries(): IterableIterator<[K, V]> {
    return this.store.entries();
  }

  keys(): IterableIterator<K> {
    return this.store.keys();
  }

  values(): IterableIterator<V> {
    return this.store.values();
  }

  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void): void {
    this.store.forEach(callbackfn);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }
}

export { LocalMap };
