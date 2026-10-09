import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Enquiries from '../Enquiries'
import { ENQUIRY_KEY } from '../../../lib/enquiryTracker'

afterEach(() => {cleanup();localStorage.clear()})
function setup() {
  localStorage.setItem('prangan_public_lang','en')
  render(<MemoryRouter><Enquiries/></MemoryRouter>)
}
describe('local enquiry tracker',()=>{
  it('requires opt-in before writing customer contact details',()=>{
    setup()
    fireEvent.change(screen.getByRole('textbox',{name:'Customer name'}),{target:{value:'Ravi'}})
    fireEvent.change(screen.getByRole('textbox',{name:'Service requested'}),{target:{value:'AC service'}})
    fireEvent.click(screen.getByRole('button',{name:'Save enquiry'}))
    expect(localStorage.getItem(ENQUIRY_KEY)).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('choose to save')
  })
  it('saves a customer request and offers a quotation from it',()=>{
    setup()
    fireEvent.change(screen.getByRole('textbox',{name:'Customer name'}),{target:{value:'Ravi'}})
    fireEvent.change(screen.getByRole('textbox',{name:'Service requested'}),{target:{value:'AC service'}})
    fireEvent.click(screen.getByRole('checkbox',{name:/I understand and choose to save/}))
    fireEvent.click(screen.getByRole('button',{name:'Save enquiry'}))
    expect(screen.getByText('Ravi')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(ENQUIRY_KEY)!)[0].service).toBe('AC service')
    expect(screen.getByRole('button',{name:'Create quotation'})).toBeInTheDocument()
  })
})
