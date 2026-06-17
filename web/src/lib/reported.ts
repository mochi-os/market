const KEY = 'market:reported-listings'
const MAX = 500

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function isReported(id: string): boolean {
  return read().includes(id)
}

export function markReported(id: string): void {
  const cur = read().filter((x) => x !== id)
  localStorage.setItem(KEY, JSON.stringify([id, ...cur].slice(0, MAX)))
}
