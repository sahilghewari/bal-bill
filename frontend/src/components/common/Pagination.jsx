import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

/**
 * Pagination Component
 */
const Pagination = ({
  page,
  pages,
  onPageChange,
  isLoading = false,
}) => {
  if (pages <= 1) return null

  const pageNumbers = []
  const maxVisible = 5
  const startPage = Math.max(1, page - Math.floor(maxVisible / 2))
  const endPage = Math.min(pages, startPage + maxVisible - 1)

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i)
  }

  return (
    <div className="flex items-center gap-2 justify-center">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1 || isLoading}
        icon={ChevronLeft}
      />

      {startPage > 1 && (
        <>
          <Button
            variant={1 === page ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={isLoading}
          >
            1
          </Button>
          {startPage > 2 && <span className="px-2">...</span>}
        </>
      )}

      {pageNumbers.map((num) => (
        <Button
          key={num}
          variant={num === page ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onPageChange(num)}
          disabled={isLoading}
        >
          {num}
        </Button>
      ))}

      {endPage < pages && (
        <>
          {endPage < pages - 1 && <span className="px-2">...</span>}
          <Button
            variant={pages === page ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onPageChange(pages)}
            disabled={isLoading}
          >
            {pages}
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pages || isLoading}
        icon={ChevronRight}
        iconPosition="right"
      />
    </div>
  )
}

export default Pagination
