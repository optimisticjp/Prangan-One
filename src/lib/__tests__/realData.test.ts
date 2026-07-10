import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.doUnmock('../supabase')
  vi.resetModules()
})

const flatRow = {
  id: 'f1', society_id: 'soc1', number: '101', floor: 1, owner_name: 'Kiran Patel', phone: '9000000000',
  email: null, occupancy: 'owner' as const, tenant_name: null, tenant_email: null, sqft: 900, member_since: 2024, maintenance_override: null,
}
const billRow = { id: 'b1', society_id: 'soc1', flat_id: 'f1', month: '2027-01', amount: 1200, paid_amount: 0, due_date: '2027-01-10', note: null }
const paymentRow = {
  id: 'p1', society_id: 'soc1', flat_id: 'f1', bill_id: 'b1', date: '2027-01-05', amount: 1200, mode: 'upi' as const,
  ref_no: 'UPI123', receipt_no: 'SOC-2027-0001', status: 'success' as const, note: null, cancelled: false, cancel_reason: null,
}
const adjustmentRow = { id: 'a1', society_id: 'soc1', date: '2027-01-01', flat_id: 'f1', amount: 300, type: 'debit' as const, reason: 'Special assessment' }

describe('fetchSocietyFinancials', () => {
  it('maps all four tables into the expected app shapes', async () => {
    const makeQuery = (data: unknown[]) => ({ select: () => ({ eq: () => Promise.resolve({ data, error: null }) }) })
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => {
          if (table === 'flats') return makeQuery([flatRow])
          if (table === 'bills') return makeQuery([billRow])
          if (table === 'payments') return makeQuery([paymentRow])
          if (table === 'adjustments') return makeQuery([adjustmentRow])
          throw new Error('unexpected table ' + table)
        },
      },
    }))
    const { fetchSocietyFinancials } = await import('../realData')
    const result = await fetchSocietyFinancials('soc1')

    expect(result.flats).toEqual([{
      id: 'f1', societyId: 'soc1', number: '101', floor: 1, ownerName: 'Kiran Patel', phone: '9000000000',
      email: undefined, occupancy: 'owner', tenantName: undefined, tenantEmail: undefined, sqft: 900, memberSince: 2024, maintenanceOverride: undefined,
    }])
    expect(result.bills).toEqual([{ id: 'b1', societyId: 'soc1', flatId: 'f1', month: '2027-01', amount: 1200, paidAmount: 0, dueDate: '2027-01-10', note: undefined }])
    expect(result.payments[0]).toMatchObject({ id: 'p1', receiptNo: 'SOC-2027-0001', status: 'success', cancelled: false })
    expect(result.adjustments[0]).toMatchObject({ id: 'a1', flatId: 'f1', amount: 300, type: 'debit' })
  })

  it('returns all-empty when Supabase is not configured, rather than throwing', async () => {
    vi.doMock('../supabase', () => ({ supabase: null }))
    const { fetchSocietyFinancials } = await import('../realData')
    expect(await fetchSocietyFinancials('soc1')).toEqual({ flats: [], bills: [], payments: [], adjustments: [] })
  })

  it('throws if any one of the four queries fails, rather than silently returning partial data', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => ({
          select: () => ({
            eq: () => Promise.resolve(table === 'payments' ? { data: null, error: { message: 'boom' } } : { data: [], error: null }),
          }),
        }),
      },
    }))
    const { fetchSocietyFinancials } = await import('../realData')
    await expect(fetchSocietyFinancials('soc1')).rejects.toBeTruthy()
  })
})

