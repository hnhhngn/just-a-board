export function moveOrderToFront(order, selectedSet) {
  const rest = order.filter((obj) => !selectedSet.has(obj));
  const picked = order.filter((obj) => selectedSet.has(obj));
  return [...rest, ...picked];
}

export function moveOrderToBack(order, selectedSet) {
  const rest = order.filter((obj) => !selectedSet.has(obj));
  const picked = order.filter((obj) => selectedSet.has(obj));
  return [...picked, ...rest];
}

export function moveOrderForward(order, selectedSet) {
  const next = [...order];
  for (let i = next.length - 2; i >= 0; i -= 1) {
    if (selectedSet.has(next[i]) && !selectedSet.has(next[i + 1])) {
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
    }
  }
  return next;
}

export function moveOrderBackward(order, selectedSet) {
  const next = [...order];
  for (let i = 1; i < next.length; i += 1) {
    if (selectedSet.has(next[i]) && !selectedSet.has(next[i - 1])) {
      [next[i], next[i - 1]] = [next[i - 1], next[i]];
    }
  }
  return next;
}
