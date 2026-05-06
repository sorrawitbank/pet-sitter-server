type WithOrder = {
  order: number;
};

function mergeItemsByOrder<T extends WithOrder>(
  orderedItems: T[],
  missingItems: Omit<T, "order">[],
): T[] {
  // case: orderedItems empty
  if (orderedItems.length === 0) {
    return missingItems.map(
      (item, index) =>
        ({
          order: index,
          ...item,
        } as T),
    );
  }

  const orderMap = new Map<number, T>();

  for (const item of orderedItems) {
    orderMap.set(item.order, item);
  }

  const maxOrder = Math.max(...orderedItems.map((i) => i.order));

  const result: T[] = [];
  let missingIndex = 0;

  for (let position = 0; position <= maxOrder; position++) {
    if (orderMap.has(position)) {
      result.push(orderMap.get(position)!);
    } else if (missingIndex < missingItems.length) {
      result.push({
        order: position,
        ...missingItems[missingIndex++],
      } as T);
    }
  }

  // append remaining
  while (missingIndex < missingItems.length) {
    result.push({
      order: result.length,
      ...missingItems[missingIndex++],
    } as T);
  }

  return result;
}

export default mergeItemsByOrder;