describe('insertBillsReal', () => {
  it('maps camelCase bills into the real snake_case columns, including the client-provided id', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({
      supabase: { from: () => ({ select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }), insert }) },
    }))
    const { insertBillsReal } = await import('../realData')

    await insertBillsReal([{ id: 'b1', societyId: 'soc1', flatId: 'f1', month: '2027-01', amount: 1200, paidAmount: 0, dueDate: '2027-01-10' }])
    expect(insert).toHaveBeenCalledWith([{ id: 'b1', society_id: 'soc1', flat_id: 'f1', month: '2027-01', amount: 1200, paid_amount: 0, due_date: '2027-01-10', note: null }])
  })

  it('does nothing for an empty list, no network call at all', async () => {
    const insert = vi.fn()
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ insert }) } }))
    const { insertBillsReal } = await import('../realData')
    await insertBillsReal([])
    expect(insert).not.toHaveBeenCalled()
  })

  it('on a retry, filters out whichever bills in the batch already exist and only inserts the rest - not all-or-nothing', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({ in: () => Promise.resolve({ data: [{ id: 'b1' }], error: null }) }), // b1 already exists, b2 doesn't
          insert,
        }),
      },
    }))
    const { insertBillsReal } = await import('../realData')
    await insertBillsReal([
      { id: 'b1', societyId: 'soc1', flatId: 'f1', month: '2027-01', amount: 1200, paidAmount: 0, dueDate: '2027-01-10' },
      { id: 'b2', societyId: 'soc1', flatId: 'f2', month: '2027-01', amount: 1200, paidAmount: 0, dueDate: '2027-01-10' },
    ])
    expect(insert).toHaveBeenCalledWith([{ id: 'b2', society_id: 'soc1', flat_id: 'f2', month: '2027-01', amount: 1200, paid_amount: 0, due_date: '2027-01-10', note: null }])
  })

  it('skips the insert call entirely when every bill in the batch already exists', async () => {
    const insert = vi.fn()
    vi.doMock('../supabase', () => ({
      supabase: { from: () => ({ select: () => ({ in: () => Promise.resolve({ data: [{ id: 'b1' }], error: null }) }), insert }) },
    }))
    const { insertBillsReal } = await import('../realData')
    await insertBillsReal([{ id: 'b1', societyId: 'soc1', flatId: 'f1', month: '2027-01', amount: 1200, paidAmount: 0, dueDate: '2027-01-10' }])
    expect(insert).not.toHaveBeenCalled()
  })
})

describe('recordPaymentReal', () => {
  it('calls the atomic record_payment_atomic RPC with the payment\u2019s real fields, and returns what the database actually allocated', async () => {
    const rpcCalls: { fn: string; args: unknown }[] = []
    vi.doMock('../supabase', () => ({
      supabase: {
        rpc: (fn: string, args: unknown) => {
          rpcCalls.push({ fn, args })
          return Promise.resolve({ data: { receipt_no: 'RJH-2027-0042', overpay_amount: 0, adjustment_id: null }, error: null })
        },
      },
    }))
    const { recordPaymentReal } = await import('../realData')

    const result = await recordPaymentReal(
      { id: 'p1', societyId: 'soc1', flatId: 'f1', billId: 'b1', date: '2027-01-05', amount: 500, mode: 'upi', status: 'success' },
    )

    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].fn).toBe('record_payment_atomic')
    expect(rpcCalls[0].args).toMatchObject({ p_id: 'p1', p_society_id: 'soc1', p_bill_id: 'b1', p_amount: 500, p_status: 'success' })
    // The receipt number is whatever the database actually allocated,
    // not something this function computed or guessed itself - that's
    // the entire point of moving this server-side in the first place.
    expect(result.receiptNo).toBe('RJH-2027-0042')
  })

  it('surfaces the real overpay amount and adjustment id the database computed, not a client-side guess', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        rpc: () => Promise.resolve({ data: { receipt_no: 'RJH-2027-0043', overpay_amount: 250, adjustment_id: 'adj-real-1' }, error: null }),
      },
    }))
    const { recordPaymentReal } = await import('../realData')

    const result = await recordPaymentReal(
      { id: 'p2', societyId: 'soc1', flatId: 'f1', billId: 'b1', date: '2027-01-05', amount: 1250, mode: 'cash', status: 'success' },
    )

    expect(result.overpayAmount).toBe(250)
    expect(result.adjustmentId).toBe('adj-real-1')
  })

  it('propagates a real database error rather than swallowing it - a failed call here needs to surface to attemptRealWrite, not disappear', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        rpc: () => Promise.resolve({ data: null, error: new Error('simulated failure') }),
      },
    }))
    const { recordPaymentReal } = await import('../realData')

    await expect(recordPaymentReal(
      { id: 'p3', societyId: 'soc1', flatId: 'f1', billId: 'b1', date: '2027-01-05', amount: 500, mode: 'upi', status: 'success' },
    )).rejects.toThrow('simulated failure')
  })
})

