import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field, Input, Progress } from '../ui'

describe('shared UI accessibility polish', () => {
  it('Progress exposes its accessible name and the same clamped value visually and to assistive tech', () => {
    render(<Progress value={140} label="આ મહિનાનો કલેક્શન દર" />)
    const progress = screen.getByRole('progressbar', { name: 'આ મહિનાનો કલેક્શન દર' })
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(progress).toHaveAttribute('aria-valuenow', '100')
    expect(progress.firstElementChild).toHaveStyle({ width: '100%' })
  })

  it('Progress normalizes non-finite values before announcing or displaying them', () => {
    render(<Progress value={Number.NaN} label="ફ્લેટ પ્લાન ક્ષમતા વપરાશ" />)
    const progress = screen.getByRole('progressbar', { name: 'ફ્લેટ પ્લાન ક્ષમતા વપરાશ' })
    expect(progress).toHaveAttribute('aria-valuenow', '0')
    expect(progress.firstElementChild).toHaveStyle({ width: '0%' })
  })

  it('Field connects the label, hint, and error to a compatible control without changing call sites', () => {
    render(
      <Field id="owner-email" label="ઈમેલ" hint="લોગિન માટે જરૂરી છે" error="ઈમેલ જરૂરી છે">
        <Input />
      </Field>,
    )

    const input = screen.getByLabelText('ઈમેલ')
    expect(input).toHaveAttribute('id', 'owner-email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'owner-email-hint owner-email-error')
    expect(screen.getByText('લોગિન માટે જરૂરી છે')).toHaveAttribute('id', 'owner-email-hint')
    expect(screen.getByText('ઈમેલ જરૂરી છે')).toHaveAttribute('id', 'owner-email-error')
  })

  it('Field supports native controls, preserves existing IDs, and merges existing descriptions', () => {
    render(
      <Field label="નામ" hint="પૂરું નામ લખો" error="નામ જરૂરી છે">
        <input id="existing-name" aria-describedby="external-help existing-help" />
      </Field>,
    )

    const input = screen.getByLabelText('નામ')
    expect(input).toHaveAttribute('id', 'existing-name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'external-help existing-help existing-name-hint existing-name-error')
  })

  it('Field leaves non-control children renderable without adding broken label targets', () => {
    const { container } = render(
      <Field label="પસંદગી" hint="એક પસંદ કરો">
        <div role="group">વિકલ્પો</div>
      </Field>,
    )

    expect(screen.getByText('પસંદગી')).not.toHaveAttribute('for')
    expect(screen.getByRole('group')).toHaveTextContent('વિકલ્પો')
    expect(container.querySelectorAll('[id$="-hint"]')).toHaveLength(1)
  })

})
