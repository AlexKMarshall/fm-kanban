import { ComponentPropsWithoutRef, forwardRef } from 'react'
import { tv } from 'tailwind-variants'

const labelStyles = {
  base: 'text-xs font-bold text-gray-500',
}

export const Label = forwardRef<
  HTMLLabelElement,
  ComponentPropsWithoutRef<'label'>
>(function Label({ htmlFor, className, ...props }, ref) {
  return (
    <label
      htmlFor={htmlFor}
      className={tv(labelStyles)({ className })}
      {...props}
      ref={ref}
    />
  )
})

export const Legend = forwardRef<
  HTMLLegendElement,
  ComponentPropsWithoutRef<'legend'>
>(function Legend({ className, ...props }, ref) {
  return (
    <legend
      // Wouldn't normally have a component set its own margin, but legends are weird and don't play nicely with flex gap
      // so we need to set a margin on the legend itself to get the spacing we want.
      // Maybe it's possible to do this via the fieldset and have the gap configurable there?
      className={tv({ extend: labelStyles, base: 'mb-2' })({ className })}
      {...props}
      ref={ref}
    />
  )
})