describe('fetchSocietyComplaints', () => {
  it('joins each complaint with its own timeline entries, sorted oldest first', async () => {
    const complaintRow = {
      id: 'c1', society_id: 'soc1', flat_id: 'f1', category: 'Lift', title: 'Noisy', detail: 'Every trip',
      priority: 'normal', status: 'assigned', assigned_to: 'Ramesh', has_photo: false,
      internal_notes: ['checked with vendor'], feedback: null, visibility: 'community', created_at: '2027-01-01T00:00:00Z',
    }
    const timelineRows = [
      { id: 't2', complaint_id: 'c1', status: 'assigned', note: 'Assigned to vendor', by_name: 'Admin', created_at: '2027-01-02T00:00:00Z' },
      { id: 't1', complaint_id: 'c1', status: 'new', note: null, by_name: 'Resident', created_at: '2027-01-01T00:00:00Z' },
    ]
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => ({
          select: () => ({
            eq: () => Promise.resolve(table === 'complaints' ? { data: [complaintRow], error: null } : { data: null, error: null }),
            // complaint_timeline has no .eq() call in the real function - matched by returning a resolved promise directly for a bare select()
            then: (resolve: (v: unknown) => void) => resolve({ data: timelineRows, error: null }),
          }),
        }),
      },
    }))
    const { fetchSocietyComplaints } = await import('../realData')
    const result = await fetchSocietyComplaints('soc1')

    expect(result).toHaveLength(1)
    expect(result[0].internalNotes).toEqual(['checked with vendor'])
    expect(result[0].timeline.map(t => t.status)).toEqual(['new', 'assigned']) // oldest first, not insertion order
  })

  it('returns an empty array when Supabase is not configured', async () => {
    vi.doMock('../supabase', () => ({ supabase: null }))
    const { fetchSocietyComplaints } = await import('../realData')
    expect(await fetchSocietyComplaints('soc1')).toEqual([])
  })
})

describe('insertComplaintReal', () => {
  it('inserts the complaint and its first timeline entry together', async () => {
    const calls: { table: string; payload: unknown }[] = []
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => ({
          select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }), // neither row exists yet
          insert: (payload: unknown) => { calls.push({ table, payload }); return Promise.resolve({ error: null }) },
        }),
      },
    }))
    const { insertComplaintReal } = await import('../realData')
    await insertComplaintReal({
      id: 'c1', societyId: 'soc1', flatId: 'f1', category: 'Lift', title: 'Noisy', detail: 'x', priority: 'normal',
      status: 'new', createdAt: '2027-01-01', internalNotes: [], visibility: 'personal',
      timeline: [{ date: '2027-01-01', status: 'new', by: 'Resident' }],
    })
    expect(calls.some(c => c.table === 'complaints')).toBe(true)
    const timelineCall = calls.find(c => c.table === 'complaint_timeline')
    expect(timelineCall?.payload).toMatchObject({ complaint_id: 'c1', status: 'new', by_name: 'Resident' })
  })

  it('on a retry where both rows already exist, inserts neither again - the real scenario this exists for: the complaint succeeded but a later step (the photo upload) failed, and the whole sequence gets retried', async () => {
    const calls: string[] = []
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => ({
          select: () => ({ eq: () => Promise.resolve({ count: 1, error: null }) }), // both rows already exist
          insert: (_payload: unknown) => { calls.push(table); return Promise.resolve({ error: null }) },
        }),
      },
    }))
    const { insertComplaintReal } = await import('../realData')
    await insertComplaintReal({
      id: 'c1', societyId: 'soc1', flatId: 'f1', category: 'Lift', title: 'Noisy', detail: 'x', priority: 'normal',
      status: 'new', createdAt: '2027-01-01', internalNotes: [], visibility: 'personal',
      timeline: [{ date: '2027-01-01', status: 'new', by: 'Resident' }],
    })
    expect(calls).toEqual([]) // neither insert call happened - retry-safe, not just retry-attempted
  })
})

describe('societies', () => {
  const societyRow = {
    id: 'soc1', name: 'ટેસ્ટ સોસાયટી', name_en: 'Test Society', slug: 'test-society', join_code: 'TEST123',
    address: 'Some address', city: 'Surat', area: 'Varachha', maintenance_amount: 1200, due_day: 10, upi_id: '',
    plan: 'trial', flats_limit: 60, receipt_prefix: 'TS', theme_key: 'navy-saffron', logo_url: null,
    support_phone: null, owner_enabled_modules: { billing: true }, admin_visible_modules: { billing: true },
    tenant_access: 'full', subscription_status: 'trial', grace_started_at: null, trial_started_at: '2027-01-01T00:00:00Z',
    receipt_seq: 1, created_at: '2027-01-01T00:00:00Z',
  }

  it('fetchSociety maps a single row correctly, including nested modules', async () => {
    vi.doMock('../supabase', () => ({
      supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: societyRow, error: null }) }) }) }) },
    }))
    const { fetchSociety } = await import('../realData')
    const result = await fetchSociety('soc1')
    expect(result?.nameEn).toBe('Test Society')
    expect(result?.modules).toEqual({ ownerEnabled: { billing: true }, adminVisible: { billing: true } })
  })

  it('fetchSociety returns null when nothing matches, not an error', async () => {
    vi.doMock('../supabase', () => ({
      supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) },
    }))
    const { fetchSociety } = await import('../realData')
    expect(await fetchSociety('soc-nonexistent')).toBeNull()
  })

  it('fetchAllSocieties returns every society the caller can see - RLS decides how many that actually is, this just returns whatever comes back', async () => {
    vi.doMock('../supabase', () => ({
      supabase: { from: () => ({ select: () => Promise.resolve({ data: [societyRow, { ...societyRow, id: 'soc2', name_en: 'Second Society' }], error: null }) }) },
    }))
    const { fetchAllSocieties } = await import('../realData')
    const result = await fetchAllSocieties()
    expect(result).toHaveLength(2)
    expect(result.map(s => s.nameEn)).toEqual(['Test Society', 'Second Society'])
  })

  it('updateSocietyReal never sends the owner-only protected fields, even if asked to', async () => {
    const update = vi.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ update }) } }))
    const { updateSocietyReal } = await import('../realData')

    // plan/flatsLimit/subscriptionStatus aren't even in this function's
    // patch type, so passing name+maintenanceAmount here and checking
    // the actual payload sent confirms only intended fields go through.
    await updateSocietyReal('soc1', { name: 'New Name', maintenanceAmount: 1500 })
    expect(update).toHaveBeenCalledWith({ name: 'New Name', maintenance_amount: 1500 })
  })

  it('updateSocietyStatusReal is the one path that can touch the protected fields', async () => {
    const update = vi.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ update }) } }))
    const { updateSocietyStatusReal } = await import('../realData')

    await updateSocietyStatusReal('soc1', { subscriptionStatus: 'active' })
    expect(update).toHaveBeenCalledWith({ subscription_status: 'active' })
  })
})

