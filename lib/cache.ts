type Node = {
  content: { key: string; cachedAt: number; value: unknown };
  previous?: Node;
  next?: Node;
};

export const cache = (max: number, ttl?: number) => {
  const cacheTtl = ttl;
  const nodes: Record<string, Node> = {};
  let first: string | undefined = undefined;
  let last: string | undefined = undefined;
  let size = 0;

  const remove = (key: string) => {
    const node = nodes[key];

    if (node.next) {
      node.next.previous = node.previous;
    } else {
      last = node.previous?.content.key;
    }

    if (node.previous) {
      node.previous.next = node.next;
    } else {
      first = node.next?.content.key;
    }

    size--;
    delete nodes[key];
  };

  const add = (key: string, value: unknown) => {
    const node: Node = {
      content: {
        key,
        cachedAt: Date.now(),
        value
      }
    };

    nodes[key] = node;
    size++;

    if (first) {
      node.next = nodes[first];
      nodes[first].previous = node;
    }
    first = key;
  };

  const get = async <T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    const node = nodes[key];

    let value = node?.content.value;
    const now = Date.now();
    if (
      node === undefined ||
      (ttl && node.content.cachedAt < now - ttl) ||
      (cacheTtl && node.content.cachedAt < now - cacheTtl)
    ) {
      value = await fetcher();
    }

    if (node) {
      remove(node.content.key);
    }

    add(key, value);

    if (size > max && last) {
      remove(last);
    }

    return value as T;
  };

  return {
    get
  };
};
