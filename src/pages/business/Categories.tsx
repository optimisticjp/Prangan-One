import { useState } from 'react'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { Button, Field, Input, Modal, Select } from '../../components/ui'
import { TypedConfirmModal } from '../../components/business/TypedConfirmModal'
import { useToast } from '../../components/Toast'
import { useBusiness } from '../../lib/business/store'
import type { BusinessCategory } from '../../lib/business/types'

type CategoryKind = BusinessCategory['kind']

export default function BusinessCategories() {
  const { data, canAdmin, addCategory, editCategory, deleteCategory } = useBusiness()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BusinessCategory | null>(null)
  const [deleting, setDeleting] = useState<BusinessCategory | null>(null)
  const [confirmEdit, setConfirmEdit] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [saving, setSaving] = useState(false)

  const openAdd = () => {
    setEditing(null)
    setName('')
    setKind('expense')
    setOpen(true)
  }

  const openEdit = (category: BusinessCategory) => {
    setEditing(category)
    setName(category.name)
    setKind(category.kind)
    setOpen(true)
  }

  const add = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await addCategory({ name, kind })
      toast.success('Category added')
      setOpen(false)
      setName('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add category')
    } finally {
      setSaving(false)
    }
  }

  const edit = async () => {
    if (!editing || !name.trim()) return
    setSaving(true)
    try {
      await editCategory(editing.id, { name, kind })
      toast.success('Category updated')
      setConfirmEdit(false)
      setOpen(false)
      setEditing(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update category')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await deleteCategory(deleting.id)
      toast.success('Category deleted from active use')
      setDeleting(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete category')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-[17px] font-bold text-navy-900">Categories</h1>
          <p className="text-[11.5px] text-navy-400">Manage the labels used for money-in and expense records.</p>
        </div>
        {canAdmin && (
          <button onClick={openAdd} className="h-9 px-3 rounded-xl bg-navy-900 text-white text-[11.5px] font-semibold flex items-center gap-1">
            <Plus size={14} /> Category
          </button>
        )}
      </div>

      <div className="space-y-2">
        {data.categories.filter(category => category.active).map(category => (
          <div key={category.id} className="rounded-2xl border border-cream-200 bg-white px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center">
                <Tags size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold text-navy-900 truncate">{category.name}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">{category.kind}</div>
              </div>
            </div>

            {canAdmin && (
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <Button variant="soft" className="!min-h-[38px] !text-[12px]" onClick={() => openEdit(category)}>
                  <Pencil size={14} /> Edit
                </Button>
                <Button variant="danger" className="!min-h-[38px] !text-[12px]" onClick={() => setDeleting(category)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => { if (!saving) { setOpen(false); setEditing(null) } }}
        title={editing ? 'Edit category' : 'Add category'}
      >
        <Field label="Category name">
          <Input value={name} onChange={e => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Used for">
          <Select value={kind} onChange={e => setKind(e.target.value as CategoryKind)}>
            <option value="expense">Expense</option>
            <option value="income">Money in</option>
            <option value="both">Both</option>
          </Select>
        </Field>
        <Button full disabled={!name.trim()} loading={saving} onClick={editing ? () => setConfirmEdit(true) : add}>
          {editing ? 'Review edit' : 'Add category'}
        </Button>
      </Modal>

      <TypedConfirmModal
        open={confirmEdit}
        mode="EDIT"
        title="Confirm category edit"
        body="Existing transactions using this category will show the new category name."
        busy={saving}
        onClose={() => setConfirmEdit(false)}
        onConfirm={edit}
      />

      <TypedConfirmModal
        open={!!deleting}
        mode="DELETE"
        title="Delete category"
        body="The category will disappear from new transaction forms, but historical transactions will keep their existing reference."
        busy={saving}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </div>
  )
}