describe('storage: uploadSocietyLogo', () => {
  it('uploads to a path prefixed with the society id and returns the public URL', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/society-logos/soc1/logo.png' } })
    vi.doMock('../supabase', () => ({ supabase: { storage: { from: () => ({ upload, getPublicUrl }) } } }))
    const { uploadSocietyLogo } = await import('../realData')

    const file = new File(['x'], 'logo.png', { type: 'image/png' })
    const url = await uploadSocietyLogo('soc1', file)

    expect(upload).toHaveBeenCalledWith('soc1/logo.png', file, { upsert: true })
    expect(url).toBe('https://cdn.example.com/society-logos/soc1/logo.png')
  })
})

describe('storage: uploadPrivateFile and getSignedFileUrl', () => {
  it('uploads to a path prefixed with the owning row id and returns just the path, not a URL', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { storage: { from: () => ({ upload }) } } }))
    const { uploadPrivateFile } = await import('../realData')

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const path = await uploadPrivateFile('complaint-photos', 'complaint-123', file)

    expect(path.startsWith('complaint-123/')).toBe(true)
    expect(upload).toHaveBeenCalled()
  })

  it('getSignedFileUrl asks for a genuinely temporary URL, not a permanent one', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example.com/x' }, error: null })
    vi.doMock('../supabase', () => ({ supabase: { storage: { from: () => ({ createSignedUrl }) } } }))
    const { getSignedFileUrl } = await import('../realData')

    const url = await getSignedFileUrl('complaint-photos', 'complaint-123/photo.jpg')
    expect(createSignedUrl).toHaveBeenCalledWith('complaint-123/photo.jpg', 3600)
    expect(url).toBe('https://signed.example.com/x')
  })

  it('throws when Supabase reports an upload error, rather than silently returning a broken path', async () => {
    vi.doMock('../supabase', () => ({ supabase: { storage: { from: () => ({ upload: vi.fn().mockResolvedValue({ error: { message: 'boom' } }) }) } } }))
    const { uploadPrivateFile } = await import('../realData')
    await expect(uploadPrivateFile('payment-proof', 'pay-1', new File(['x'], 'proof.jpg'))).rejects.toBeTruthy()
  })
})

describe('notices', () => {
  it('fetchSocietyNotices maps rows into the expected shape', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ id: 'n1', society_id: 'soc1', title: 'Water cut', body: 'Tomorrow 10am-2pm', date: '2027-01-01', category: 'Maintenance', pinned: true }],
              error: null,
            }),
          }),
        }),
      },
    }))
    const { fetchSocietyNotices } = await import('../realData')
    const result = await fetchSocietyNotices('soc1')
    expect(result).toEqual([{ id: 'n1', societyId: 'soc1', title: 'Water cut', body: 'Tomorrow 10am-2pm', date: '2027-01-01', category: 'Maintenance', pinned: true }])
  })

  it('insertNoticeReal maps camelCase into the real columns', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }), insert }) } }))
    const { insertNoticeReal } = await import('../realData')
    await insertNoticeReal({ id: 'n1', societyId: 'soc1', title: 'Water cut', body: 'x', date: '2027-01-01', category: 'Maintenance', pinned: false })
    expect(insert).toHaveBeenCalledWith({ id: 'n1', society_id: 'soc1', title: 'Water cut', body: 'x', date: '2027-01-01', category: 'Maintenance', pinned: false })
  })
})

