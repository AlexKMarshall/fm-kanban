import {
  InputHTMLAttributes,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react'
import { mergeRefs } from 'react-merge-refs'
import { tv } from 'tailwind-variants'
import invariant from 'tiny-invariant'

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { focusOnMount?: boolean }
>(function Input({ className, focusOnMount: focusOnMountProp, ...props }, ref) {
  const localRef = useRef<HTMLInputElement>(null)
  // It shouldn't be possible to change focusOnMount prop after the component is mounted
  // So we use a local state to store the initial prop value and ignore any changes
  const [focusOnMount] = useState(focusOnMountProp ?? false)

  useEffect(
    function applyFocusOnMount() {
      if (!focusOnMount) return
      invariant(localRef.current, 'Input ref is not set')
      localRef.current.focus()
    },
    [focusOnMount],
  )

  return (
    <input
      className={tv({
        base: 'rounded border border-gray-300 px-4 py-2 text-sm placeholder:text-gray-400 aria-[invalid]:border-red-700',
      })({ className })}
      {...props}
      ref={mergeRefs([ref, localRef])}
    />
  )
})
