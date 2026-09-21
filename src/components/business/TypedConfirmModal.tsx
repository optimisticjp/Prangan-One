import { useEffect, useState } from 'react'
import { Button, Field, Input, Modal } from '../ui'

export function TypedConfirmModal({
  open,
  mode,
  title,
  body,
  busy = false,
  onClose,
  onConfirm,
}: {
  open: boolean
  mode: 'EDIT' | 'DELETE'
  title: string
  body: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) setValue('')
  }, [open])

  return (
    <Modal open={open} onClose={() => { if (!busy) onClose() }} title={title}>
      <p className="text-[12.5px] leading-relaxed text-navy-500">{body}</p>
      <div className={mode === 'DELETE' ? 'rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] text-over' : 'rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-navy-700'}>
        Type <strong>{mode}</strong> exactly to continue.
      </div>
      <Field label={'Type ' + mode}>
        <Input
          value={value}
          onChange={e => setValue(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder={mode}
          autoFocus
        />
      </Field>
      <Button
        full
        variant={mode === 'DELETE' ? 'danger' : 'primary'}
        loading={busy}
        disabled={value !== mode}
        onClick={onConfirm}
      >
        Confirm {mode}
      </Button>
    </Modal>
  )
}