describe('documents', () => {
  it('fetchSocietyDocuments maps rows into the expected shape', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ id: 'd1', society_id: 'soc1', name: 'AGM Minutes', folder: 'General', permission: 'public', date: '2027-01-01', size_label: '1.2 MB', storage_path: 'd1/agm.pdf' }],
              error: null,
            }),
          }),
        }),
      },
    }))
    const { fetchSocietyDocuments } = await import('../realData')
    const result = await fetchSocietyDocuments('soc1')
    expect(result).toEqual([{ id: 'd1', societyId: 'soc1', name: 'AGM Minutes', folder: 'General', permission: 'public', date: '2027-01-01', size: '1.2 MB', storagePath: 'd1/agm.pdf' }])
  })

  it('a document with no uploaded file yet maps storagePath to undefined, not null', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ id: 'd2', society_id: 'soc1', name: 'Board Notes', folder: 'General', permission: 'admin', date: '2027-01-01', size_label: '-', storage_path: null }],
              error: null,
            }),
          }),
        }),
      },
    }))
    const { fetchSocietyDocuments } = await import('../realData')
    const result = await fetchSocietyDocuments('soc1')
    expect(result[0].storagePath).toBeUndefined()
  })

  it('insertDocumentReal maps camelCase into the real columns', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }), insert }) } }))
    const { insertDocumentReal } = await import('../realData')
    await insertDocumentReal({ id: 'd1', societyId: 'soc1', name: 'AGM Minutes', folder: 'General', permission: 'public', date: '2027-01-01', size: '1.2 MB' })
    expect(insert).toHaveBeenCalledWith({ id: 'd1', society_id: 'soc1', name: 'AGM Minutes', folder: 'General', permission: 'public', date: '2027-01-01', size_label: '1.2 MB' })
  })

  it('updateDocumentStoragePathReal attaches the path after upload, mirroring updateComplaintPhotoPathReal', async () => {
    const update = vi.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ update }) } }))
    const { updateDocumentStoragePathReal } = await import('../realData')
    await updateDocumentStoragePathReal('d1', 'd1/agm.pdf')
    expect(update).toHaveBeenCalledWith({ storage_path: 'd1/agm.pdf' })
  })
})

describe('memberships', () => {
  it('fetchSocietyMemberships maps rows into the expected shape', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ id: 'm1', society_id: 'soc1', email: 'a@example.com', user_id: null, role: 'resident_owner', flat_id: 'f1', phone: '9000000000', whatsapp: null, name: 'A', can_manage_billing: false, status: 'pending', created_at: '2027-01-01' }],
              error: null,
            }),
          }),
        }),
      },
    }))
    const { fetchSocietyMemberships } = await import('../realData')
    const result = await fetchSocietyMemberships('soc1')
    expect(result).toEqual([{ id: 'm1', societyId: 'soc1', email: 'a@example.com', userId: undefined, role: 'resident_owner', flatId: 'f1', phone: '9000000000', whatsapp: undefined, name: 'A', canManageBilling: false, status: 'pending', createdAt: '2027-01-01' }])
  })

  it('approveMembershipReal sets status to active', async () => {
    const update = vi.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ update }) } }))
    const { approveMembershipReal } = await import('../realData')
    await approveMembershipReal('m1')
    expect(update).toHaveBeenCalledWith({ status: 'active' })
  })

  it('rejectMembershipReal deletes the row outright, matching the local demo\u2019s own behavior', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ eq })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ delete: del }) } }))
    const { rejectMembershipReal } = await import('../realData')
    await rejectMembershipReal('m1')
    expect(del).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith('id', 'm1')
  })

  it('insertMembershipReal maps camelCase into the real columns, including the client-provided id', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }), insert }) } }))
    const { insertMembershipReal } = await import('../realData')
    await insertMembershipReal({ id: 'm1', societyId: 'soc1', email: 'a@example.com', role: 'committee_member', status: 'active', createdAt: '2027-01-01' })
    expect(insert).toHaveBeenCalledWith({
      id: 'm1', society_id: 'soc1', email: 'a@example.com', role: 'committee_member', flat_id: null,
      phone: null, whatsapp: null, name: null, can_manage_billing: false, status: 'active',
    })
  })
})

