"use client"

import * as React from "react"
import { 
  Bar, 
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell, 
  Legend,
  Line, 
  LineChart as RechartsLineChart,
  Pie, 
  PieChart as RechartsPieChart,
  ResponsiveContainer, 
  Tooltip,
  XAxis, 
  YAxis
} from "recharts"
import { cn } from "@/lib/utils"

// Common chart colors
const defaultColors = [
  "var(--chart-1)", 
  "var(--chart-2)", 
  "var(--chart-3)", 
  "var(--chart-4)", 
  "var(--chart-5)"
]

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactElement
}

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("w-full h-full", className)}
      {...props}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
)
Chart.displayName = "Chart"

// Common tooltip component for charts
interface ChartTooltipProps {
  className?: string
  active?: boolean
  payload?: Array<{
    value?: number | string
    name?: string
    dataKey?: string
    payload?: Record<string, any>
    color?: string
  }>
  label?: string
  formatter?: (value: any, name?: string) => React.ReactNode
  labelFormatter?: (label: string) => React.ReactNode
}

const ChartTooltip = React.forwardRef<HTMLDivElement, ChartTooltipProps>(
  ({ active, payload, label, formatter, labelFormatter, className, ...props }, ref) => {
    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md border bg-background p-2 shadow-sm",
          className
        )}
        {...props}
      >
        {label && (
          <div className="mb-1 text-sm font-medium">
            {labelFormatter ? labelFormatter(label) : label}
          </div>
        )}
        <div className="text-xs opacity-70">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center py-1">
              <div
                className="mr-2 h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="mr-2">{entry.name}:</span>
              <span className="font-semibold">
                {formatter ? formatter(entry.value, entry.name) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
)
ChartTooltip.displayName = "ChartTooltip"

// Bar Chart
interface BarChartProps extends Omit<ChartProps, "children"> {
  data: any[]
  index: string
  categories: string[]
  colors?: string[]
  valueFormatter?: (value: number) => string
  showLegend?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  showGrid?: boolean
  showTooltip?: boolean
  layout?: "horizontal" | "vertical"
}

const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>(
  ({ 
    className, 
    data, 
    index, 
    categories, 
    colors = defaultColors,
    valueFormatter = (value) => String(value),
    showLegend = true,
    showXAxis = true,
    showYAxis = true,
    showGrid = true,
    showTooltip = true,
    layout = "horizontal",
    ...props 
  }, ref) => {
    const isHorizontal = layout === "horizontal"
    
    return (
      <Chart ref={ref} className={className} {...props}>
        <RechartsBarChart 
          data={data}
          layout={layout}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={isHorizontal}
              vertical={!isHorizontal}
              className="stroke-muted"
            />
          )}
          {showXAxis && (
            <XAxis
              dataKey={isHorizontal ? index : undefined}
              type={isHorizontal ? "category" : "number"}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              padding={{ left: 10, right: 10 }}
              minTickGap={5}
              className="text-xs text-muted-foreground"
            />
          )}
          {showYAxis && (
            <YAxis
              dataKey={!isHorizontal ? index : undefined}
              type={!isHorizontal ? "category" : "number"}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={70}
              className="text-xs text-muted-foreground"
              tickFormatter={isHorizontal ? valueFormatter : undefined}
            />
          )}
          {showTooltip && (
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as Array<{ value: number | string; name: string; color: string }>}
                  label={label}
                  formatter={(value) => valueFormatter(value)}
                />
              )}
            />
          )}
          {showLegend && (
            <Legend
              content={({ payload }) => (
                <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                  {payload?.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>{entry.value}</span>
                    </div>
                  ))}
                </div>
              )}
            />
          )}
          {categories.map((category, i) => (
            <Bar
              key={category}
              dataKey={category}
              fill={colors[i % colors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </Chart>
    )
  }
)
BarChart.displayName = "BarChart"

// Line Chart
interface LineChartProps extends Omit<ChartProps, "children"> {
  data: any[]
  index: string
  categories: string[]
  colors?: string[]
  valueFormatter?: (value: number) => string
  showLegend?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  showGrid?: boolean
  showTooltip?: boolean
}

const LineChart = React.forwardRef<HTMLDivElement, LineChartProps>(
  ({ 
    className, 
    data, 
    index, 
    categories, 
    colors = defaultColors,
    valueFormatter = (value) => String(value),
    showLegend = true,
    showXAxis = true,
    showYAxis = true,
    showGrid = true,
    showTooltip = true,
    ...props 
  }, ref) => {
    return (
      <Chart ref={ref} className={className} {...props}>
        <RechartsLineChart 
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
            />
          )}
          {showXAxis && (
            <XAxis
              dataKey={index}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              padding={{ left: 10, right: 10 }}
              className="text-xs text-muted-foreground"
            />
          )}
          {showYAxis && (
            <YAxis
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={70}
              className="text-xs text-muted-foreground"
              tickFormatter={valueFormatter}
            />
          )}
          {showTooltip && (
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as Array<{ value: number | string; name: string; color: string }>}
                  label={label}
                  formatter={(value) => valueFormatter(value)}
                />
              )}
            />
          )}
          {showLegend && (
            <Legend
              content={({ payload }) => (
                <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                  {payload?.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>{entry.value}</span>
                    </div>
                  ))}
                </div>
              )}
            />
          )}
          {categories.map((category, i) => (
            <Line
              key={category}
              type="monotone"
              dataKey={category}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLineChart>
      </Chart>
    )
  }
)
LineChart.displayName = "LineChart"

// Pie Chart
interface PieChartProps extends Omit<ChartProps, "children"> {
  data: any[]
  index: string
  category: string
  colors?: string[]
  valueFormatter?: (value: number) => string
  showLegend?: boolean
  showTooltip?: boolean
  startAngle?: number
  endAngle?: number
  innerRadius?: number
  outerRadius?: number
  paddingAngle?: number
}

const PieChart = React.forwardRef<HTMLDivElement, PieChartProps>(
  ({ 
    className, 
    data, 
    index, 
    category, 
    colors = defaultColors,
    valueFormatter = (value) => String(value),
    showLegend = true,
    showTooltip = true,
    startAngle = 0,
    endAngle = 360,
    innerRadius = 0,
    outerRadius = "80%",
    paddingAngle = 0,
    ...props 
  }, ref) => {
    return (
      <Chart ref={ref} className={className} {...props}>
        <RechartsPieChart
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          {showTooltip && (
            <Tooltip
              content={({ active, payload }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as Array<{ value: number | string; name: string; color: string }>}
                  formatter={(value) => valueFormatter(value)}
                />
              )}
            />
          )}
          {showLegend && (
            <Legend
              verticalAlign="middle"
              align="right"
              layout="vertical"
              iconType="circle"
              content={({ payload }) => (
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  {payload?.map((entry: any, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>
                        {entry.value} - {entry.payload?.value ?? 0} ({Math.round((entry.payload?.percent ?? 0) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            />
          )}
          <Pie
            data={data}
            nameKey={index}
            dataKey={category}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={paddingAngle}
            startAngle={startAngle}
            endAngle={endAngle}
          >
            {data.map((entry, i) => (
              <Cell 
                key={`cell-${i}`} 
                fill={colors[i % colors.length]} 
              />
            ))}
          </Pie>
        </RechartsPieChart>
      </Chart>
    )
  }
)
PieChart.displayName = "PieChart"

export {
  Chart,
  ChartTooltip,
  BarChart,
  LineChart,
  PieChart,
}
