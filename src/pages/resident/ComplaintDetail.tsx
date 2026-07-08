import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Star, ImageIcon } from 'lucide-react'
import { useData } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import { complaintStatusLabel, complaintStatusTone } from '../../lib/copy'
import { Badge, Button, Card, Textarea } from '../../components/ui'

export default function ComplaintDetail() {
  const { id } = useParams()
  const { db, session, addFeedback, getComplaintPhotoUrl } = useData()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const c = db.complaints.find(x => x.id === id && x.flatId === session.flatId)

  useEffect(() => {
    if (!c?.photoPath) { setPhotoUrl(null); return }
    let cancelled = false
    getComplaintPhotoUrl(c.photoPath).then(url => { if (!cancelled) setPhotoUrl(url) })
    return () => { cancelled = true }
  }, [c?.photoPath, getComplaintPhotoUrl])

  if (!c) return (
    <Card>
      <div className="text-navy-500">આ ફરિયાદ મળી નહીં.</div>
      <Link to="/app/complaints" className="text-saffron-600 font-semibold text-[14px] inline-flex items-center gap-1 mt-2"><ArrowLeft size={15} /> પાછા જાઓ</Link>
    </Card>
  )

  const canFeedback = (c.status === 'done' || c.status === 'closed') && !c.feedback && !sent
  const submit = () => {
    if (!rating) return
    addFeedback(c.id, rating, comment.trim())
    setSent(true)
  }

  return (
    <div className="space-y-4">
      <Link to="/app/complaints" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-navy-500"><ArrowLeft size={16} /> બધી ફરિયાદો</Link>

      <Card className="animate-fadeUp">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={complaintStatusTone[c.status]}>{complaintStatusLabel[c.status]}</Badge>
          {c.priority === 'urgent' && <Badge tone="red">તાત્કાલિક</Badge>}
          <span className="text-[12.5px] text-navy-400 ml-auto">{c.category}</span>
        </div>
        <h1 className="text-[19px] font-bold text-navy-900 mt-2 leading-snug">{c.title}</h1>
        {c.detail && <p className="text-[14.5px] text-navy-600 mt-1.5">{c.detail}</p>}
        {photoUrl ? (
          <a href={photoUrl} target="_blank" rel="noreferrer" className="block mt-2.5">
            <img src={photoUrl} alt="ફરિયાદનો ફોટો" className="rounded-xl border border-cream-200 max-h-56 object-cover" />
          </a>
        ) : c.hasPhoto && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-navy-400 bg-cream-100 border border-cream-200 rounded-lg px-2.5 py-1">
            <ImageIcon size={14} /> ફોટો જોડેલો: {c.photoName}
          </div>
        )}
        {c.assignedTo && <div className="mt-2 text-[13.5px] text-navy-500">જવાબદારી: <b className="text-navy-700">{c.assignedTo}</b></div>}
      </Card>

      {/* timeline */}
      <Card className="animate-fadeUp">
        <h2 className="font-bold text-navy-800 mb-3">શું થયું અત્યાર સુધી</h2>
        <ol className="relative border-l-2 border-cream-300 ml-2 space-y-4">
          {[...c.timeline].reverse().map((tl, i) => (
            <li key={i} className="ml-4">
              <span className={`absolute -left-[7px] h-3 w-3 rounded-full border-2 border-cream-50 ${i === 0 ? 'bg-saffron-500' : 'bg-navy-300'}`} />
              <div className="text-[13px] text-navy-400">{fmtDate(tl.date)}</div>
              <div className="font-semibold text-navy-800 text-[14.5px]">{complaintStatusLabel[tl.status]}</div>
              {tl.note && <div className="text-[13.5px] text-navy-500">{tl.note}</div>}
            </li>
          ))}
        </ol>
      </Card>

      {/* feedback */}
      {(c.feedback || sent) && (
        <Card className="bg-green-50 border-green-200">
          <div className="font-semibold text-paid">તમારો ફીડબેક મળી ગયો, આભાર 🙏</div>
          {c.feedback && (
            <div className="mt-1 flex items-center gap-1 text-saffron-600">
              {[1, 2, 3, 4, 5].map(n => <Star key={n} size={16} fill={n <= c.feedback!.rating ? 'currentColor' : 'none'} />)}
              {c.feedback.comment && <span className="text-[13.5px] text-navy-600 ml-2">{c.feedback.comment}</span>}
            </div>
          )}
        </Card>
      )}
      {canFeedback && (
        <Card className="animate-fadeUp">
          <h2 className="font-bold text-navy-800">કામ કેવું થયું?</h2>
          <p className="text-[13px] text-navy-400 mb-2">તમારો અભિપ્રાય કમિટીને મદદ કરશે.</p>
          <div className="flex gap-1.5 mb-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} સ્ટાર`}
                className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-colors ${n <= rating ? 'bg-saffron-50 border-saffron-300 text-saffron-500' : 'bg-white border-cream-300 text-navy-300'}`}>
                <Star size={20} fill={n <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="કંઈ કહેવું હોય તો લખો (વૈકલ્પિક)" />
          <Button full className="mt-3" onClick={submit} disabled={!rating}>ફીડબેક મોકલો</Button>
        </Card>
      )}
    </div>
  )
}
