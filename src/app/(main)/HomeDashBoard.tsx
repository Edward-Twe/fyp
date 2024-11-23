'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const boxes = [
  { title: 'Create Organization', href: '/organizations', color: 'bg-blue-500' },
  { title: 'Schedule', href: '/schedule', color: 'bg-green-500' },
  { title: 'Tasks', href: '/tasks', color: 'bg-yellow-500' },
  { title: 'Employees', href: '/employees', color: 'bg-red-500' },
  { title: 'Products', href: '/products', color: 'bg-purple-500' },
  { title: 'Reports', href: '/reports', color: 'bg-indigo-500' },
]

export default function Dashboard() {
  return (
    <div className="min-h-screen p-8">
      {/* <h1 className="text-4xl font-bold mb-8 text-center">Organization Dashboard</h1> */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {boxes.map((box, index) => (
          <Link href={box.href} key={box.title}>
            <motion.div
              className={`${box.color} rounded-lg shadow-lg p-8 cursor-pointer overflow-hidden relative`}
              style={{ aspectRatio: '1 / 1' }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <h2 className="text-3xl font-bold text-white mb-4">{box.title}</h2>
              <p className="text-white text-opacity-80">Click to view {box.title.toLowerCase()} details</p>
              {/* Placeholder for background image */}
              <div className="absolute inset-0 bg-cover bg-center z-0 opacity-30" style={{backgroundImage: `url('/placeholder-${box.title.toLowerCase()}.jpg')`}} />
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )
}