const KEY = 'market:reported-listings'
const MAX = 500

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as number[]) : []
  } catch {
    return []
  }
}

export function isReported(id: number): boolean {
  return read().includes(id)
}

export function markReported(id: number): void {
  const cur = read().filter((x) => x !== id)
  localStorage.setItem(KEY, JSON.stringify([id, ...cur].slice(0, MAX)))
}
