import { Link } from '@remix-run/react'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'

import { buttonVariants } from './button'

export const ButtonLink = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<typeof Link>
>(function ButtonLink({ className, ...props }, ref) {
  return <Link {...props} className={buttonVariants({ className })} ref={ref} />
})
