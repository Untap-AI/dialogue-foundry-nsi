import React from 'react'
import { Button } from '@/components/ui/button'
import { ChatExample } from './ChatExample'

export const ShadcnTest: React.FC = () => {
  return (
    <div className="p-4 space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">shadcn/ui Test</h2>
        <div className="flex gap-2">
          <Button>Default Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">🎉</Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">AI SDK Chat Example</h2>
        <ChatExample />
      </div>
    </div>
  )
}
