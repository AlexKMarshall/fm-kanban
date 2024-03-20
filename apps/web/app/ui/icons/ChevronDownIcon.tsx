import { forwardRef } from 'react'

import { IconProps } from './types'

export const ChevronDownIcon = forwardRef<SVGSVGElement, IconProps>(
  function ChevronDownIcon(
    { color = 'currentColor', 'aria-hidden': ariaHidden = true, ...props },
    forwardedRef,
  ) {
    return (
      <svg
        width="10"
        height="7"
        viewBox="0 0 10 7"
        aria-hidden={ariaHidden}
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path stroke={color} strokeWidth="2" fill="none" d="m1 1 4 4 4-4" />
      </svg>
    )
  },
)