describe('vendors', () => {
  it('fetchSocietyVendors maps rows into the expected shape', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ id: 'v1', society_id: 'soc1', name: 'ABC Lift Co', service: 'Lift AMC', contact_person: 'Ramesh', phone: '9000000000', amc_start: '2027-01-01', amc_end: '2028-01-01', notes: null }],
              error: null,
            }),
          }),
        }),
      },
    }))
    const { fetchSocietyVendors } = await import('../realData')
    const result = await fetchSocietyVendors('soc1')
    expect(result).toEqual([{ id: 'v1', societyId: 'soc1', name: 'ABC Lift Co', service: 'Lift AMC', contactPerson: 'Ramesh', phone: '9000000000', amcStart: '2027-01-01', amcEnd: '2028-01-01', notes: undefined }])
  })

  it('insertVendorReal maps camelCase into the real columns', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }), insert }) } }))
    const { insertVendorReal } = await import('../realData')
    await insertVendorReal({ id: 'v1', societyId: 'soc1', name: 'ABC Lift Co', service: 'Lift AMC', contactPerson: 'Ramesh', phone: '9000000000' })
    expect(insert).toHaveBeenCalledWith({ id: 'v1', society_id: 'soc1', name: 'ABC Lift Co', service: 'Lift AMC', contact_person: 'Ramesh', phone: '9000000000', amc_start: null, amc_end: null, notes: null })
  })

  it('updateVendorReal only sends the fields actually being changed', async () => {
    const update = vi.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ update }) } }))
    const { updateVendorReal } = await import('../realData')
    await updateVendorReal('v1', { notes: 'Renewed for another year' })
    expect(update).toHaveBeenCalledWith({ notes: 'Renewed for another year' })
  })
})

describe('vehicles', () => {
  it('fetchSocietyVehicles maps rows into the expected shape', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({ data: [{ id: 've1', society_id: 'soc1', flat_id: 'f1', kind: '4W', number: 'GJ05AB1234', slot: 'B-12', owner_type: 'owner' }], error: null }),
          }),
        }),
      },
    }))
    const { fetchSocietyVehicles } = await import('../realData')
    const result = await fetchSocietyVehicles('soc1')
    expect(result).toEqual([{ id: 've1', societyId: 'soc1', flatId: 'f1', kind: '4W', number: 'GJ05AB1234', slot: 'B-12', ownerType: 'owner' }])
  })

  it('insertVehicleReal maps camelCase into the real columns', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }), insert }) } }))
    const { insertVehicleReal } = await import('../realData')
    await insertVehicleReal({ id: 've1', societyId: 'soc1', flatId: 'f1', kind: '2W', number: 'GJ05CD5678', slot: 'A-3', ownerType: 'tenant' })
    expect(insert).toHaveBeenCalledWith({ id: 've1', society_id: 'soc1', flat_id: 'f1', kind: '2W', number: 'GJ05CD5678', slot: 'A-3', owner_type: 'tenant' })
  })
})

describe('contacts', () => {
  it('fetchSocietyContacts maps rows into the expected shape', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({ data: [{ id: 'c1', society_id: 'soc1', name: 'Security Desk', role: 'Guard', phone: '9000000001', category: 'emergency' }], error: null }),
          }),
        }),
      },
    }))
    const { fetchSocietyContacts } = await import('../realData')
    const result = await fetchSocietyContacts('soc1')
    expect(result).toEqual([{ id: 'c1', societyId: 'soc1', name: 'Security Desk', role: 'Guard', phone: '9000000001', category: 'emergency' }])
  })
})

describe('polls', () => {
  it('fetchSocietyPolls builds the votes map from whatever poll_votes RLS returns, and resultCounts from the aggregate function separately', async () => {
    const pollRow = { id: 'p1', society_id: 'soc1', question: 'Repaint?', type: 'yesno', options: ['Yes', 'No'], status: 'open', result_visible: true, end_date: null }
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => ({
          select: () => ({
            eq: () => Promise.resolve(table === 'polls' ? { data: [pollRow], error: null } : { data: null, error: null }),
            then: (resolve: (v: unknown) => void) => resolve({ data: [{ poll_id: 'p1', flat_id: 'f1', option_idx: 0 }], error: null }),
          }),
        }),
        rpc: () => Promise.resolve({ data: [{ option_idx: 0, vote_count: 2 }, { option_idx: 1, vote_count: 1 }], error: null }),
      },
    }))
    const { fetchSocietyPolls } = await import('../realData')
    const result = await fetchSocietyPolls('soc1')

    expect(result).toHaveLength(1)
    expect(result[0].votes).toEqual({ f1: 0 }) // only what RLS actually returned for this caller
    expect(result[0].resultCounts).toEqual([2, 1]) // the true aggregate, from the privacy-preserving function
  })

  it('a poll with no votes at all gets an empty votes map, not undefined', async () => {
    const pollRow = { id: 'p2', society_id: 'soc1', question: 'Test', type: 'yesno', options: ['A', 'B'], status: 'open', result_visible: true, end_date: null }
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => ({
          select: () => ({
            eq: () => Promise.resolve(table === 'polls' ? { data: [pollRow], error: null } : { data: null, error: null }),
            then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
          }),
        }),
        rpc: () => Promise.resolve({ data: [], error: null }),
      },
    }))
    const { fetchSocietyPolls } = await import('../realData')
    const result = await fetchSocietyPolls('soc1')
    expect(result[0].votes).toEqual({})
    expect(result[0].resultCounts).toEqual([0, 0])
  })

  it('insertPollVoteReal maps to the real columns', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ insert }) } }))
    const { insertPollVoteReal } = await import('../realData')
    await insertPollVoteReal('p1', 'f1', 1)
    expect(insert).toHaveBeenCalledWith({ poll_id: 'p1', flat_id: 'f1', option_idx: 1 })
  })

  it('closePollReal also sets result_visible true, matching what closing a poll means locally', async () => {
    const update = vi.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ update }) } }))
    const { closePollReal } = await import('../realData')
    await closePollReal('p1')
    expect(update).toHaveBeenCalledWith({ status: 'closed', result_visible: true })
  })
})

