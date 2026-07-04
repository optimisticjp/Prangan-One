import { useData } from '../../lib/store'
import { Badge, Card, PageHeader, TableWrap, td, th } from '../../components/ui'

export default function OwnerActivity() {
  const { rawDb } = useData()
  const societyName = (id: string) => rawDb.societies.find(s => s.id === id)?.name ?? id

  const audit = [...rawDb.auditLogs].sort((a, b) => b.at.localeCompare(a.at))
  const impersonations = [...rawDb.impersonationLogs].sort((a, b) => b.enteredAt.localeCompare(a.enteredAt))

  return (
    <div>
      <PageHeader title="એક્ટિવિટી લોગ" sub="ઓડિટ ટ્રેલ અને ઓનર 'view as' સેશન, બંને અહીં" />

      <Card className="mb-4">
        <h2 className="font-bold text-navy-800 mb-3">ઓનર impersonation સેશન</h2>
        <p className="text-[12.5px] text-navy-400 mb-3">દરેક "કમિટી તરીકે જુઓ" સેશન અહીં લોગ થાય છે, read-only કે write બંને, જેમ roadmap ના non-negotiable માં કહ્યું છે.</p>
        <TableWrap>
          <thead><tr><th className={th}>સોસાયટી</th><th className={th}>મોડ</th><th className={th}>કારણ</th><th className={th}>શરૂ</th><th className={th}>પૂરું</th></tr></thead>
          <tbody>
            {impersonations.map(l => (
              <tr key={l.id} className="hover:bg-cream-50">
                <td className={td}>{societyName(l.societyId)}</td>
                <td className={td}><Badge tone={l.mode === 'write' ? 'red' : 'gray'}>{l.mode === 'write' ? 'write-capable' : 'read-only'}</Badge></td>
                <td className={td}>{l.reason ?? <span className="text-navy-300">-</span>}</td>
                <td className={td}>{new Date(l.enteredAt).toLocaleString('en-IN')}</td>
                <td className={td}>{l.exitedAt ? new Date(l.exitedAt).toLocaleString('en-IN') : <span className="text-saffron-600 font-semibold">ચાલુ છે</span>}</td>
              </tr>
            ))}
            {impersonations.length === 0 && <tr><td className={td} colSpan={5}>હજુ કોઈ impersonation સેશન નથી.</td></tr>}
          </tbody>
        </TableWrap>
      </Card>

      <Card>
        <h2 className="font-bold text-navy-800 mb-3">ઓડિટ લોગ</h2>
        <TableWrap>
          <thead><tr><th className={th}>સોસાયટી</th><th className={th}>ક્રિયા</th><th className={th}>વિગત</th><th className={th}>કોણે</th><th className={th}>ક્યારે</th></tr></thead>
          <tbody>
            {audit.map(a => (
              <tr key={a.id} className="hover:bg-cream-50">
                <td className={td}>{societyName(a.societyId)}</td>
                <td className={td}><code className="text-[12px] bg-cream-100 px-1.5 py-0.5 rounded">{a.action}</code></td>
                <td className={td}>{a.detail}</td>
                <td className={td}>{a.actor}</td>
                <td className={td}>{new Date(a.at).toLocaleString('en-IN')}</td>
              </tr>
            ))}
            {audit.length === 0 && <tr><td className={td} colSpan={5}>હજુ કોઈ ઓડિટ એન્ટ્રી નથી.</td></tr>}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  )
}
