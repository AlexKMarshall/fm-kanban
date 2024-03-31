import { forwardRef } from 'react'

import { IconProps } from './types'

export const VerticalEllipsisIcon = forwardRef<SVGSVGElement, IconProps>(
  function VerticalEllipsisIcon(
    { color = 'currentColor', 'aria-hidden': ariaHidden = true, ...props },
    forwardedRef,
  ) {
    return (
      <svg
        width="5"
        height="20"
        viewBox="0 0 5 20"
        aria-hidden={ariaHidden}
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <g fill={color} fillRule="evenodd">
          <circle cx="2.308" cy="2.308" r="2.308" />
          <circle cx="2.308" cy="10" r="2.308" />
          <circle cx="2.308" cy="17.692" r="2.308" />
        </g>
      </svg>
    )
  },
)
