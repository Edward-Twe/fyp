'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import createOrg from '@/assets/create-org.jpeg'
import schedule from '@/assets/schedule.jpeg'
import tasks from '@/assets/tasks.jpeg'
import employees from '@/assets/employees.jpeg'
import products from '@/assets/products.jpeg'
import reports from '@/assets/reports.jpeg'


const boxes = [
  { title: 'Create Organization', href: '/organizations', color: 'bg-blue-500', image: createOrg },
  { title: 'Schedule', href: '/schedule', color: 'bg-green-500', image: schedule },
  { title: 'Tasks', href: '/tasks', color: 'bg-yellow-500', image: tasks },
  { title: 'Employees', href: '/employees', color: 'bg-red-500', image: employees },
  { title: 'Products', href: '/products', color: 'bg-purple-500', image: products },
  { title: 'Reports', href: '/reports', color: 'bg-indigo-500', image: reports },
]

export default function Dashboard() {
  return (
    <div className="min-h-screen p-8">
      {/* <h1 className="text-4xl font-bold mb-8 text-center">Organization Dashboard</h1> */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {boxes.map((box) => (
          <Link href={box.href} key={box.title}>
            <motion.div
              className={`${box.color} rounded-lg shadow-lg p-8 cursor-pointer overflow-hidden relative`}
              style={{ aspectRatio: '1 / 1' }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <h2 className="text-3xl font-bold text-white mb-4 relative z-10">{box.title}</h2>
              <p className="text-white text-opacity-80 relative z-10">Click to view {box.title.toLowerCase()} details</p>
              {box.image && (
                <Image
                  src={box.image}
                  alt={box.title}
                  fill
                  className="object-cover opacity-30 z-0"
                />
              )}
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )
}