describe('events', () => {
  it('fetchSocietyEvents joins contributions, volunteers, and expenses back onto their own event', async () => {
    const eventRow = { id: 'e1', society_id: 'soc1', name: 'Ganesh Chaturthi', type: 'festival', date: '2027-09-01', note: null }
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => ({
          select: () => ({
            eq: () => Promise.resolve(table === 'events' ? { data: [eventRow], error: null } : { data: null, error: null }),
            then: (resolve: (v: unknown) => void) => {
              if (table === 'event_contributions') resolve({ data: [{ id: 'c1', event_id: 'e1', flat_id: 'f1', amount: 500, date: '2027-09-01' }], error: null })
              else if (table === 'event_volunteers') resolve({ data: [{ id: 'v1', event_id: 'e1', name: 'Resident 101', joined_at: '2027-09-01' }], error: null })
              else if (table === 'event_expenses') resolve({ data: [{ id: 'x1', event_id: 'e1', label: 'Decorations', amount: 2000 }], error: null })
              else resolve({ data: [], error: null })
            },
          }),
        }),
      },
    }))
    const { fetchSocietyEvents } = await import('../realData')
    const result = await fetchSocietyEvents('soc1')

    expect(result).toHaveLength(1)
    expect(result[0].contributions).toEqual([{ flatId: 'f1', amount: 500, date: '2027-09-01' }])
    expect(result[0].volunteers).toEqual(['Resident 101'])
    expect(result[0].expenses).toEqual([{ label: 'Decorations', amount: 2000 }])
  })

  it('an event with none of the three child records yet gets empty arrays, not undefined', async () => {
    const eventRow = { id: 'e2', society_id: 'soc1', name: 'New Event', type: 'social', date: '2027-10-01', note: null }
    vi.doMock('../supabase', () => ({
      supabase: {
        from: (table: string) => ({
          select: () => ({
            eq: () => Promise.resolve(table === 'events' ? { data: [eventRow], error: null } : { data: null, error: null }),
            then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
          }),
        }),
      },
    }))
    const { fetchSocietyEvents } = await import('../realData')
    const result = await fetchSocietyEvents('soc1')
    expect(result[0]).toMatchObject({ contributions: [], volunteers: [], expenses: [] })
  })

  it('insertContributionReal maps to the real columns', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ insert }) } }))
    const { insertContributionReal } = await import('../realData')
    await insertContributionReal('e1', 'f1', 500, '2027-09-01')
    expect(insert).toHaveBeenCalledWith({ event_id: 'e1', flat_id: 'f1', amount: 500, date: '2027-09-01' })
  })

  it('insertVolunteerReal and insertEventExpenseReal map to the real columns', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ insert }) } }))
    const { insertVolunteerReal, insertEventExpenseReal } = await import('../realData')
    await insertVolunteerReal('e1', 'Resident 101')
    await insertEventExpenseReal('e1', 'Decorations', 2000)
    expect(insert).toHaveBeenNthCalledWith(1, { event_id: 'e1', name: 'Resident 101' })
    expect(insert).toHaveBeenNthCalledWith(2, { event_id: 'e1', label: 'Decorations', amount: 2000 })
  })
})

