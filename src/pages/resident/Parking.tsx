import { Bike, CarFront, Info } from 'lucide-react'
import { useData } from '../../lib/store'
import { Badge, Card, EmptyState, PageHeader } from '../../components/ui'

export default function Parking() {
  const { db, session } = useData()
  const mine = db.vehicles.filter(v => v.flatId === session.flatId)

  return (
    <div>
      <PageHeader title="મારું પાર્કિંગ" sub="તમારા ફ્લેટના નોંધાયેલા વાહન" />
      {mine.length === 0 ? (
        <Card><EmptyState icon={<CarFront size={22} />} title="કોઈ વાહન નોંધાયેલું નથી" sub="વાહન ઉમેરવા કમિટીને જણાવો." /></Card>
      ) : (
        <div className="space-y-2.5">
          {mine.map((v, i) => (
            <Card key={v.id} className="animate-fadeUp flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-saffron-50 border border-saffron-100 text-saffron-600 flex items-center justify-center">
                {v.kind === '2W' ? <Bike size={21} /> : <CarFront size={21} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-navy-900 num">{v.number}</div>
                <div className="text-[12.5px] text-navy-400">{v.kind === '2W' ? 'ટુ-વ્હીલર' : 'ફોર-વ્હીલર'} · {v.ownerType === 'tenant' ? 'ભાડૂત' : 'માલિક'}</div>
              </div>
              <Badge tone="saffron">સ્લોટ {v.slot}</Badge>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-start gap-2 text-[13px] text-navy-500 bg-cream-100 border border-cream-200 rounded-xl px-3.5 py-2.5">
        <Info size={15} className="shrink-0 mt-0.5" /> વાહન બદલવું હોય કે નવું ઉમેરવું હોય તો કમિટીને જણાવો. મહેમાનની ગાડી ગેટ પાસે જ પાર્ક કરવી.
      </div>
    </div>
  )
}
