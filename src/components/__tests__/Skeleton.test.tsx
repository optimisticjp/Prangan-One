import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Skeleton, SkeletonCard, PageSkeleton } from '../Skeleton'

afterEach(cleanup)

describe('Skeleton placeholders', () => {
  it('renders a decorative shimmer block hidden from assistive tech', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />)
    const block = container.firstElementChild!
    expect(block).toHaveAttribute('aria-hidden')
    // The moving sweep is the inner element with the shimmer animation.
    expect(block.querySelector('.animate-shimmer')).toBeInTheDocument()
  })

  it('SkeletonCard renders default placeholder rows when given no children', () => {
    const { container } = render(<SkeletonCard />)
    expect(container.querySelector('.card')).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)
  })

  it('PageSkeleton announces a single busy status with an accessible label', () => {
    render(<PageSkeleton label="માહિતી લોડ થાય છે..." />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    // The visible boxes are decorative; the label is the one thing announced.
    expect(screen.getByText('માહિતી લોડ થાય છે...')).toBeInTheDocument()
  })
})