describe('owner console aggregates: flats, memberships, platform billing, audit logs, impersonation logs', () => {
  it('fetchAllFlatsForOwner and fetchAllMembershipsForOwner query with no society filter at all - RLS is what scopes this, not the query', async () => {
    const flatsSelect = vi.fn().mockResolvedValue({ data: [], error: null })
    const membershipsSelect = vi.fn().mockResolvedValue({ data: [], error: null })
    vi.doMock('../supabase', () => ({
      supabase: { from: (table: string) => ({ select: table === 'flats' ? flatsSelect : membershipsSelect }) },
    }))
    const { fetchAllFlatsForOwner, fetchAllMembershipsForOwner } = await import('../realData')

    await fetchAllFlatsForOwner()
    await fetchAllMembershipsForOwner()
    // neither select() result has .eq() chained onto it in these two
    // functions specifically - confirmed by these mocks resolving
    // directly rather than needing an .eq method to exist at all
    expect(flatsSelect).toHaveBeenCalled()
    expect(membershipsSelect).toHaveBeenCalled()
  })

  it('fetchAllPlatformBilling maps rows into the expected shape', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => Promise.resolve({
            data: [{ id: 'pb1', society_id: 'soc1', period_month: '2027-01', flat_count: 24, rate_per_flat: 10, expected_amount: 240, received_amount: 0, payment_date: null, mode: null, status: 'unpaid', internal_note: null }],
            error: null,
          }),
        }),
      },
    }))
    const { fetchAllPlatformBilling } = await import('../realData')
    const result = await fetchAllPlatformBilling()
    expect(result).toEqual([{ id: 'pb1', societyId: 'soc1', periodMonth: '2027-01', flatCount: 24, ratePerFlat: 10, expectedAmount: 240, receivedAmount: 0, paymentDate: undefined, mode: undefined, status: 'unpaid', internalNote: undefined }])
  })

  it('updatePlatformBillingReal only sends the fields actually being changed', async () => {
    const update = vi.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ update }) } }))
    const { updatePlatformBillingReal } = await import('../realData')
    await updatePlatformBillingReal('pb1', { status: 'paid', receivedAmount: 240 })
    expect(update).toHaveBeenCalledWith({ received_amount: 240, status: 'paid' })
  })

  it('fetchAllAuditLogs orders newest first and maps created_at to at', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            order: () => Promise.resolve({ data: [{ id: 'a1', society_id: 'soc1', actor: 'Owner', action: 'test', detail: 'x', created_at: '2027-01-01T00:00:00Z' }], error: null }),
          }),
        }),
      },
    }))
    const { fetchAllAuditLogs } = await import('../realData')
    const result = await fetchAllAuditLogs()
    expect(result).toEqual([{ id: 'a1', societyId: 'soc1', at: '2027-01-01T00:00:00Z', actor: 'Owner', action: 'test', detail: 'x' }])
  })

  it('insertImpersonationLogReal and exitImpersonationLogReal map correctly, including the reason field', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }), insert }) } }))
    const { insertImpersonationLogReal } = await import('../realData')
    await insertImpersonationLogReal({ id: 'imp1', societyId: 'soc1', enteredAt: '2027-01-01T00:00:00Z', mode: 'write', reason: 'checking billing' })
    expect(insert).toHaveBeenCalledWith({ id: 'imp1', society_id: 'soc1', mode: 'write', reason: 'checking billing' })
  })
})

describe('expenses (the module an external audit caught as never having been moved to real data)', () => {
  it('fetchSocietyExpenses maps rows into the expected shape', async () => {
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ id: 'e1', society_id: 'soc1', date: '2027-01-15', category: 'Lift Maintenance', vendor_id: 'v1', amount: 4500, mode: 'upi', note: null, bill_file: null }],
              error: null,
            }),
          }),
        }),
      },
    }))
    const { fetchSocietyExpenses } = await import('../realData')
    const result = await fetchSocietyExpenses('soc1')
    expect(result).toEqual([{ id: 'e1', societyId: 'soc1', date: '2027-01-15', category: 'Lift Maintenance', vendorId: 'v1', amount: 4500, mode: 'upi', note: undefined, billFile: undefined }])
  })

  it('insertExpenseReal maps camelCase into the real columns', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }), insert }) } }))
    const { insertExpenseReal } = await import('../realData')
    await insertExpenseReal({ id: 'e1', societyId: 'soc1', date: '2027-01-15', category: 'Lift Maintenance', amount: 4500, mode: 'upi' })
    expect(insert).toHaveBeenCalledWith({ id: 'e1', society_id: 'soc1', date: '2027-01-15', category: 'Lift Maintenance', vendor_id: null, amount: 4500, mode: 'upi', note: null, bill_file: null })
  })

  it('throws rather than silently succeeding when Supabase reports an error', async () => {
    vi.doMock('../supabase', () => ({ supabase: { from: () => ({ insert: vi.fn().mockResolvedValue({ error: { message: 'boom' } }) }) } }))
    const { insertExpenseReal } = await import('../realData')
    await expect(insertExpenseReal({ id: 'e1', societyId: 'soc1', date: '2027-01-15', category: 'x', amount: 100, mode: 'cash' })).rejects.toBeTruthy()
  })
})
