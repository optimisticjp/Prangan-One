export const GUJ_MONTHS = ['જાન્યુઆરી','ફેબ્રુઆરી','માર્ચ','એપ્રિલ','મે','જૂન','જુલાઈ','ઓગસ્ટ','સપ્ટેમ્બર','ઓક્ટોબર','નવેમ્બર','ડિસેમ્બર']

export const inr = (n: number) => '₹' + n.toLocaleString('en-IN')

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${GUJ_MONTHS[m - 1]} ${y}`
}
export const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return `${GUJ_MONTHS[m - 1]} ${y}`
}
export const todayISO = () => new Date().toISOString().slice(0, 10)
export const thisMonth = () => new Date().toISOString().slice(0, 7)
export const monthAdd = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export const lastMonths = (n: number, from = thisMonth()) => {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(monthAdd(from, -i))
  return out
}
