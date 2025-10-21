import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  max?: number
  min?: number
  step?: number
  className?: string
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, onValueChange, max = 100, min = 0, step = 1, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false)
    const [dragIndex, setDragIndex] = React.useState<number | null>(null)
    const sliderRef = React.useRef<HTMLDivElement>(null)

    const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      setDragIndex(index)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || dragIndex === null || !sliderRef.current) return

      const rect = sliderRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const newValue = Math.round(min + percentage * (max - min))
      const steppedValue = Math.round(newValue / step) * step

      const newValues: [number, number] = [...value]
      newValues[dragIndex] = Math.max(min, Math.min(max, steppedValue))

      // Ensure min value is not greater than max value
      if (newValues[0] > newValues[1]) {
        newValues[0] = newValues[1]
      }
      if (newValues[1] < newValues[0]) {
        newValues[1] = newValues[0]
      }

      onValueChange(newValues)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setDragIndex(null)
    }

    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }, [isDragging, dragIndex])

    const getPercentage = (val: number) => ((val - min) / (max - min)) * 100

    return (
      <div
        ref={sliderRef}
        className={cn(
          "relative flex w-full h-6 items-center cursor-pointer",
          className
        )}
        {...props}
      >
        {/* Track */}
        <div className="relative h-2 w-full bg-gray-200 rounded-full">
          {/* Active range */}
          <div
            className="absolute h-2 bg-blue-600 rounded-full"
            style={{
              left: `${getPercentage(value[0])}%`,
              width: `${getPercentage(value[1]) - getPercentage(value[0])}%`
            }}
          />
        </div>
        
        {/* Thumbs */}
        <div
          className="absolute w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-lg cursor-grab active:cursor-grabbing"
          style={{ left: `calc(${getPercentage(value[0])}% - 10px)` }}
          onMouseDown={handleMouseDown(0)}
        />
        <div
          className="absolute w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-lg cursor-grab active:cursor-grabbing"
          style={{ left: `calc(${getPercentage(value[1])}% - 10px)` }}
          onMouseDown={handleMouseDown(1)}
        />
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider }
